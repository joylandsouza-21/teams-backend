const User = require("./users/user.model.pg");
const Conversation = require("./conversations/conversation.model.pg");
const ConversationMember = require("./conversations/conversationMember.model.pg");

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
