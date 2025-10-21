const mongoose = require("mongoose");

const relationshipSchema = mongoose.Schema({
    npcA: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "NPC",
        required: true
    }, 
    relAtoB: {
        type: String,
        required: true,
    },
    npcB: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "NPC",
        required: true
    },
    relBtoA: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true
    },
    strength: {
        type: Number,
        min: -100,
        max: 100,
        default: 0
    }
},
    { timestamps: true }
)

relationshipSchema.index(
    { npcA: 1, npcB: 1},
    { unique: true}
)

//reverse lookup
relationshipSchema.index(
    { npcB: 1 }
)

module.exports = mongoose.model('Relationship', relationshipSchema)
