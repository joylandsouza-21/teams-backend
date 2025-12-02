const { z } = require("zod");

const createDirectConversationSchema = z.object({
    userId: z.coerce.number({
        required_error: "userId is required",
        invalid_type_error: "userId must be a number",
    })
        .int()
        .positive("userId must be a positive number"),
});

const createGroupConversationSchema = z.object({
    name: z.string()
        .max(100, "Group name too long")
        .optional()
        .or(z.literal("")),

    members: z.array(
        z.coerce.number().int().positive("Member userId must be positive")
    )
        .min(1, "At least one member is required"),
});

const createChannelConversationSchema = z.object({
    name: z.string()
        .min(1, "Channel name is required")
        .max(100, "Channel name too long"),
});

const convertToGroupSchema = z.object({
    name: z.string()
        .min(1, "Group name is required")
        .optional()
        .or(z.literal("")),

    newMembers: z.array(
        z.coerce.number().int().positive("Member userId must be positive")
    )
        .min(1, "At least one new member is required"),
});

const addMembersSchema = z.object({
    members: z.array(
        z.coerce.number().int().positive("Member userId must be positive")
    )
        .min(1, "At least one member is required"),
});

const removeMemberParamsSchema = z.object({
    conversationId: z.coerce.number().int().positive(),
    userId: z.coerce.number().int().positive(),
});

const updateConversationSchema = z.object({
    name: z.string()
        .optional()
        .refine(val => val === undefined || val.length > 0, {
            message: "Name cannot be empty"
        }),
});

module.exports = {
    createDirectConversationSchema,
    createGroupConversationSchema,
    createChannelConversationSchema,
    convertToGroupSchema,
    addMembersSchema,
    removeMemberParamsSchema,
    updateConversationSchema
};
