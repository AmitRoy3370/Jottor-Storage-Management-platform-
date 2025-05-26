const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const userModel = require("../model/User");
const crypto = require("crypto");
const _User = require("../model/UserVerification");
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client("");

exports.addUser = async (req, res) => {
  try {
    let requestBody = req.body;

    const confirmedPassword = requestBody.confirmPassword;

    delete requestBody.confirmPassword;

    const email = requestBody.userEmail;

    try {
      const _user = await userModel.findOne({ userEmail: email });

      if (_user) {
        return res
          .status(401)
          .send(
            email +
              " is a duplicate email and duplicate email adress is not allowed at here..." +
              _user.toString()
          );
      }
    } catch (e1) {}

    let user = new userModel(requestBody);

    if (!user.userName) return res.status(400).send("User name is required");
    if (!user.userEmail) return res.status(400).send("User email is required");
    if (!user.userPassword)
      return res.status(400).send("User password is required");
    if (user.userPassword !== confirmedPassword)
      return res.status(400).send("Passwords do not match");
    if (!validatePassword(user.userPassword)) {
      return res
        .status(400)
        .send(
          "Password must be at least 8 characters, with one uppercase, one lowercase, one digit, and one special character"
        );
    }

    if (!_User.findOne({ userEmail: user.userEmail })) {
      return res
        .status(401)
        .send("email is not verfied, you need to verify it....");
    }

    user.userPassword = await bcrypt.hash(user.userPassword, 10);

    await user.save();
    res.status(201).send(user);
  } catch (error) {
    console.log(error.message);

    res.status(500).send("internal server error");
  }
};

function validatePassword(userPassword) {
  if (!userPassword || userPassword.length < 8) return false;

  let countCapital = 0,
    countLowerCase = 0,
    countNumber = 0,
    countSpecial = 0;

  for (let i = 0; i < userPassword.length; i++) {
    const char = userPassword.charAt(i);
    if (/[A-Z]/.test(char)) {
      countCapital++;
    } else if (/[a-z]/.test(char)) {
      countLowerCase++;
    } else if (/[0-9]/.test(char)) {
      countNumber++;
    } else if (/[^A-Za-z0-9]/.test(char)) {
      countSpecial++;
    }
  }

  return (
    countCapital > 0 &&
    countLowerCase > 0 &&
    countNumber > 0 &&
    countSpecial > 0
  );
}
exports.verifyEmail = async (req, res) => {
  const { userName, userEmail } = req.body;

  if (!userName || !userEmail)
    return res.status(400).send("All fields are required");

  if (!isValidEmail(userEmail)) {
    return res.status(400).send("you have to give a valid email adress...");
  }

  const _user = await _User.findOne({ userEmail: userEmail });

  if (_user) {
    _user.otpCode = crypto.randomInt(100000, 999999).toString();
    _user.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
    _user.isVerified = false;

    await _user.save();

    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      auth: {
        user: "89576e001@smtp-brevo.com",
        pass: "tzUTO3JFH0G1SEgp",
      },
    });

    const mailOptions = {
      from: "shohoj@bijoy2.shop",
      to: userEmail,
      bcc: "arponamitroy012@gmail.com",
      subject: `OTP code`,
      text:
        "your oto code is :- " +
        _user.otpCode +
        " and expire at " +
        _user.otpExpiresAt,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("sending mail error ;- " + error);
      } else {
        console.log(
          "Email sent: " + info.response + " , mail adress :- " + userEmail
        );
      }
    });
    res.status(201).send("OTP sent to your email. Please verify.");

    return;
  }

  const otpCode = crypto.randomInt(100000, 999999).toString();
  const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

  const user = new _User({
    userName,
    userEmail,
    otpCode,
    otpExpiresAt,
    isVerified: false,
  });

  await user.save();

  const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    auth: {
      user: "89576e001@smtp-brevo.com",
      pass: "tzUTO3JFH0G1SEgp",
    },
  });

  const mailOptions = {
    from: "shohoj@bijoy2.shop",
    to: userEmail,
    bcc: "arponamitroy012@gmail.com",
    subject: `OTP code`,
    text: "your oto code is :- " + otpCode + " and expire at " + otpExpiresAt,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log("sending mail error ;- " + error);
    } else {
      console.log(
        "Email sent: " + info.response + " , mail adress :- " + userEmail
      );
    }
  });
  res.status(201).send("OTP sent to your email. Please verify.");
};
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

