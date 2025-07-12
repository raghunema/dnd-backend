const express = require('express');

const mongoose = require('mongoose'); 
require('mongoose-schema-jsonschema')(mongoose);


const npcRouter = express.Router();
const NPC = require('../models/npc.model');
const npcEvents = require("../models/npcTimelineEvent.model");
const npcModel = require('../models/npc.model');

npcRouter.post('/newNpc', async (req, res) => {
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

npcRouter.get('/getAll', async (req, res) => {
    console.log("Getting all Npcs")
    
    try {
        const allNpcs = await NPC.find()
        res.status(201).send(allNpcs)
    } catch (err) {
        console.log(`Error getting all Npcs`)
        res.status(500).send(`Error saving location: ${err.message}`)
    }
})

npcRouter.get('/getAllEvents', async (req, res) => {
    console.log("Getting all Npcs")
    
    try {
        const allEvents = await npcEvents.find()
        res.status(201).send(allEvents)
    } catch (err) {
        console.log(`Error getting all Npcs`)
        res.status(500).send(`Error saving location: ${err.message}`)
    }
})

npcRouter.post('/addEvent/:npcSlug', async (req, res) => {
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

npcRouter.post('/schema/npc', async (req, res) => {
    try {
        const npcJsonSchema = npcModel.schema.jsonSchema()
        res.json(npcJsonSchema);
    } catch (err) {
        res.status(500).send(err)
    }
})

module.exports = npcRouter;