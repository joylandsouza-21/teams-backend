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
    updateConversationSchema,
} = require("./conversation.schema");
const upload = require("../../middleware/upload");

router.get(
    "/",
    auth,
    ConversationController.getAllConversations
)

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

router.post(
    "/:conversationId/update",
    auth,
    // validate(updateConversationSchema),
    upload.single("image"),
    ConversationController.updateConversation
);

module.exports = router;
