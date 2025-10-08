const express = require('express');
const mongoose = require('mongoose'); 
require('mongoose-schema-jsonschema')(mongoose);


const npcRouter = express.Router();
const NPC = require('../models/npc.model');
const Event = require('../models/event.model')
const npcEvents = require("../models/npcTimelineEvent.model");
const expansionMiddleware = require("./middleware/npcExpansion")

//npcRouter.use(expansionMiddleware)

////////////////////////
/// POST Statements ///
///////////////////////

//make a new npc
npcRouter.post('/new', async (req, res) => {
    console.log("Trying to save new npc")

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const npc = new NPC(req.body)
        console.log(npc)

        await npc.save({ session });

        if (npc.events && npc.events.length > 0) {
            await Event.updateMany(
                { _id: { $in: npc.events } }, //finds all the events in npc.events
                { $addToSet: { npcs: npc._id} }, //updates them via set addition to avoid dupes
                { session }
            )
        }

        session.commitTransaction();
        session.endSession();
    
        console.log(`NPC saved successfully`)
        res.status(201).send(npc)
    } catch (err) {
        session.abortTransaction();
        session.endSession();

        console.log(`Error saving location`)
        console.log(err.stack)
        res.status(500).send(`Error saving location: ${err.message}`)
    }
})

//update via id
npcRouter.post('/update', async (req, res) => {
    const session = await mongoose.startSession();
    await session.startTransaction();

    try {
        const npcId = req.body._id
        const npcBody = req.body
        const npcNewEvents = req.body.events || []

        const oldNpc = await NPC.findById(npcId).session(session)
        
        if (!oldNpc) {
            await session.abortTransaction();
            session.endSession();

            return res.status(404).send(`NPC with id ${npcId} not found.`);
        }

        //delete npcs from these events
        const eventsToDeleteFrom = oldNpc.events.filter(
            oldEvent => !npcNewEvents.includes(oldEvent.toString())
        );

        //update delete from events
        if (eventsToDeleteFrom.length > 0 ) {
            await Event.updateMany( 
                { _id: { $in: eventsToDeleteFrom} },
                { $pull: {npcs: npcId } },
                { session }
            )
        }
        
        //update add to events - using set so it avoids dupes
        await Event.updateMany( 
            { _id: { $in: npcNewEvents} },
            { $addToSet: {npcs: npcId } },
            { session }
        )

        const npc = await NPC.findByIdAndUpdate(npcId, npcBody, { new: true, runValidators: true, session })
        
        await session.commitTransaction();
        session.endSession();

        console.log(`Updated NPC: ${npc.name}`);
        res.status(200).send(npc)
    } catch (err) {
        await session.abortTransaction();
        session.endSession();

        console.log(`Error updating ${req.body.slug}`)
        res.status(500).send(`Error getting an NPC: ${err}`)
    }

})

//update via slug - depreceated
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


npcRouter.delete('/delete', async (req, res) => {
    const session = await mongoose.startSession();
    await session.startTransaction();

    try {
        const npcId = req.body._id
        const npcBody = req.body

        //find all events - remove the npc from that event
        await Event.updateMany(
            { _id: {$in: npcBody.events } },
            { $pull: { npcs: npcId } }, 
            { session }
        )

        const deleteResponse = await NPC.findByIdAndDelete(npcId, { session })

        if (!deleteResponse) {
            await session.abortTransaction();
            session.endSession();

            throw new Error(`NPC with id ${npcId} not found`);
        }

        await session.commitTransaction();
        session.endSession(); 

        console.log(`Updated NPC: ${npcBody.name}`);
        res.status(200).send(deleteResponse)
    } catch (err) {
        await session.abortTransaction();
        session.endSession();

        console.log(`Error Deleteing NPC`)
        console.log(err)
        res.status(500).send(`Error with Deletion: ${err}`)

    }
})

//////////////////////
/// GET Statements ///
/////////////////////


/// All npcs
/// Will handle the form functionality - it will only get the ids and slugs as well if necessary
npcRouter.get('/all', async (req, res) => {
    console.log("Getting all Npcs")
    
    try {

        const { fields, expand } = req.query;
        //console.log(fields)
        //console.log(expand)
        const projection = fields ? fields.split(',').join(' ') : '';

        let query = NPC.find({}, projection)

        if (expand) {
            expand.split(',').forEach(relation => {
                query = query.populate(relation.trim());
            })
        }

        const allNpcs = await query;
        res.status(201).send(allNpcs)
    } catch (err) {
        console.log(`Error getting all Npcs`);
        console.log(err.stack);
        res.status(500).send(`Error saving location: ${err.message}`)
    }
})

//get all npcs but just for the form
// npcRouter.get('/form', async (req, res) => {
//     console.log("Getting all Npcs")
    
//     try {
//         const allNpcs = await NPC.find(
//             {},
//             "name slug"
//         )
//         res.status(201).send(allNpcs)
//     } catch (err) {
//         console.log(`Error getting all Npcs`)
//         res.status(500).send(`Error saving location: ${err.message}`)
//     }
// })

//getting npc by id
npcRouter.get('/single/:npcId', expansionMiddleware, async (req, res) => {
    console.log(`Getting NPC`)

    try {    
        const { fields, expand, reason } = req.query;

        const projection = fields ? fields.split(',').join(' ') : '';

        let query = NPC.findById(req.params.npcId, projection)

        //console.log(req.params.npcId)

        //console.log(expand)
        //handles expand with custom fields
        if (expand) {
            expand.split(",").forEach(ex => {
                const exFields = ex.split(':')
                //console.log(exFields)

                query = query.populate({ 
                    path: exFields[0],
                    select: exFields[1].split(';').join(' ')
                });
            });
        }
        

        //console.log('HERE')

        const npc = await query;

        //console.log(npc)
        res.status(200).json(npc)
    } catch (err) {
        console.log("Error getting specific npc")
        //console.log(err.stack)
        res.status(501).send(`Error getting an NPC: ${err}`)
    }

})


npcRouter.get('/schema', async (req, res) => {
    console.log('trying to get schema')

    try {
        const npcJsonSchema = NPC.schema.jsonSchema()

        //delete npcJsonSchema.properties._id;
        delete npcJsonSchema.properties.__v;
        delete npcJsonSchema.properties.createdAt;
        delete npcJsonSchema.properties.updatedAt;
        delete npcJsonSchema.properties.placeOfBirth.description

        npcJsonSchema.properties.information.type = "object";
        //npcJsonSchema.properties.information.additionalProperties = true //save this for the future!

        //console.log(npcJsonSchema);

        res.json(npcJsonSchema);
    } catch (err) {
        res.status(500).send(err)
    }
})

module.exports = npcRouter;