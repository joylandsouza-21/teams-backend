// modules/calls/call.service.js
const { Op } = require("sequelize");
const Call = require("./call.model.pg");
const CallParticipant = require("./callParticipant.model.pg");
const ConversationService = require("../conversations/conversation.service");
const { createLivekitToken } = require("../../config/livekit");

function diffSeconds(start, end) {
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
}

module.exports = {

  async startCall({ userId, conversationId, type }) {
    // 1️⃣ Ensure user in conversation
    const isMember = await ConversationService.isMember(userId, conversationId);
    if (!isMember) throw new Error("Not allowed");

    // 2️⃣ Create room name
    const roomName = `conv-${conversationId}-${Date.now()}`;

    // 3️⃣ Create Call row
    const call = await Call.create({
      conversationId: conversationId,
      type,
      started_by: userId,
      livekit_room: roomName,
      status: "ongoing",
    });

    // 4️⃣ Add participants (all members of conversation)
    const members = await ConversationService.getConversationMembers(conversationId);
    const now = new Date();

    const participants = await CallParticipant.bulkCreate(
      members.map((m) => ({
        call_id: call.id,
        user_id: m.id,
        status: m.id === userId ? "accepted" : "ringing",
        joined_at: m.id === userId ? now : null,
        left_at: null,
      }))
    );

    // 5️⃣ Generate token for caller
    const livekitToken = createLivekitToken({
      identity: userId,
      roomName,
    });

    return {
      call,
      participants,
      roomName,
      livekitToken,
    };
  },

  /**
   * Join call via REST (when user hits "Join" and you need LiveKit token)
   */
  async joinCall({ userId, callId }) {
    const call = await Call.findByPk(callId, {
      include: [{ model: CallParticipant, as: "participants" }],
    });
    if (!call) throw new Error("Call not found");
    if (call.status !== "ongoing") throw new Error("Call not active");

    // check user is part of conversation
    const isMember = await ConversationService.isMember(userId, call.conversationId);
    if (!isMember) throw new Error("Not allowed");

    const now = new Date();

    // 1️⃣ Update participant row
    const [count] = await CallParticipant.update(
      {
        status: "accepted",
        joined_at: now,
      },
      {
        where: {
          call_id: callId,
          user_id: userId,
        },
      }
    );

    if (count === 0) {
      // if participant row missing for some reason, create
      await CallParticipant.create({
        call_id: callId,
        user_id: userId,
        status: "accepted",
        joined_at: now,
      });
    }

    // 2️⃣ Generate LiveKit token
    const livekitToken = await createLivekitToken({
      identity: userId,
      roomName: call.livekit_room,
    });

    return {
      call,
      token: livekitToken,
      roomName: call.livekit_room,
    };
  },

  /**
   * End a call. Also:
   * - compute duration
   * - mark missed participants
   * - mark participant who ended as left
   */
  async endCall({ userId, callId, reason = "normal" }) {
    const call = await Call.findByPk(callId, {
      include: [{ model: CallParticipant, as: "participants" }],
    });
    if (!call) throw new Error("Call not found");

    // only starter or conversation member can end
    const isMember = await ConversationService.isMember(userId, call.conversationId);
    if (!isMember) throw new Error("Not allowed");

    if (call.status !== "ongoing") {
      // already ended, compute missed & duration state and return
      const participants = call.participants || [];
      const missedUserIds = participants
        .filter((p) => p.status === "missed")
        .map((p) => p.user_id);
      return {
        call,
        participants,
        durationSeconds: call.duration_seconds || 0,
        missedUserIds,
      };
    }

    const now = new Date();
    const startedAt = call.started_at || now;
    const durationSeconds = diffSeconds(startedAt, now);

    // 1️⃣ Update call row
    // If no one except caller accepted => status = 'missed'
    const participants = call.participants || [];
    const acceptedOtherThanStarter = participants.some(
      (p) =>
        p.user_id !== call.started_by &&
        (p.status === "accepted" || p.joined_at != null)
    );

    const newStatus =
      reason === "cancelled"
        ? "cancelled"
        : acceptedOtherThanStarter
        ? "ended"
        : "missed";

    await call.update({
      status: newStatus,
      ended_at: now,
      duration_seconds: durationSeconds,
    });

    // 2️⃣ Update participants
    const missedUserIds = [];
    const updates = participants.map(async (p) => {
      if (p.user_id === userId) {
        // person who ended call: mark left if not already left
        if (!p.left_at) {
          await p.update({
            left_at: now,
            status: p.status === "accepted" ? "left" : p.status,
          });
        }
      } else {
        // others
        if (p.status === "ringing" && !p.joined_at) {
          missedUserIds.push(p.user_id);
          await p.update({
            status: "missed",
          });
        } else if (p.status === "accepted" && !p.left_at) {
          await p.update({
            left_at: now,
            status: "left",
          });
        }
      }
    });

    await Promise.all(updates);

    // 3️⃣ Optional: missed call system messages
    // For DM: one missed user
    // For group: generic
    // if (newStatus === "missed") {
    //   await MessageService.createSystemMessage({
    //     conversationId: call.conversationId,
    //     type: "call_missed",
    //     metadata: {
    //       callId: call.id,
    //       startedBy: call.started_by,
    //       missedUserIds,
    //     },
    //     actorId: call.started_by,
    //   });
    // } else {
    //   await MessageService.createSystemMessage({
    //     conversationId: call.conversationId,
    //     type: "call_ended",
    //     metadata: {
    //       callId: call.id,
    //       durationSeconds,
    //       status: newStatus,
    //     },
    //     actorId: userId,
    //   });
    // }

    return {
      call,
      participants: await CallParticipant.findAll({ where: { call_id: callId } }),
      durationSeconds,
      missedUserIds,
      status: newStatus,
    };
  },

  /**
   * User rejects call from popup (before joining media)
   */
  async rejectCall({ userId, callId }) {
    const call = await Call.findByPk(callId);
    if (!call) throw new Error("Call not found");
    if (call.status !== "ongoing") throw new Error("Call not active");

    const isMember = await ConversationService.isMember(userId, call.conversationId);
    if (!isMember) throw new Error("Not allowed");

    await CallParticipant.update(
      {
        status: "declined",
        left_at: new Date(),
      },
      {
        where: {
          call_id: callId,
          user_id: userId,
        },
      }
    );

    // If it's a direct call and callee declines, you may want to end call here
    return { callId, userId };
  },

  /**
   * Caller cancels call before others accept
   */
  async cancelCall({ userId, callId }) {
    const call = await Call.findByPk(callId, {
      include: [{ model: CallParticipant, as: "participants" }],
    });
    if (!call) throw new Error("Call not found");

    if (call.started_by !== userId) throw new Error("Only caller can cancel");
    if (call.status !== "ongoing") throw new Error("Call not active");

    // Reuse endCall logic with reason=cancelled
    return this.endCall({ userId, callId, reason: "cancelled" });
  },
};
