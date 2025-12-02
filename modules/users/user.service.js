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
        auth_provider: user.auth_provider,
      },
    };
  },

  async getAllUsers() {
    return await User.findAll({
      attributes: ["id", "name", "email", "role", "profile_pic"],
      order: [["name", "ASC"]],
    });
  }

};
