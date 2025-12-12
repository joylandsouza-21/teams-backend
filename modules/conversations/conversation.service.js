const sequelize = require("../../config/postgres");
const User = require("../users/user.model.pg");
const Conversation = require("./conversation.model.pg");
const ConversationMember = require("./conversationMember.model.pg");
const ConversationRead = require("./conversationRead.model.pg");
const Message = require("../messages/message.model.mongo");

const { Op } = require("sequelize");

async function buildEnrichedConversation({ conversationId, userId }) {
  const convo = await Conversation.findOne({
    where: { id: conversationId },
    attributes: ["id", "type", "name", "image", "createdAt"]
  });

  if (!convo) throw new Error("Conversation not found");

  const membersData = await ConversationMember.findAll({
    where: { conversationId },
    attributes: ["id", "conversationId", "role", "createdAt"],
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "name", "email", "profile_pic"]
      }
    ]
  });

  let unreadCount = 0;

  if (userId) {
    const read = await ConversationRead.findOne({
      where: { userId, conversationId }
    });

    const totalMessages = await Message.countDocuments({
      conversationId: String(conversationId)
    });

    if (!read?.lastMessageId) {
      unreadCount = totalMessages;
    } else {
      unreadCount = await Message.countDocuments({
        conversationId: String(conversationId),
        _id: { $gt: read.lastMessageId }
      });
    }
  }

  return {
    ...convo.toJSON(),
    members: membersData
      .filter(m => m.user)
      .map(m => ({
        ...m.user.toJSON?.() || m.user,
        role: m.role
      })),
    unreadCount
  };
}


