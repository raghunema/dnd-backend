const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
    slug: {
        type: String,
        unique: true,
        required: true,
        lowercase: true,
        trime: true
    },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: false,
        default: ""
    }, 
    fromDate: {
        type: Date,
        default: '12/31/999',
    },
    toDate: {
        type: Date,
        default: '12/31/999',
    },
    npcs: {
        type: [{type: mongoose.Schema.Types.ObjectId}],
        ref: 'NPC',
        default: []
    },
    location: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Location',
        default: null
    },
    information: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, 
    { timestamps: true }
)

module.exports = mongoose.model('Event', eventSchema) 