const express = require('express');
const mongoose = require('mongoose');
const app = express();

app.use(express.json());

const url = 'mongodb+srv://jottor:sc2fqv@cluster0.v9fh0pp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

mongoose.set('strictQuery', true);

mongoose.connect(url)
    .then(()=>{console.log('Connected with mongodb database')})
    .catch(error=>{console.log('Database is not connected due to this error ', error.message)});

const port = process.env.PORT || 5000;

const userController = require('./controller/userAuthenticationController');
const fileController = require("./controller/FileController");
const multer = require("./middleware/uploadMiddleware");
const noteController = require('./controller/NoteController');

app.post("/user/signUp", userController.addUser);
app.post("user/googleSignin", userController.googleSignIn);
app.post("/user/sendOTP", userController.verifyEmail);
app.post("/user/verifyOtp", userController.verifyOtp);
app.put("/user/updateUsername", userController.updateUserName);
app.put("/user/updatePassword", userController.updatePassword); 
app.delete("/user/deleteUser", userController.deleteUser);
app.post("/user/signin", userController.signIn);
app.get("/user/:userEmail", userController.getUser);

app.post("/storedFile/addfile", multer.single("file"), fileController.addFile);
app.get("/storedFile/search", fileController.searchFiles);
app.get("/storedFile/storage", fileController.getTotalStorage);
app.put("/storedFile/update-file-name", fileController.updateFileName);
app.delete("/storedFile/delete-file", fileController.deleteFile);
app.post("/storedFile/search-by-date", fileController.searchByDate);
app.post("/storedFile/search-by-type", fileController.searchByFileType);
app.post("/storedFile/search-by-folder", fileController.searchByFolder);
app.post("/storedFile/downloadFile", fileController.downloadFile);
app.post("/storedFile/copyFile", fileController.copyFile);
app.post("/storedFile/shareFile", fileController.downloadFile);
app.post("/storedFile/addFavouriteFile", fileController.addToFavourite);
app.post("/storedFile/showFavouriteFiles", fileController.getFavourites);
app.post("/storedFile/removewFavouriteFile", fileController.deleteFromFavourites);

app.post('/storedFile/writtenNote/notes', noteController.createNote);
app.get('/storedFile/writtenNote/notes', noteController.getNotes);
app.put('/storedFile/writtenNote/notes', noteController.updateNote);
app.delete('/storedFile/writtenNote/notes', noteController.deleteNote);

app.listen(port, ()=>{

    console.log('Server is running on port ', port);

});
