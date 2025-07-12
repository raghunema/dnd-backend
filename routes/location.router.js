const express = require('express');
const Location = require('../models/location.model');

const locationRouter = express.Router();

locationRouter.post('/add-location', async (req, res) => {
    console.log("Trying to save new location")
    try {
        const location = new Location(req.body)
        await location.save();

        console.log(`Location saved successfully`)
        res.status(201).send(location)
    } catch (err) {
        console.log(`Error saving location`)
        res.status(500).send(`Error saving location: ${err.message}`)
    }
});

module.exports = locationRouter;
