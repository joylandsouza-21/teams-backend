const { ZodError } = require("zod");
const { createUserSchema, loginUserSchema } = require("./user.schema");
const UserService = require("./user.service");

module.exports = {
  async createUser(req, res) {
    try {
      const user = await UserService.createUser(req.body);
      return res.status(201).json(user);
    } catch (err) {
      // Zod validation error
      if (err instanceof ZodError) {
        const flat = err.flatten();

        return res.status(400).json({
          errors: flat.fieldErrors
        });
      }

      return res.status(400).json({ error: err.message });
    }
  },

  async loginUser(req, res) {
    try {
      const result = await UserService.loginUser(req.body)
      return res.json({
        message: "Login successful",
        ...result
      });

    } catch (err) {
      // Zod validation error
      if (err.errors) {
        return res.status(400).json({ error: err.errors });
      }

      return res.status(400).json({ error: err.message });
    }
  }
};
