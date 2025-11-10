const express = require('express');

const Location = require('../models/location.model');
const Event = require('../models/event.model');
const { validateAuth, checkPrivileges } = require("./middleware/authentication");

const mongoose = require('mongoose'); 
require('mongoose-schema-jsonschema')(mongoose);

const locationRouter = express.Router();

locationRouter.post('/new', validateAuth, checkPrivileges, async (req, res) => {
    console.log("Trying to save new location")

    try {
        //console.log(req)
        const location = new Location(req.body)
        await location.save();

        console.log(`Location saved successfully`)
        res.status(201).send(location)
    } catch (err) {
        console.log(`Error saving location`)
        res.status(500).send(`Error saving location: ${err.message}`)
    }
});

locationRouter.post('/update', validateAuth, checkPrivileges, async (req, res) => {
    const session = await mongoose.startSession();
    await session.startTransaction();

    try {

        const locId = req.body._id
        const locBody = req.body
        const locNewEvents = req.body.events || []

        const oldLoc = await Location.findById(locId).session(session)

        if (!oldLoc) {
            await session.abortTransaction();
            session.endSession();

            return res.status(404).send(`Location with id ${locId} not found.`);
        }

        //get all events that aren't included in the new event list
        const eventsToDeleteFrom = oldLoc.events.filter(
            oldEvent => !locNewEvents.includes(oldEvent.toString())
        );

        //delete the location of that event
        if (eventsToDeleteFrom.length > 0 ) {
            await Event.updateMany( 
                { _id: { $in: eventsToDeleteFrom} },
                { $set: {location: null } },
                { session }
            )
        }

        //update add to events - using set so it avoids dupes
        await Event.updateMany( 
            { _id: { $in: locBody.events} },
            { $set: { location: locId } },
            { session }
        )

        const loc = await Location.findByIdAndUpdate(locId, locBody, { new: true, runValidators: true, session })
        
        await session.commitTransaction();
        session.endSession();
        
        console.log(`Updated Location: ${loc.name}`);
        res.status(200).send(loc)

    } catch (err) {
        await session.abortTransaction();
        session.endSession();

        console.log(err)
        console.log(`Error updating ${req.body.slug}`)
        res.status(500).send(`Error updating a Location: ${err}`)
    }
})

locationRouter.delete('/delete', validateAuth, checkPrivileges, async (req, res) => {
    const session = await mongoose.startSession();
    await session.startTransaction();

    try {

        const locId = req.body._id
        const locBody = req.body

        //remove all events in that location
        await Event.updateMany( 
            { _id: { $in: locBody.events} },
            { $unset: { location: locId } },
            { session }
        )

        const deleteResponse = await Location.findByIdAndDelete(locId, { session })
        
        if (!deleteResponse) {
            await session.abortTransaction();
            session.endSession();
        
            throw new Error(`Location with id ${locIdId} not deelted`);
        }
        
        await session.commitTransaction();
        session.endSession(); 
        
        console.log(`Deleted: ${locBody.name}`);
        res.status(200).send(deleteResponse)

    } catch (err) {
        await session.abortTransaction();
        session.endSession();

        console.log(err)
        console.log(`Error delete ${req.body.slug}`)
        res.status(500).send(`Error deleting a Location: ${err}`)
    }

})

locationRouter.get('/all', async (req, res) => {
    console.log('getting all locations')

    try {

        const {fields, expand} = req.query

        const projection = fields ? fields.split(',').join(' ') : '';

        let query = Location.find({}, projection)

        if (expand) {
            expand.split(',').forEach(relation => {
                query = query.populate(relation.trim());
            });
        }

        const allLocations = await query;
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

locationRouter.get('/map/:locationSlug', async (req, res) => {
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

        //console.log(response)
        console.log(`location found successfully`)

        res.status(201).send(response)
    } catch (err) {
        console.log("Error getting location")
        res.status(501).send(`Error getting an location: ${err}`)
    }
})

locationRouter.get('/single/:locationId', async (req, res) => {
    console.log('getting single location')

    try {
        const { fields, expand } = req.query;
        const projection = fields ? fields.split(',').join(' ') : '';

        const locationId = req.params.locationId
        let query = Location.findById(locationId, projection)

        if (expand) {
            expand.split(",").forEach(ex => {
                const exFields = ex.split(':') 
                console.log(exFields)

                if (exFields.length === 1) {
                    query = query.populate(exFields[0]);
                } else {
                    query = query.populate({ 
                        path: exFields[0],
                        select: exFields[1].split(';').join(' ')
                    });
                }
            });
        }

        const location = await query;


        res.status(200).send(location)
    } catch (err) {
        console.log("Error getting location")
        res.status(501).send(`Error getting an location: ${err}`)
    }
})

locationRouter.get('/schema', async (req, res) => {
    console.log('trying to get location schema')
    
    try {
        const locationJsonSchema = Location.schema.jsonSchema()
    
        //delete locationJsonSchema.properties._id;
        delete locationJsonSchema.properties.__v;
        delete locationJsonSchema.properties.updatedAt;
        delete locationJsonSchema.properties.createdAt;
        delete locationJsonSchema.properties.parentId.description;
        delete locationJsonSchema.properties.parentPath;
        delete locationJsonSchema.properties.parentName;

        //delete locationJsonSchema.properties.information;
        locationJsonSchema.properties.information.type = "object";
    
        //console.log(locationJsonSchema);
        res.json(locationJsonSchema);

    } catch (err) {
        res.status(500).send(err)
    }
})


module.exports = locationRouter;
