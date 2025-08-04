const express = require('express');

const mongoose = require('mongoose'); 
require('mongoose-schema-jsonschema')(mongoose);


const npcRouter = express.Router();
const NPC = require('../models/npc.model');
const npcEvents = require("../models/npcTimelineEvent.model");
const npcModel = require('../models/npc.model');

//make a new npc
npcRouter.post('/npc', async (req, res) => {
    console.log("Trying to save new npc")
    try {
        const npc = new NPC(req.body.npc)
        await npc.save();
    
        console.log(`NPC saved successfully`)
        res.status(201).send(npc)
    } catch (err) {
        console.log(`Error saving location`)
        res.status(500).send(`Error saving location: ${err.message}`)
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

//getting npc by slug
npcRouter.get('/single/:npcSlug', async (req, res) => {
    console.log(`Getting NPC`)

    try {
        const { npcSlug } = req.params;
        console.log(`npc slug: ${npcSlug}`)
        const npc = await NPC.findOne({
            slug: npcSlug
        })

        console.log(`npc found successfully`)
        res.status(201).send(npc)
    } catch (err) {
        console.log("Error getting specific npc")
        res.status(501).send(`Error getting an NPC: ${err}`)
    }

})

//get all events
npcRouter.get('/allEvents', async (req, res) => {
    console.log("Getting all npc events")
    
    try {
        const allEvents = await npcEvents.find()
        res.status(201).send(allEvents)
    } catch (err) {
        console.log(`Error getting all npc events`)
        res.status(500).send(`Error saving location: ${err.message}`)
    }
})

//add event to a specific npc
npcRouter.post('/event/:npcSlug', async (req, res) => {
    console.log("Adding new event to timeline")
    
    try {
        const { npcSlug } = req.params;
        console.log(`npc slug: ${npcSlug}`)
        const npc = await NPC.findOne({
            slug: npcSlug
        })

        if (!npc) return res.status(404).json({ error: 'NPC not found' })

        const { date, location, coordinates, description} = req.body.event
        const newEvent = await npcEvents.create({
            npcId: npc._id, 
            npcSlug: npc.slug,
            date, location, coordinates, description
        })

        if (!npc.events) npc.events = [];
        
        npc.events.push(newEvent._id)
        console.log(npc.events)

        await npc.save();

        console.log(`Npc Timeline saved successfully`)
        res.status(201).send(npc)
    } catch (err) {
        console.log(`Error npc timeline`)
        res.status(500).send(`Error saving location: ${err.message}`)
    }
})

//using a post function because parameter usage might get heavy
npcRouter.post('/getEventsFiltered', async (req, res) => {

    try {
        const {npcId, npcSlug, fromDate, toDate, location, coordinates, description} = req.body
        query = {}

        if (npcId) query.npcId = npcId
        if (npcSlug) query.npcSlug = npcSlug

        if (fromDate || toDate) {
            query.date = {}

            if (fromDate) query.date.$gte = new Date(fromDate)
            if (toDate) query.date.$lte = new Date(toDate) 
            console.log(query)
        }
       

        if (location) query.location = location
        if (coordinates) query.coordinates = coordinates

        if (description) query.description = { $regex: description, $options: "i"}

        console.log(query)

        const events = await npcEvents.find(query);
        res.json(events).status(200)

    } catch (err) {
        console.log(`Error finding events`)
        res.status(500).send(`Error finding events: ${err.message}`)
    }

})

//get npc schema
npcRouter.get('/schema', async (req, res) => {
    console.log('trying to get schema')

    try {
        const npcJsonSchema = npcModel.schema.jsonSchema()

        delete npcJsonSchema.properties._id;
        delete npcJsonSchema.properties.__v;
        delete npcJsonSchema.properties.createdAt;
        delete npcJsonSchema.properties.updatedAt;
        //delete npcJsonSchema.properties.events;
        // npcJsonSchema.title = 'NPC'

        console.log(npcJsonSchema);

        res.json(npcJsonSchema);
    } catch (err) {
        res.status(500).send(err)
    }
})

module.exports = npcRouter;