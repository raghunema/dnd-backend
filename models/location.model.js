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
        default: null,
        required: false
    },
    parentName: String,
    parentPath: [{type: mongoose.Schema.Types.ObjectId}],
    children: {
        type: [{type: mongoose.Schema.Types.ObjectId}],
        ref: 'Location'
    },
    events:{
        type: [{type: mongoose.Schema.Types.ObjectId}],
        ref: 'Event'
    },
    information: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, 
    { timestamps: true }
)

module.exports = mongoose.model('Location', locationSchema) 