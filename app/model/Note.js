const mongoose = require('mongoose');

const storageNoteSchema = new mongoose.Schema({

    userEmail : String,
    folderName : String,
    writtenNote : String,
    noteName : String,
   
}, {collection : 'WrittenNotes'});

module.exports = mongoose.model('WrittenNotes', storageNoteSchema, 'WrittenNotes');
