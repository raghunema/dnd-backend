const express = require('express');
const Location = require('../models/location.model');
const Event = require('../models/event.model');

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

locationRouter.get('/', async (req, res) => {
    try {
        const allLocations = await Location.find()
        res.status(201).send(allLocations)
    } catch (err) {
        console.log(`Error getting all Location`)
        res.status(500).send(`Error getting all locations: ${err.message}`)
    }
})

locationRouter.get('/form', async (req, res) => {
    try {
        const allLocations = await Location.find(
            {},
            "name slug"
        )
        res.status(201).send(allLocations)
    } catch (err) {
        console.log(`Error getting all Location`)
        res.status(500).send(`Error getting all locations: ${err.message}`)
    }
})

locationRouter.get('/single/:locationSlug', async (req, res) => {
    console.log("getting location information")

    try {
        const { locationSlug } = req.params;
        console.log(`location slug: ${locationSlug}`)

        const response = {}
        const location = await Location.findOne({
            slug: locationSlug
        })

        response.info = location
        //response.locationInfo.description = location.description

        console.log(response)
        console.log(`location found successfully`)

        res.status(201).send(response)
    } catch (err) {
        console.log("Error getting location")
        res.status(501).send(`Error getting an location: ${err}`)
    }
})

locationRouter.get('/schema', async (req, res) => {
    console.log('trying to get location schema')
    
    try {
        const locationJsonSchema = Location.schema.jsonSchema()
    
        delete locationJsonSchema.properties._id;
        delete locationJsonSchema.properties.__v;
        delete locationJsonSchema.properties.updatedAt;
        delete locationJsonSchema.properties.createdAt;
    
        //console.log(locationJsonSchema);
        res.json(locationJsonSchema);

    } catch (err) {
        res.status(500).send(err)
    }
})


module.exports = locationRouter;
