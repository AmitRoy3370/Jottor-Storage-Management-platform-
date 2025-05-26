const multer = require("multer");
const path = require("path");

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    // Use original file name
    const originalName = file.originalname;
    cb(null, originalName);
  }
});

const upload = multer({ storage: storage });

module.exports = upload;
