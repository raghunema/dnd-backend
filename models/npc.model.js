const mongoose = require("mongoose");
const { Event }  = require('./event.model')

const npcSchema = new mongoose.Schema({
    slug: {
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
    description: String, 
    race: String,
    dateOfBirth: Date,
    dateOfDeath: Date,
    placeOfBirth: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Location",
        default: null
    },
    relationships: {
        type: [{
            relationshipId: {  
                type: mongoose.Schema.Types.ObjectId,
                ref: "Relationship",
                required: true
            },
            relationshipIndex: {
                type: String,
                enum: ["npcA", "npcB"],
                required: true
            }
        }],
        default: [],
        _id: false
    },
    information: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }, 
    events: {
        type: [{type: mongoose.Schema.Types.ObjectId, ref: "Event"}],
        default: []  
    }
}, 
    { timestamps: true }
)

module.exports = mongoose.model('NPC', npcSchema)