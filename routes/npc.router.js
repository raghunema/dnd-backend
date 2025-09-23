const express = require('express');
const mongoose = require('mongoose'); 
require('mongoose-schema-jsonschema')(mongoose);


const npcRouter = express.Router();
const NPC = require('../models/npc.model');
const Event = require('../models/event.model')
const npcEvents = require("../models/npcTimelineEvent.model");


//make a new npc
npcRouter.post('/', async (req, res) => {
    console.log("Trying to save new npc")
    try {
        const npc = new NPC(req.body)
        console.log(npc)

        await npc.save();

        if (npc.events && npc.events.length > 0) {
            await Event.updateMany(
                { _id: { $in: npc.events } }, //finds all the events in npc.events
                { $addToSet: { npcs: npc._id} } //updates them via set addition to avoid dupes
            )
        }
    
        console.log(`NPC saved successfully`)
        res.status(201).send(npc)
    } catch (err) {
        console.log(`Error saving location`)
        res.status(500).send(`Error saving location: ${err.message}`)
    }
})

npcRouter.post('/update', async (req, res) => {

    try {
        const npcId = req.body._id
        const npcBody = req.body
        const npcNewEvents = req.body.events || []

        const oldNpc = await NPC.findById(npcId)
        
        if (!oldNpc) {
            return res.status(404).send(`NPC with id ${npcId} not found.`);
        }

        //delete npcs from these events
        const eventsToDeleteFrom = oldNpc.events.filter(
            oldEvent => !npcNewEvents.includes(oldEvent.toString())
        );

        //add npc to an event if its not in the event
        const eventsToAddTo = npcNewEvents.filter(
            newEvent => !oldNpc.events.map(e => e.toString()).includes(newEvent.toString())
        );

        //update delete from events
        if (eventsToDeleteFrom.length > 0 ) {
            await Event.updateMany( 
                { _id: { $in: eventsToDeleteFrom} },
                { $pull: {npcs: npcId } }
            )
        }

        //update add to events
        if (eventsToAddTo.length > 0 ) {
            await Event.updateMany( 
                { _id: { $in: eventsToAddTo} },
                { $addToSet: {npcs: npcId } }
            )
        }
        
        const npc = await NPC.findByIdAndUpdate(npcId, npcBody)

        console.log(`Updated NPC: ${npc.name}`);
        res.status(200).send(npc)
    } catch (err) {
        console.log(`Error updating ${req.body.slug}`)
        res.status(501).send(`Error getting an NPC: ${err}`)
    }

})


npcRouter.post('/updateNpc/:npcSlug', async (req, res) => {
    const { npcSlug } = req.params;

    try {
        const information = req.body.npc.information
        
        const npc = await NPC.findOne({
            slug: npcSlug
        })
        if (!npc) {
            return res.status(404).send(`NPC with slug ${npcSlug} not found.`);
        }

        npc.information = information

        await npc.save();

        console.log(`Updated NPC: ${npc.name}`);
        res.status(200).send(npc)
    } catch (err) {
        console.log(`Error updating ${npcSlug}`)
        res.status(501).send(`Error getting an NPC: ${err}`)
    }

})

//get all npcs
npcRouter.get('/all', async (req, res) => {
    console.log("Getting all Npcs")
    
    try {
        const allNpcs = await NPC.find()
        res.status(201).send(allNpcs)
    } catch (err) {
        console.log(`Error getting all Npcs`)
        res.status(500).send(`Error saving location: ${err.message}`)
    }
})

npcRouter.get('/form', async (req, res) => {
    console.log("Getting all Npcs")
    
    try {
        const allNpcs = await NPC.find(
            {},
            "name slug"
        )
        res.status(201).send(allNpcs)
    } catch (err) {
        console.log(`Error getting all Npcs`)
        res.status(500).send(`Error saving location: ${err.message}`)
    }
})

//getting npc by slug
npcRouter.get('/single/:npcSlug', async (req, res) => {
    console.log(`Getting NPC`)

    try {    
        const { npcSlug } = req.params;
        console.log(`npc slug: ${npcSlug}`)

        const response = {}
        const npc = await NPC.findOne({
            slug: npcSlug
        })

        response.npcInfo = npc

        if (npc.events && npc.events.length > 0) {
            const event_query = {}
            console.log(npc.events)
            event_query._id = { $in: npc.events}

            const events = await Event.find(event_query, "id slug name description")
            response.npcEvents = events
        }

        //console.log(response)
        //console.log(`npc found successfully`)
        res.status(201).send(response)
    } catch (err) {
        console.log("Error getting specific npc")
        res.status(501).send(`Error getting an NPC: ${err}`)
    }

})

npcRouter.post('/events', async (req, res) => {
     console.log(`Getting NPC for events`)

    try {
        const query = {}
        const filter = req.body

        if (filter && Array.isArray(filter) && filter.length > 0) {
            query._id = { $in: filter.map(id => mongoose.Types.ObjectId.createFromHexString(id)) };
        }

        const npcs = await NPC.find(query, "id slug name")
        console.log("Found npcs for the events")
        res.status(200).json(npcs)
    } catch (err) {
        console.log("Error getting npcs for events")
        res.status(501).send(`Error getting an events: ${err}`)
    }
})

//get all events
// npcRouter.get('/allEvents', async (req, res) => {
//     console.log("Getting all npc events")
    
//     try {
//         const allEvents = await npcEvents.find()
//         res.status(201).send(allEvents)
//     } catch (err) {
//         console.log(`Error getting all npc events`)
//         res.status(500).send(`Error saving location: ${err.message}`)
//     }
// })

//using a post function because parameter usage might get heavy
// npcRouter.post('/getEventsFiltered', async (req, res) => {
//     try {
//         const {npcId, npcSlug, fromDate, toDate, location, coordinates, description} = req.body
//         query = {}

//         if (npcId) query.npcId = npcId
//         if (npcSlug) query.npcSlug = npcSlug

//         if (fromDate || toDate) {
//             query.date = {}

//             if (fromDate) query.date.$gte = new Date(fromDate)
//             if (toDate) query.date.$lte = new Date(toDate) 
//             console.log(query)
//         }
       

//         if (location) query.location = location
//         if (coordinates) query.coordinates = coordinates

//         if (description) query.description = { $regex: description, $options: "i"}

//         console.log(query)

//         const events = await npcEvents.find(query);
//         res.json(events).status(200)

//     } catch (err) {
//         console.log(`Error finding events`)
//         res.status(500).send(`Error finding events: ${err.message}`)
//     }
// })



//get npc schema
npcRouter.get('/schema', async (req, res) => {
    console.log('trying to get schema')

    try {
        const npcJsonSchema = NPC.schema.jsonSchema()

        //delete npcJsonSchema.properties._id;
        delete npcJsonSchema.properties.__v;
        delete npcJsonSchema.properties.createdAt;
        delete npcJsonSchema.properties.updatedAt;
       
        npcJsonSchema.properties.information.type = "object";
        //npcJsonSchema.properties.information.additionalProperties = true //save this for the future!

        //console.log(npcJsonSchema);

        res.json(npcJsonSchema);
    } catch (err) {
        res.status(500).send(err)
    }
})

module.exports = npcRouter;