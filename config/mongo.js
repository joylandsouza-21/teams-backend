const mongoose = require("mongoose");

module.exports = async function connectMongo() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✓ MongoDB Connected");
  } catch (err) {
    console.error("Mongo Error:", err);
    process.exit(1);
  }
};
