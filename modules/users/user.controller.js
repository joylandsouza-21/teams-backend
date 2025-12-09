const { ZodError } = require("zod");
const { createUserSchema, loginUserSchema, updateUserSchema } = require("./user.schema");
const UserService = require("./user.service");

module.exports = {
  async createUser(req, res) {
    try {
      const user = await UserService.createUser(req.body);
      return res.status(201).json(user);
    } catch (err) {
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
      return res.status(400).json({ error: err.message });
    }
  },

  async getAllUsers(req, res) {
    try {
      const result = await UserService.getAllUsers()
      return res.json(result);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  },

  async updateUser(req, res) {
    try {
      const result = await UserService.updateUser(req.user.id, req.body, req.file );
      return res.json(result);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

};
