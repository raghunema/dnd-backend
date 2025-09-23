const express = require('express');
const Event = require('../models/event.model');
const Location = require('../models/location.model');
const NPC = require('../models/npc.model');
const mongoose = require("mongoose");
require('mongoose-schema-jsonschema')(mongoose);

const eventRouter = express.Router();

//new event
eventRouter.post('/', async (req, res) => {
    console.log("Trying to save new event");

    try {
        const newEvent = await Event.create(req.body);

        if (newEvent.location) {
            const location = await Location.findByIdAndUpdate(
                newEvent.location,
                { $addToSet: {events: newEvent._id} }
            );
        }

        if (newEvent.npcs && newEvent.npcs.length > 0) {
            await NPC.updateMany(
            {_id: { $in: newEvent.npcs } },
            { $addToSet: {events: newEvent._id}}
            )
        }

        console.log("Event saved successfully");
        res.status(201).send(newEvent);

    } catch (err) {
        console.error("Error saving Event:", err);
        res.status(500).send(`Error saving Event: ${err.message}`);
    }
});

//update an event
eventRouter.post('/update', async (req, res) => {

    try {
        const eventId = req.body._id;
        const newEvent = req.body;
        const newEventNpcs = req.body.npcs;

        const oldEvent = await Event.findById(eventId);

        if (!oldEvent) {
            return res.status(404).send(`Event with id ${oldEvent} not found to update.`);
        }

        //npcs that have been removed from the event
        const npcsToDeleteFrom = oldEvent.npcs.filter(
            oldNpcs => !npcNewEvents.includes(oldNpcs.toString())
        );

        //npcs to add to
        const npcsToAddTo = newEvent.npcs.filter(
            newNpc => !oldEvent.npcs.includes(newNpc.toString())
        )

        if (npcsToDeleteFrom.length > 0) {
            await NPC.updateMany(
                { _id: { $in: npcsToDeleteFrom } },
                { $pull: { events: eventId } }
            )
        }

        await NPC.updateMany(
            { _id: { $in: newEvent.npcs } },
            { $addToSet: { events: eventId } }
        )

        const event = await Event.findByIdAndUpdate(eventId, newEvent)

        console.log(`Updated Event: ${event.name}`);
        res.status(200).send(event)
    } catch (err) {
        console.log(`Error updating ${req.body.slug}`)
        res.status(501).send(`Error updating event: ${err}`)
    }

})

//get a single event
eventRouter.get('/single/:eventSlug', async (req, res) => {
    try {
        const { eventSlug } = req.params;

        const event = await Event.findOne({
            slug: eventSlug
        })

        res.status(201).send(event)
    } catch (err) {
        console.log("Error getting specific event")
        res.status(501).send(`Error getting an event: ${err}`)
    }
})

//get all events
eventRouter.get('/', async (req, res) => {
    try {
        const allEvents = await Event.find()
        res.status(201).send(allEvents)
    } catch (err) {
        console.log(`Error getting all Events`)
        res.status(500).send(`Error getting all events: ${err.message}`)
    }
})

//get events of an npc
eventRouter.get('/npcEvents/:npcSlug', async (req, res) => {
    console.log("Getting events of an npc")

    try {
        const { npcSlug } = req.params;
        const events = []
        const npc = await NPC.findOne({slug: npcSlug})

        for (const eventId of npc.events) {
            console.log(eventId)
            const event = await Event.findById(eventId)
            if (event) events.push(event)
        }

        console.log("Responding to events")
        res.status(200).json(events)
    } catch (err) {
        console.error("Error finding npc events:", err);
        res.status(500).send(`Error getting events`);
    }
});

//get events of a location
eventRouter.get('/locationEvents/:locationId', async (req, res) => {
    console.log("Getting events of an location")

    try {
        const { locationId } = req.params;
        
        const events = []

        const location = await Location.findById(locationId)
        for (const eventId of location.events) {
            const event = await Event.findById(eventId)
            if (event) events.push(event)
        }

        console.log("Responding to location events")
        res.status(200).json(events)
    } catch (err) {
        console.error("Error getting location events:", err);
        res.status(500).send(`Error getting events`);
    }
});

