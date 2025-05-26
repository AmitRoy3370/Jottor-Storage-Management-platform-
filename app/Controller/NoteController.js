const Note = require('../model/Note');
const UserFileStructure = require('../model/addedFile');
const User = require('../model/User');
const bcrypt = require('bcrypt');

exports.createNote = async (req, res) => {
  try {
    const { userEmail, password, folderName, writtenNote, noteName } = req.body;

    const user = await User.findOne({ userEmail });
    if (!user) return res.status(404).json({ message: "User not found" });

    const match = await bcrypt.compare(password, user.userPassword);
    if (!match) return res.status(401).json({ message: "Invalid password" });

    const structure = await UserFileStructure.findOne({ userEmail });
    if (!structure) return res.status(404).json({ message: "User structure not found" });

    const existing = await Note.findOne({ userEmail : userEmail, noteName : noteName });
    if (existing) return res.status(409).json({ message: "Note name already exists" });

    const note = new Note({ userEmail, folderName, writtenNote, noteName });
    await note.save();

    res.status(201).json({ message: "Note saved", note });
  } catch (err) {
    console.error("Create Note Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getNotes = async (req, res) => {
  try {
    const { userEmail, folderName } = req.query;
    const query = { userEmail };
    if (folderName) query.folderName = folderName;

    const notes = await Note.find(query);
    res.status(200).json(notes);
  } catch (err) {
    console.error("Get Notes Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.updateNote = async (req, res) => {
  try {
    const { userEmail, password, noteName, newWrittenNote } = req.body;

    const user = await User.findOne({ userEmail : userEmail });
    if (!user) return res.status(404).json({ message: "User not found" });

    const match = await bcrypt.compare(password, user.userPassword);
    if (!match) return res.status(401).json({ message: "Invalid password" });

    const note = await Note.findOne({ userEmal : userEmail, noteName : noteName });
    if (!note) return res.status(404).json({ message: "Note not found" });

    note.writtenNote = newWrittenNote;
    await note.save();

    res.status(200).json({ message: "Note updated", note });
  } catch (err) {
    console.error("Update Note Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.deleteNote = async (req, res) => {
  try {
    const { userEmail, password, noteName } = req.body;

    const user = await User.findOne({ userEmail : userEmail });
    if (!user) return res.status(404).json({ message: "User not found" });

    const match = await bcrypt.compare(password, user.userPassword);
    if (!match) return res.status(401).json({ message: "Invalid password" });

    const note = await Note.findOneAndDelete({ userEmail, noteName });
    if (!note) return res.status(404).json({ message: "Note not found" });

    res.status(200).json({ message: "Note deleted" });
  } catch (err) {
    console.error("Delete Note Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