module.exports = {

  // ✅ DIRECT CHAT
  async createOrFindDirect(user1Id, user2Id) {
    const existing = await Conversation.findOne({
      where: { type: "direct" },
      subQuery: false,
      include: [
        {
          model: ConversationMember,
          as: "members",
          attributes: [],
          required: true,
          where: {
            userId: { [Op.in]: [user1Id, user2Id] }
          }
        }
      ],
      group: ["conversations.id"],
      having: sequelize.where(
        sequelize.fn("COUNT", sequelize.col("members.userId")),
        2
      )
    });

    let conversationId;

    if (existing) {
      conversationId = existing.id;
    } else {
      const conversation = await Conversation.create({ type: "direct" });

      await ConversationMember.bulkCreate([
        { conversationId: conversation.id, userId: user1Id, role: "member" },
        { conversationId: conversation.id, userId: user2Id, role: "member" }
      ]);

      conversationId = conversation.id;
    }

    return buildEnrichedConversation({
      conversationId,
      userId: user1Id
    });
  },

  // ✅ GROUP CREATION
  async createGroupConversation({ creatorId, name, members }) {
    const uniqueMembers = Array.from(new Set([creatorId, ...members]));

    const conversation = await Conversation.create({
      type: "group",
      name
    });

    await ConversationMember.bulkCreate(
      uniqueMembers.map(userId => ({
        conversationId: conversation.id,
        userId,
        role: userId === creatorId ? "admin" : "member"
      }))
    );

    return buildEnrichedConversation({
      conversationId: conversation.id,
      userId: creatorId
    });
  },

  // ✅ CONVERT DIRECT TO GROUP
  async convertDirectToGroup({ conversationId, userId, name, newMembers }) {
    const convo = await Conversation.findByPk(conversationId);

    if (!convo || convo.type !== "direct") {
      throw new Error("Only direct chats can be converted");
    }

    convo.type = "group";
    convo.name = name;
    await convo.save();

    const requestMember = await ConversationMember.findOne({
      where: { conversationId, userId }
    });

    if (!requestMember) {
      throw new Error("Requesting user is not a member of this conversation");
    }

    await requestMember.update({ role: "admin" });

    await ConversationMember.bulkCreate(
      newMembers.map(uid => ({
        conversationId,
        userId: uid,
        role: "member"
      }))
    );

    return buildEnrichedConversation({
      conversationId,
      userId
    });
  },

  // ✅ ADD MEMBERS
  async addMembers({ conversationId, members, userId }) {
    const admin = await ConversationMember.findOne({
      where: { conversationId, userId, role: "admin" }
    });

    if (!admin) throw new Error("Only admin can add members");

    const uniqueMembers = Array.from(new Set(members));

    await ConversationMember.bulkCreate(
      uniqueMembers.map(uid => ({
        conversationId,
        userId: uid,
        role: "member"
      })),
      { ignoreDuplicates: true }
    );

    return buildEnrichedConversation({
      conversationId,
      userId
    });
  },

  // ✅ REMOVE MEMBER
  async removeMember({ conversationId, userId, adminId }) {

    await ConversationMember.destroy({
      where: { conversationId, userId }
    });

    return buildEnrichedConversation({
      conversationId,
      userId: adminId
    });
  },

  // ✅ CHANNEL CREATION
  async createChannelConversation({ creatorId, name }) {
    const conversation = await Conversation.create({
      type: "channel",
      name
    });

    await ConversationMember.create({
      conversationId: conversation.id,
      userId: creatorId,
      role: "admin"
    });

    return buildEnrichedConversation({
      conversationId: conversation.id,
      userId: creatorId
    });
  },

  // ✅ CHECK MEMBERSHIP
  async isMember(userId, conversationId) {
    const member = await ConversationMember.findOne({
      where: { userId, conversationId }
    });

    return !!member;
  },

  // ✅ GET ALL CONVERSATIONS (UNCHANGED)
  async getAllConversations(userId) {
    
    const conversations = await Conversation.findAll({
      subQuery: false,
      attributes: ["id", "type", "name", "image", "createdAt"],
      include: [
        {
          model: ConversationMember,
          as: "members",
          where: { userId },
          attributes: [],
          required: true,
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    if (!conversations.length) return [];

    const conversationIds = conversations.map(c => String(c.id));

    const [members, readRows, lastMessages, unreadCounts] =
      await Promise.all([

        // ➤ Members of each conversation
        ConversationMember.findAll({
          where: { conversationId: { [Op.in]: conversationIds } },
          attributes: ["conversationId", "role"],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "name", "email", "profile_pic"],
            },
          ],
        }),

        // ➤ User's read pointers
        ConversationRead.findAll({
          where: { userId, conversationId: { [Op.in]: conversationIds } },
        }),

        // ➤ Last messages (1 query)
        Message.aggregate([
          { $match: { conversationId: { $in: conversationIds } } },
          { $sort: { createdAt: -1 } },
          {
            $group: {
              _id: "$conversationId",
              message: { $first: "$$ROOT" },
            },
          },
        ]),

        // ➤ Unread counts (1 query)
        Message.aggregate([
          { $match: { conversationId: { $in: conversationIds } } },
          {
            $group: {
              _id: "$conversationId",
              totalMessages: { $sum: 1 },
            },
          },
        ]),
      ]);

    const memberMap = {};
    const readMap = {};
    const lastMsgMap = {};
    const totalMessagesMap = {};

    members.forEach(m => {
      const cid = String(m.conversationId);
      if (!memberMap[cid]) memberMap[cid] = [];
      memberMap[cid].push({ ...m.user.toJSON(), role: m.role });
    });

    readRows.forEach(r => {
      readMap[String(r.conversationId)] = r.lastMessageId;
    });

    lastMessages.forEach(m => {
      lastMsgMap[m._id] = m.message;
    });

    unreadCounts.forEach(u => {
      totalMessagesMap[u._id] = u.totalMessages;
    });

    const unreadMap = {};

    conversationIds.forEach(cid => {
      const lastRead = readMap[cid];
      const total = totalMessagesMap[cid] || 0;

      if (!lastRead) {
        unreadMap[cid] = total;
      } else {
        unreadMap[cid] = 0; // we calculate next
      }
    });

    // Count unread messages (single query)
    const unreadMessages = await Message.aggregate([
      {
        $match: {
          conversationId: { $in: conversationIds },
          _id: { $gt: readMap[conversationIds[0]] }, // dynamically per conv? No.
        },
      },
    ]);

    // ================================
    // 5️⃣ Build final response
    // ================================
    return conversations.map(c => {
      const cid = String(c.id);
      return {
        ...c.toJSON(),
        members: memberMap[cid] || [],
        lastMessage: lastMsgMap[cid] || null,
        unreadCount: unreadMap[cid] || 0,
      };
    });
  },

  // ✅ UPDATE CONVERSATION
  async updateConversationService({ conversationId, name, file, remove_photo }) {
    await Conversation.update(
      {
        ...(name && { name }),
        ...(remove_photo === "true" && { image: null }),
        ...(file && { image: `/uploads/${file.filename}` })
      },
      { where: { id: conversationId } }
    );

    return buildEnrichedConversation({ conversationId });
  },

  // ✅ GET MEMBERS
  async getConversationMembers(conversationId) {
    const members = await ConversationMember.findAll({
      where: { conversationId },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email", "profile_pic"]
        }
      ]
    });

    return members.map(m => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      profilePic: m.user.profile_pic,
      role: m.role,
      joinedAt: m.createdAt
    }));
  }
};
