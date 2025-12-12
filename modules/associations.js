const User = require("./users/user.model.pg");
const Conversation = require("./conversations/conversation.model.pg");
const ConversationMember = require("./conversations/conversationMember.model.pg");
const Call = require("./calls/call.model.pg");
const CallParticipant = require("./calls/callParticipant.model.pg");

// ✅ Conversation → Members
Conversation.hasMany(ConversationMember, {
  foreignKey: "conversationId",
  as: "members"
});

ConversationMember.belongsTo(Conversation, {
  foreignKey: "conversationId"
});

// ✅ Members → Users  (THIS IS WHAT YOU NEED FOR name/email)
ConversationMember.belongsTo(User, {
  foreignKey: "userId",
  as: "user"
});

User.hasMany(ConversationMember, {
  foreignKey: "userId"
});


// associations (optional if you use them)
Call.hasMany(CallParticipant, {
  foreignKey: "call_id",
  as: "participants",
});

CallParticipant.belongsTo(Call, {
  foreignKey: "call_id",
  as: "call",
});

Call.belongsTo(Conversation, {
  foreignKey: "conversationId"
})