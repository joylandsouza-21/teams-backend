// controllers/call.controller.js
const { getIO } = require("../../socket");
const Conversation = require("../conversations/conversation.model.pg");
const PushSubscription = require("../push/pushSubscription.model.pg");
const User = require("../users/user.model.pg");
const callService = require("./call.service");
const webpush = require("web-push");

webpush.setVapidDetails(
  "mailto:your-email@example.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

module.exports = {

  async startCall(req, res) {
    try {
      const userId = req.user.id;
      const { conversationId, type } = req.body;

      const {
        call,
        livekitToken,
        roomName,
        participants
      } = await callService.startCall({
        userId,
        conversationId,
        type,
      });

      const io = getIO();

      // Fetch caller info
      const caller = await User.findByPk(userId, {
        attributes: ["id", "name", "profile_pic"],
      });

      // Fetch conversation info
      const conversation = await Conversation.findByPk(conversationId, {
        attributes: ["id", "name", "type"],
      });

      const targetUserIds = participants
        .filter((p) => p.user_id !== userId)
        .map((p) => p.user_id);


      for (const uid of targetUserIds) {

        io.to(`user:${uid}`).emit("incoming_call", {
          callId: call.id,
          conversation: {
            id: conversation.id,
            name: conversation.name,
            type: conversation.type,
          },
          type,
          fromUser: {
            id: caller.id,
            name: caller.name,
            avatar: caller.profile_pic,
          },
        });

        // Run push sending in background — don't block response
        (async () => {
          const subs = await PushSubscription.findAll({
            where: { user_id: uid },
          });

          for (const s of subs) {
            try {
              await webpush.sendNotification(
                s.subscription_json,
                JSON.stringify({
                  type: "incoming_call",
                  callId: call.id,
                  callType: type,
                  conversation: {
                    id: conversation.id,
                    name: conversation.name,
                    type: conversation.type
                  },
                  fromUser: {
                    id: caller.id,
                    name: caller.name,
                    avatar: caller.profile_pic,
                  },
                })
              );

            } catch (err) {
              console.error(
                `❌ Push failed for user ${uid} — Status: ${err.statusCode}`
              );

              // -------------------------
              // 🔥 DELETE EXPIRED SUBSCRIPTIONS
              // -------------------------
              if (err.statusCode === 410 || err.statusCode === 404) {
                console.log("🗑 Removing expired push subscription:", s.id);
                await PushSubscription.destroy({ where: { id: s.id } });
              }
            }
          }
        })(); // background async IIFE
      }

      return res.status(201).json({
        success: true,
        callId: call.id,
        token: livekitToken,
        roomName,
      });

    } catch (err) {
      console.error("startCall error:", err);
      return res.status(400).json({ error: err.message });
    }
  },

  // ✅ JOIN CALL (GET LIVEKIT TOKEN)
  async joinCall(req, res) {
    try {
      const userId = req.user.id;
      const { callId } = req.body;

      const { call, token, roomName } = await callService.joinCall({
        userId,
        callId,
      });

      const io = getIO();

      // Notify others that user joined
      io.to(`call:${callId}`).emit("call_joined", {
        callId,
        userId,
      });

      return res.json({
        success: true,
        callId: call.id,
        token,
        roomName,
      });
    } catch (err) {
      console.error("joinCall error:", err);
      return res.status(400).json({ error: err.message });
    }
  },

  // ✅ END CALL (STORES DURATION + MISSED USERS)
  async endCall(req, res) {
    try {
      const userId = req.user.id;
      const { callId } = req.body;

      const { call, participants, durationSeconds, missedUserIds, status } =
        await callService.endCall({
          userId,
          callId,
        });

      const io = getIO();

      // broadcast call end to everyone in call room
      io.to(`call:${callId}`).emit("call_ended", {
        callId,
        durationSeconds,
        status,
      });

      // emit missed call notifications
      missedUserIds.forEach((uid) => {
        io.to(`user:${uid}`).emit("missed_call", {
          callId,
          conversationId: call.conversationId,
          from: call.started_by,
        });
      });

      return res.json({
        success: true,
        callId,
        durationSeconds,
        status,
        missedUserIds,
      });
    } catch (err) {
      console.error("endCall error:", err);
      return res.status(400).json({ error: err.message });
    }
  },

  // ✅ REJECT CALL
  async rejectCall(req, res) {
    try {
      const userId = req.user.id;
      const { callId } = req.body;

      await callService.rejectCall({ userId, callId });

      const io = getIO();
      io.to(`call:${callId}`).emit("call_rejected", {
        callId,
        userId,
      });

      return res.json({
        success: true,
        message: "Call rejected",
      });
    } catch (err) {
      console.error("rejectCall error:", err);
      return res.status(400).json({ error: err.message });
    }
  },

  // ✅ CANCEL CALL (CALLER ONLY)
  async cancelCall(req, res) {
    try {
      const userId = req.user.id;
      const { callId } = req.body;

      const { call, durationSeconds, missedUserIds, status } =
        await callService.cancelCall({
          userId,
          callId,
        });

      const io = getIO();

      io.to(`call:${callId}`).emit("call_cancelled", {
        callId,
        durationSeconds,
        status,
      });

      missedUserIds.forEach((uid) => {
        io.to(`user:${uid}`).emit("missed_call", {
          callId,
          conversationId: call.conversationId,
          from: call.started_by,
        });
      });

      return res.json({
        success: true,
        callId,
        status,
        durationSeconds,
        missedUserIds,
      });
    } catch (err) {
      console.error("cancelCall error:", err);
      return res.status(400).json({ error: err.message });
    }
  },
};
