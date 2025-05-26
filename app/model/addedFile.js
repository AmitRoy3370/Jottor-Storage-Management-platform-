const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
  originalName: String,
  storedName: String,
  sizeInBytes: Number,
  mimeType: String,
  path: String,
  uploadDate: Date,
});

const fileTypeSchema = new mongoose.Schema({
  type: String,
  files: [fileSchema],
});

const folderSchema = new mongoose.Schema({
  folderName: String,
  fileTypes: [fileTypeSchema],
});

const favouriteSchema = new mongoose.Schema({
  originalName: String,
  storedName: String,
  sizeInBytes: Number,
  mimeType: String,
  path: String,
  uploadDate: Date,
  folderName: String,
  fileType: String,
  addedToFavDate: Date,
});

const userFileStructureSchema = new mongoose.Schema({
  userEmail: String,
  folders: [folderSchema],
  favourites: [favouriteSchema], // ✅ Make sure this line exists
});

module.exports = mongoose.model("UserFileStructure", userFileStructureSchema);
