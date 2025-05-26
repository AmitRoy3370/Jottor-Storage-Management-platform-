const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const UserFileStructure = require("../model/addedFile");
const userModel = require("../model/User");
const bcrypt = require("bcrypt");
const verifyPassword = require("../utilities/verifyPassword");

const FILE_TYPE_MIME_MAP = {
  images: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
  ],
  videos: ["video/mp4", "video/x-msvideo", "video/mpeg", "video/webm"],
  audios: ["audio/mp3", "mp3"],
  documents: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "pdf",
  ],
  pdf: ["application/pdf", "pdf"],
  notes : [
    "txt",
    "text/plain",
    "application/msword",
    "doc",
    "docx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ]
};

exports.addFile = async (req, res) => {
  try {
    const { userEmail, password, folderName, fileType } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ message: "No file uploaded." });

    const user = await userModel.findOne({ userEmail });
    if (!user) return res.status(404).json({ message: "User not found" });

    const passwordMatch = await bcrypt.compare(password, user.userPassword);
    if (!passwordMatch)
      return res.status(401).json({ message: "Invalid password" });

    let userStructure = await UserFileStructure.findOne({ userEmail });
    if (!userStructure) {
      userStructure = new UserFileStructure({ userEmail, folders: [] });
    }

    let folder = userStructure.folders.find((f) => f.folderName === folderName);
    if (!folder) {
      folder = { folderName, fileTypes: [] };
      userStructure.folders.push(folder);
    }

    let fileTypeSection = folder.fileTypes.find((ft) => ft.type === fileType);
    if (!fileTypeSection) {
      fileTypeSection = { type: fileType, files: [] };
      folder.fileTypes.push(fileTypeSection);
    }

    const fileData = {
      originalName: file.originalname,
      storedName: file.originalname,
      sizeInBytes: file.size,
      mimeType: file.mimetype,
      path: file.path,
      uploadDate: new Date(),
    };

    if (!isValidFileType(fileType, file.mimetype)) {
      return res.status(400).json({
        message: `Invalid fileType. The file's MIME type (${file.mimetype}) does not match declared type: ${fileType}`,
      });
    }

    fileTypeSection.files.push(fileData);

    folder.fileTypes = folder.fileTypes.map((ft) =>
      ft.type === fileType ? fileTypeSection : ft
    );
    userStructure.folders = userStructure.folders.map((f) =>
      f.folderName === folderName ? folder : f
    );

    await userStructure.save();

    res
      .status(201)
      .json({ message: "File uploaded successfully", file: fileData });
  } catch (err) {
    console.error("File upload error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
exports.searchFiles = async (req, res) => {
  try {
    const { userEmail, fileName, fileType, uploadDate } = req.query;
    const structure = await UserFileStructure.findOne({ userEmail });
    if (!structure) return res.status(404).json({ message: "User not found" });

    let results = [];
    for (const folder of structure.folders) {
      for (const ft of folder.fileTypes) {
        if (fileType && ft.type !== fileType) continue;
        for (const file of ft.files) {
          const matchesName = fileName
            ? file.originalName.includes(fileName)
            : true;
          const matchesDate = uploadDate
            ? new Date(file.uploadDate).toDateString() ===
              new Date(uploadDate).toDateString()
            : true;
          if (matchesName && matchesDate) {
            results.push({
              folderName: folder.folderName,
              type: ft.type,
              ...file,
            });
          }
        }
      }
    }

    res.status(200).json({ files: results });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getTotalStorage = async (req, res) => {
  try {
    const { userEmail } = req.query;
    const structure = await UserFileStructure.findOne({ userEmail: userEmail });
    if (!structure) return res.status(404).json({ message: "User not found" });

    let totalSize = 0;
    for (const folder of structure.folders) {
      for (const ft of folder.fileTypes) {
        for (const file of ft.files) {
          totalSize += !file.sizeInBytes ? 0 : file.sizeInBytes;
        }
      }
    }
    res.status(200).json({ totalStorageInBytes: totalSize });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.updateFileName = async (req, res) => {
  try {
    const { userEmail, folderName, oldName, newName } = req.body;
    const structure = await UserFileStructure.findOne({ userEmail });
    if (!structure) return res.status(404).json({ message: "User not found" });

    for (const folder of structure.folders) {
      if (folder.folderName === folderName) {
        for (const ft of folder.fileTypes) {
          const file = ft.files.find((f) => f.originalName === oldName);
          if (file) {
            file.originalName = newName;
            file.storedName = newName;
            await structure.save();
            return res.status(200).json({ message: "File name updated" });
          }
        }
      }
    }
    res.status(404).json({ message: "File not found" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.deleteFile = async (req, res) => {
  try {
    const { userEmail, folderName, fileName } = req.body;
    const structure = await UserFileStructure.findOne({ userEmail });
    if (!structure) return res.status(404).json({ message: "User not found" });

    for (const folder of structure.folders) {
      if (folder.folderName === folderName) {
        for (const ft of folder.fileTypes) {
          const fileIndex = ft.files.findIndex(
            (f) => f.originalName === fileName
          );
          if (fileIndex !== -1) {
            ft.files.splice(fileIndex, 1);
            await structure.save();
            return res.status(200).json({ message: "File deleted" });
          }
        }
      }
    }
    res.status(404).json({ message: "File not found" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.searchByDate = async (req, res) => {
  const { userEmail, password, date } = req.body;
  try {
    const user = await userModel.findOne({ userEmail });
    if (!user) return res.status(404).json({ message: "User not found" });
    const passwordMatch = await bcrypt.compare(password, user.userPassword);
    if (!passwordMatch)
      return res.status(401).json({ message: "Invalid password" });

    const structure = await UserFileStructure.findOne({ userEmail });
    if (!structure) return res.status(404).json({ message: "No files found" });

    const targetDate = new Date(date).toDateString();
    let result = [];

    for (const folder of structure.folders) {
      for (const type of folder.fileTypes) {
        const matchedFiles = type.files.filter(
          (f) => new Date(f.uploadDate).toDateString() === targetDate
        );
        result.push(...matchedFiles);
      }
    }

    res.json({ files: result });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.searchByFileType = async (req, res) => {
  const { userEmail, password, fileType } = req.body;
  try {
    const user = await userModel.findOne({ userEmail });
    if (!user) return res.status(404).json({ message: "User not found" });
    const passwordMatch = await bcrypt.compare(password, user.userPassword);
    if (!passwordMatch)
      return res.status(401).json({ message: "Invalid password" });

    const structure = await UserFileStructure.findOne({ userEmail });
    if (!structure) return res.status(404).json({ message: "No files found" });

    let result = [];

    for (const folder of structure.folders) {
      for (const type of folder.fileTypes) {
        if (type.type === fileType) result.push(...type.files);
      }
    }

    res.json({ files: result });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.searchByFolder = async (req, res) => {
  const { userEmail, password, folderName } = req.body;
  try {
    const user = await userModel.findOne({ userEmail });
    if (!user) return res.status(404).json({ message: "User not found" });
    const passwordMatch = await bcrypt.compare(password, user.userPassword);
    if (!passwordMatch)
      return res.status(401).json({ message: "Invalid password" });

    const structure = await UserFileStructure.findOne({ userEmail });
    if (!structure) return res.status(404).json({ message: "No files found" });

    const folder = structure.folders.find((f) => f.folderName === folderName);
    if (!folder) return res.status(404).json({ message: "Folder not found" });

    let result = [];
    for (const type of folder.fileTypes) {
      result.push(...type.files);
    }

    res.json({ files: result });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.copyFile = async (req, res) => {
  const { userEmail, password, folderName, fileType, fileName } = req.body;
  try {
    const user = await userModel.findOne({ userEmail });
    if (!user) return res.status(404).json({ message: "User not found" });
    const passwordMatch = await bcrypt.compare(password, user.userPassword);
    if (!passwordMatch)
      return res.status(401).json({ message: "Invalid password" });

    const structure = await UserFileStructure.findOne({ userEmail });
    const folder = structure.folders.find((f) => f.folderName === folderName);
    if (!folder) return res.status(404).json({ message: "Folder not found" });

    const type = folder.fileTypes.find((t) => t.type === fileType);
    if (!type) return res.status(404).json({ message: "File type not found" });

    const file = type.files.find((f) => f.originalName === fileName);
    if (!file) return res.status(404).json({ message: "File not found" });

    const copiedFile = {
      ...file,
      originalName: `${file.originalName}_copy`,
      uploadDate: new Date(),
    };
    type.files.push(copiedFile);

    await structure.save();
    res.json({ message: "File copied successfully", file: copiedFile });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.downloadFile = async (req, res) => {
  const { userEmail, password, folderName, fileType, fileName } = req.body;
  try {
    const user = await userModel.findOne({ userEmail });
    if (!user) return res.status(404).json({ message: "User not found" });
    const passwordMatch = await bcrypt.compare(password, user.userPassword);
    if (!passwordMatch)
      return res.status(401).json({ message: "Invalid password" });

    const structure = await UserFileStructure.findOne({ userEmail });
    const folder = structure.folders.find((f) => f.folderName === folderName);
    const type = folder.fileTypes.find((t) => t.type === fileType);
    const file = type.files.find((f) => f.originalName === fileName);
    if (!file) return res.status(404).json({ message: "File not found" });

    res.download(file.path, file.originalName);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.addToFavourite = async (req, res) => {
  try {
    const { userEmail, password, folderName, fileType, fileName } = req.body;

    const user = await userModel.findOne({ userEmail });
    if (!user) return res.status(404).json({ message: "User not found" });

    const passwordMatch = await bcrypt.compare(password, user.userPassword);
    if (!passwordMatch)
      return res.status(401).json({ message: "Invalid password" });

    let userStructure = await UserFileStructure.findOne({ userEmail });
    if (!userStructure)
      return res.status(404).json({ message: "User file structure not found" });

    const folder = userStructure.folders.find(
      (f) => f.folderName === folderName
    );
    if (!folder) return res.status(404).json({ message: "Folder not found" });

    const fileTypeSection = folder.fileTypes.find((ft) => ft.type === fileType);
    if (!fileTypeSection)
      return res.status(404).json({ message: "File type not found" });

    const file = fileTypeSection.files.find((f) => f.originalName === fileName);
    if (!file) return res.status(404).json({ message: "File not found" });

    if (!userStructure.favourites) {
      userStructure.favourites = [];
    }

    const alreadyFav = userStructure.favourites.some(
      (fav) =>
        fav.originalName === file.originalName &&
        fav.folderName === folderName &&
        fav.fileType === fileType
    );
    if (alreadyFav) {
      return res.status(400).json({ message: "File already in favourites" });
    }

    userStructure.favourites.push({
      originalName: file.originalName,
      storedName: file.storedName,
      sizeInBytes: file.sizeInBytes,
      mimeType: file.mimeType,
      path: file.path,
      uploadDate: file.uploadDate,
      folderName,
      fileType,
      addedToFavDate: new Date(),
    });

    console.log(userStructure.toString());

    await userStructure.save();

    res
      .status(201)
      .json({
        message: "File added to favourites",
        favourite: userStructure.favourites.slice(-1)[0],
      });
  } catch (err) {
    console.error("Add to favourite error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getFavourites = async (req, res) => {
  try {
    const { userEmail, password } = req.body;

    const user = await userModel.findOne({ userEmail });
    if (!user) return res.status(404).json({ message: "User not found" });

    const passwordMatch = await bcrypt.compare(password, user.userPassword);
    if (!passwordMatch)
      return res.status(401).json({ message: "Invalid password" });

    const userStructure = await UserFileStructure.findOne({ userEmail });
    if (
      !userStructure ||
      !userStructure.favourites ||
      userStructure.favourites.length === 0
    ) {
      return res
        .status(200)
        .json({ message: "No favourites found", favourites: [] });
    }

    res.status(200).json({ favourites: userStructure.favourites });
  } catch (err) {
    console.error("Get favourites error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.deleteFromFavourites = async (req, res) => {
  try {
    const { userEmail, password, folderName, fileType, fileName } = req.body;

    const user = await userModel.findOne({ userEmail });
    if (!user) return res.status(404).json({ message: "User not found" });

    const passwordMatch = await bcrypt.compare(password, user.userPassword);
    if (!passwordMatch)
      return res.status(401).json({ message: "Invalid password" });

    const userStructure = await UserFileStructure.findOne({ userEmail });
    if (!userStructure || !userStructure.favourites) {
      return res.status(404).json({ message: "Favourites not found" });
    }

    const originalLength = userStructure.favourites.length;

    userStructure.favourites = userStructure.favourites.filter(
      (fav) =>
        !(
          fav.originalName === fileName &&
          fav.folderName === folderName &&
          fav.fileType === fileType
        )
    );

    if (userStructure.favourites.length === originalLength) {
      return res.status(404).json({ message: "Favourite file not found" });
    }

    await userStructure.save();

    res.status(200).json({ message: "File removed from favourites" });
  } catch (err) {
    console.error("Delete from favourites error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

function isValidFileType(fileType, mimeType) {
  const allowedMimes = FILE_TYPE_MIME_MAP[fileType];
  return allowedMimes ? allowedMimes.includes(mimeType) : false;
}
