const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: true,
        required: true,
        lowercase: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: false
    },
    magicToken: {
        type: String,
        required: false
    },
    magicTokenExpiry: {
        type: Date, 
        require: false
    },
    privileges: {
        type: String,
        required: true
    }
}, 
    { timestamps: true }
)

module.exports = mongoose.model('user', userSchema)