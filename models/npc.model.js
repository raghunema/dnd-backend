const { default: mongoose } = require("mongoose");

const locationShema = new mongoose.Schema({
    locationDate: Date,
    locationId: String,
    locationName: String,
    locationDescription: String, 
    locationType: String,
    locationParents: [String]
})

mongoose.exports = mongoose.model('Location', locationSchema) 