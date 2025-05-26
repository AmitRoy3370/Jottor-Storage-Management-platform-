const mongoose = require('mongoose');

const storageUserSchema = new mongoose.Schema({

    userName : String,
    userEmail : String,
    userPassword: String,

}, {collection : 'StorageUser'});

module.exports = mongoose.model('StorageUser', storageUserSchema, 'StorageUser');