//get events filtered
// Use POST for filters in body
eventRouter.post('/filtered', async (req, res) => {
    console.log("getting events with filter")
    const query = {};
    const filters = req.body;

    try {
        // Filter by NPCs
        if (filters.npcs && Array.isArray(filters.npcs) && filters.npcs.length > 0) {
            query.npcs = { $in: filters.npcs.map(id => mongoose.Types.ObjectId(id)) };
        }

        // Filter by location
        if (filters.location) {
            query.location = filters.location;
        }

        // Date range filter (checks if event overlaps the range)
        if (filters.fromDate || filters.toDate) {
            query.$and = [];
            if (filters.fromDate) {
                query.$and.push({ toDate: { $gte: new Date(filters.fromDate) } });
            }
            if (filters.toDate) {
                query.$and.push({ fromDate: { $lte: new Date(filters.toDate) } });
            }
        }

        if (filters._id) {
            query._id = filters._id
        }

        // Filter by slug
        if (filters.slug) {
            query.slug = filters.slug;
        }

        // Filter by name (case-insensitive)
        if (filters.name) {
            query.name = { $regex: filters.name, $options: 'i' };
        }

        const events = await Event.find(query).sort({fromDate: 1});
        res.status(200).json(events);
    } catch (err) {
        res.status(500).send(`Error fetching events: ${err.message}`);
    }
});

//add event to a npc
eventRouter.post('/:npcSlug', async (req, res) => {
    console.log("Adding new event to npc")
    
    try {
        const { npcSlug } = req.params;
        const npc = await NPC.findOne({slug: npcSlug})
        console.log(`Found npc: ${npc.npcSlug}`)

        if (!npc) return res.status(404).json({ error: 'NPC not found' })

        let event;
        //event already exists
        if (req.body.eventId) {
            event = await Event.findById(req.body.eventId);

            //add npc to event
            if(!event.npcs) event.npcs = []
            event.npcs.push(npc._id)
            await event.save()

        } else {
            const { slug, name, description, fromDate, toDate, npcs, location, information} = req.body.event
            event = await Event.create({
               slug, name, description, fromDate, toDate, npcs, location, information
            })
        }

        if (!npc.events) npc.events = [];
        
        npc.events.push(event._id)
        console.log(npc.events)
        await npc.save();

        console.log(`Event added to npc successfully`)
        res.status(201).send(npc)
    } catch (err) {
        console.log(`Error adding to npc timeline`)
        res.status(500).send(`Error saving location: ${err.message}`)
    }
})

//event schema
eventRouter.get('/schema', async (req, res) => {
    console.log('trying to get event schema')
    
    try {
        const eventJsonSchema = Event.schema.jsonSchema()
    
        //delete eventJsonSchema.properties._id;
        delete eventJsonSchema.properties.__v;
        delete eventJsonSchema.properties.updatedAt;
        delete eventJsonSchema.properties.createdAt;
    
        //console.log(eventJsonSchema);
        res.json(eventJsonSchema);

    } catch (err) {
        res.status(500).send(err)
    }
})

//get only id, slug, and name information to pre-pop form
eventRouter.get('/form', async (req, res) => {
    try {
        const allEvents = await Event.find(
           {},
           "name slug"
        )
        res.status(201).send(allEvents)
    } catch (err) {
        console.log(`Error getting all Events`)
        res.status(500).send(`Error getting all events: ${err.message}`)
    }
})

eventRouter.post('/setLocation/:eventSlug', async (req, res) => {
    try {
        const { eventSlug } = req.params;
        const { location } = req.body.event;

        const event = await Event.findOne({
            slug: eventSlug
        })

        event.location = location;
        await event.save();

        console.log(`Added location to event: ${event.name}`);
        res.status(200).send(event)
    } catch (err) {
        console.log(`Error updating event`)
        res.status(501).send(`Error getting an events: ${err}`)
    }
})

module.exports = eventRouter;