const mongoose = require("mongoose");

const npcTimelineEventSchema = new mongoose.Schema({
    npcId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'NPC',
        defualt: null
    },
    npcSlug: {
        type: String,
        defualt: null
    },
    date: Date,
    location: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    coordinates: [Number],
    description: String, 
},
    {timestamps: true}
)

module.exports = mongoose.model('npcEvents', npcTimelineEventSchema) 