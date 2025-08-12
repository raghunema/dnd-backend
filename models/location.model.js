const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema({
    slug: String,
    name: String,
    description: String, 
    type: String,
    fromDate: Date,
    toDate: Date,
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Location',
        default: null
    },
    parentName: String,
    parentPath: [{type: mongoose.Schema.Types.ObjectId}],
    children: [{type: mongoose.Schema.Types.ObjectId}],
    events: [{type: mongoose.Schema.Types.ObjectId}],
    information: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, 
    { timestamps: true }
)

module.exports = mongoose.model('Location', locationSchema) 