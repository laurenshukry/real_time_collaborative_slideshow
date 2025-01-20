const mongoose = require('mongoose');


const pictureSchema = new mongoose.Schema({
    id: String,
    filename: String,
    path: String
});


module.exports = mongoose.model('Picture', pictureSchema);
