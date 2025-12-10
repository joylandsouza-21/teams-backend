const User = require("./user.model.pg");
const bcrypt = require("bcrypt");
const TokenService = require("../../services/token.service");

module.exports = {

  // REGISTER USER
  async createUser(data) {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await User.create({
      email: data.email,
      name: data.name,
      password: hashedPassword,
      auth_provider: "local",
    });

    // Generate token using common service
    const token = TokenService.generateToken(user);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        profile_pic: user.profile_pic,
        auth_provider: user.auth_provider,
      },
    };
  },

  // LOGIN USER
  async loginUser({ email, password }) {
    const user = await User.findOne({ where: { email } });
    if (!user) throw new Error("User not found");

    if (user.auth_provider === "azure") {
      throw new Error("Please use Microsoft login for this account");
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) throw new Error("Invalid password");

    // Generate token using common service
    const token = TokenService.generateToken(user);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        profile_pic: user.profile_pic,
        auth_provider: user.auth_provider,
      },
    };
  },

  async getAllUsers() {
    return await User.findAll({
      attributes: ["id", "name", "email", "role", "profile_pic"],
      order: [["name", "ASC"]],
    });
  },

  async updateUser(userId, body = {}, file) {
    try {
      const { name, profile_pic, remove_photo } = body;

      const user = await User.findByPk(userId);
      if (!user) throw new Error("User not found");

      if (name !== undefined) {
        user.name = name;
      }

      if (remove_photo === "true") {
        user.profile_pic = null;
      }

      if (profile_pic === null) {
        user.profile_pic = null;
      }

      if (file) {
        user.profile_pic = `/uploads/${file.filename}`;
      }

      await user.save();

      return {
        message: "Profile updated successfully",
        user,
      };

    } catch (err) {
      throw new Error(err.message);
    }
  }



};
