const bcrypt = require("bcrypt");
const User = require("../model/User");

async function verifyPassword(userEmail, password) {
  const user = await User.findOne({ userEmail });
  if (!user) return false;
  return await bcrypt.compare(password, user.userPassword);
}

module.exports = verifyPassword;