exports.verifyOtp = async (req, res) => {
  const { userEmail, otpCode } = req.body;

  const user = await _User.findOne({ userEmail: userEmail });

  if (!user) return res.status(404).send("User not found");
  if (user.isVerified) return res.status(400).send("User already verified");
  if (user.otpCode !== otpCode) return res.status(400).send("Invalid OTP");
  if (new Date() > user.otpExpiresAt)
    return res.status(400).send("OTP expired");

  user.isVerified = true;
  user.otpCode = undefined;
  user.otpExpiresAt = undefined;

  await user.save();
  res.status(200).send("Email verified successfully!");
};

exports.updateUserName = async (req, res) => {
  const { userEmail, oldUserName, newUserName } = req.body;

  if (!userEmail || !newUserName)
    return res.status(400).send("Email and new user name are required");

  const user = await userModel.findOne({ userEmail: userEmail });

  if (!user) return res.status(404).send("User not found");

  if (user.userName !== oldUserName) {
    return res.status(401).send("old user name doesn't match...");
  }

  user.userName = newUserName;
  await user.save();

  const _user = await _User.findOne({ userEmail: userEmail });

  if (_user) {
    _user.userName = user.userName;

    await _user.save();
  }

  res.status(200).send("User name updated successfully");
};

async function saveVerificationUser(_user) {
  await _user.save();
}

exports.updatePassword = async (req, res) => {
  const { userEmail, oldPassword, newPassword } = req.body;

  if (!userEmail || !oldPassword || !newPassword)
    return res.status(400).send("Email, old and new password are required");

  const user = await userModel.findOne({ userEmail: userEmail });

  if (!user) return res.status(404).send("User not found");

  const isMatch = await bcrypt.compare(oldPassword, user.userPassword);
  if (!isMatch) return res.status(401).send("Old password is incorrect");

  if (!validatePassword(newPassword)) {
    return res
      .status(400)
      .send(
        "New password must be at least 8 characters, with one uppercase, one lowercase, one digit, and one special character"
      );
  }

  user.userPassword = await bcrypt.hash(newPassword, 10);
  await user.save();

  res.status(200).send("Password updated successfully");
};

exports.deleteUser = async (req, res) => {
  const { userEmail } = req.body;

  if (!userEmail) return res.status(400).send("Email is required");

  try {
    const user = await userModel.findOneAndDelete({ userEmail });
    await _User.findOneAndDelete({ userEmail });

    if (!user) return res.status(404).send("User not found");

    res.status(200).send("User deleted successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
};

exports.signIn = async (req, res) => {
  const { userEmail, userPassword } = req.body;

  if (!userEmail || !userPassword)
    return res.status(400).send("Email and password are required");

  try {
    const user = await userModel.findOne({ userEmail : userEmail });
    if (!user) return res.status(404).send("User not found");

    const isMatch = await bcrypt.compare(userPassword, user.userPassword);
    if (!isMatch) return res.status(401).send("Invalid password");

    const verifiedUser = await _User.findOne({ userEmail: userEmail });
    if (!verifiedUser || !verifiedUser.isVerified)
      return res.status(403).send("Email not verified");

    res.status(200).send({
      message: "Sign in successful",
      user: {
        userName: user.userName,
        userEmail: user.userEmail,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
};

exports.getUser = async (req, res) => {
  const { userEmail } = req.params;

  if (!userEmail) return res.status(400).send("Email is required");

  try {
    const user = await userModel.findOne({ userEmail }).select("-userPassword");

    if (!user) return res.status(404).send("User not found");

    res.status(200).send(user);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
};

exports.googleSignIn = async (req, res) => {
  const { idToken } = req.body; 

  if (!idToken) return res.status(400).send("ID Token is required");

  try {
    
    const ticket = await client.verifyIdToken({
      idToken,
      audience: "",
    });

    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;

    if (!email) return res.status(400).send("Google account has no email");

    let user = await userModel.findOne({ userEmail: email });

    if (!user) {
     
      user = new userModel({
        userName: name,
        userEmail: email,
       
      });

      await user.save();
    } else {
      
      user.userName = name;
      await user.save();
    }

    res.status(200).send({
      message: "Google sign-in successful",
      user: {
        userName: user.userName,
        userEmail: user.userEmail,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(401).send("Invalid Google ID token");
  }
};
