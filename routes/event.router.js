const express = require('express');
const Event = require('../models/event.model');
const Location = require('../models/location.model');
const NPC = require('../models/npc.model');
const mongoose = require("mongoose");

const eventRouter = express.Router();

function relateEventNPC (event, npc) {
    
    event.npcs.push(npc._id)
    npc.events.push(event._id)

    return { event, npc }
}

//new event
eventRouter.post('/', async (req, res) => {
    console.log("Trying to save new event");

    try {
        const newEvent = await Event.create(req.body.event);

        if (newEvent.location) {
            const location = await Location.findById(newEvent.location);

            if (location) {
                if (!location.events) location.events = [];

                if (!location.events.includes(newEvent._id)) {
                    location.events.push(newEvent._id);
                    await location.save();
                }
            }
        }

        if (newEvent.npcs && Array.isArray(newEvent.npcs)) {
            for (const npcId of newEvent.npcs) {
                const npc = await NPC.findById(npcId);

                if (npc) {
                    if (!npc.events) npc.events = [];

                    if (!npc.events.includes(newEvent._id)) {
                        npc.events.push(newEvent._id);
                        await npc.save();
                    } 
                }
            }
        }

        console.log("Event saved successfully");
        res.status(201).send(newEvent);

    } catch (err) {
        console.error("Error saving Event:", err);
        res.status(500).send(`Error saving Event: ${err.message}`);
    }
});

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



module.exports = eventRouter;