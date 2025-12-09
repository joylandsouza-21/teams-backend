const { z } = require("zod");

const createUserSchema = z.object({
  email: z.string().email({ message: "Invalid email format" }),
  name: z.string(),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

const loginUserSchema = z.object({
  email: z.string().email({ message: "Invalid email format" }),
  password: z.string(),
});


const updateUserSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").optional(),

  profile_pic: z
    .any()
    .refine(
      (file) =>
        file === null ||
        typeof file === "object" ||
        typeof file === "string",
      "Invalid profile picture format"
    )
    .optional(),
});



module.exports = { createUserSchema, loginUserSchema, updateUserSchema };
