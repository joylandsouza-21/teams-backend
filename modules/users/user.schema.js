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

module.exports = { createUserSchema, loginUserSchema };
