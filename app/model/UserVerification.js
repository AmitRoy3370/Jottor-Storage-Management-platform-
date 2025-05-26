const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userName: String,
  userEmail: String,
  isVerified: { type: Boolean, default: false },
  otpCode: String,
  otpExpiresAt: Date
}, {collection : 'VerifiedUser'});

module.exports = mongoose.model('VerifiedUser', userSchema, 'VerifiedUser');
