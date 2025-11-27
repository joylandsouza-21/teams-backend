const router = require("express").Router();
const ConversationController = require("./conversation.controller");
const auth = require("../../middleware/auth.middleware");
const validate = require("../../middleware/validate");

const {
    createDirectConversationSchema,
    createGroupConversationSchema,
    createChannelConversationSchema,
    convertToGroupSchema,
    addMembersSchema,
    removeMemberParamsSchema,
} = require("./conversation.schema");

router.post(
    "/direct",
    auth,
    validate(createDirectConversationSchema),
    ConversationController.createOrGetDirect
);

router.post(
    "/group",
    auth,
    validate(createGroupConversationSchema),
    ConversationController.createGroup
);

router.post(
    "/channel",
    auth,
    validate(createChannelConversationSchema),
    ConversationController.createChannel
);

router.post(
    "/:conversationId/convert-to-group",
    auth,
    validate(convertToGroupSchema),
    ConversationController.convertToGroup
);

router.post(
    "/:conversationId/members",
    auth,
    validate(addMembersSchema),
    ConversationController.addMembers
);

router.delete(
    "/:conversationId/members/:userId",
    auth,
    validate(removeMemberParamsSchema, "params"),
    ConversationController.removeMember
);

module.exports = router;
