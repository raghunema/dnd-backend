const express = require('express');
const mongoose = require('mongoose'); 
require('mongoose-schema-jsonschema')(mongoose);


const npcRouter = express.Router();
const NPC = require('../models/npc.model');
const Event = require('../models/event.model')
const npcEvents = require("../models/npcTimelineEvent.model");
const Relationship = require('../models/relationship.model');
const expansionMiddleware = require("./middleware/npcExpansion")
const { createRelationship, deleteRelationship } = require("./middleware/relationship");
const relationshipModel = require('../models/relationship.model');

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
        const npcNewRelationships = req.body.relationships || []

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
        
        //upsert relationships
        for (const relation of npcNewRelationships) {
            const updatedRelation = await createRelationship (
                {
                    npcX: relation.relationshipId.npcA,
                    relXtoY: relation.relationshipId.relAtoB,
                    npcY: relation.relationshipId.npcB,
                    relYtoX: relation.relationshipId.relBtoA,
                    description: relation.relationshipId.description,
                    strength: relation.relationshipId.strength
                }, session);

            if (!updatedRelation) throw new Error("error updating a relationship")
        }

        //delete relationships
        const relsToDelete = oldNpc.relationships
            .filter(oldRel => 
                !npcNewRelationships.some(newRel => 
                    newRel.relationshipId._id.toString() === oldRel.relationshipId.toString()
                )
            )
            .map(rel => rel.relationshipId)
        
        console.log("relations to delete:")
        console.log(relsToDelete)
        for (const relation of relsToDelete) {
            const deletedRelation = await deleteRelationship(
                relation,
                session
            )
            if (!deletedRelation) throw new Error("error deleting a relationship")
        }

        const {relationships, ...npcUpdatedData} = npcBody //remove the relationship information since it is in the wrong format - handled in the create relaitonships
        const npc = await NPC.findByIdAndUpdate(npcId, npcUpdatedData, { new: true, runValidators: true, session })
        
        await session.commitTransaction();
        session.endSession();

        console.log(`Updated NPC: ${npc.name}`);
        res.status(200).send(npc)
    } catch (err) {
        await session.abortTransaction();
        session.endSession();

        console.log(err)
        console.log(`Error updating ${req.body.slug}`)
        res.status(500).send(`Error getting an NPC: ${err}`)
    } finally {
        session.endSession();
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

npcRouter.post('/relationship', async (req, res) => {
    console.log('creating new relationship')

    try {
        const newRel = await createRelationship({
            npcX: req.body.npcA,
            relXtoY: req.body.relAtoB,
            npcY: req.body.npcB,
            relYtoX: req.body.relBtoA,
            description: req.body.description,
            strength: req.body.strength
        })

        res.status(201).json(newRel)
    } catch (err) {
        console.log(err)
        res.status(500).json({error: err.message})
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

//getting npc by id
npcRouter.get('/single/:npcId', expansionMiddleware, async (req, res) => {
    console.log(`Getting NPC`)

    try {    
        const { fields, expand, reason } = req.query;
0
        const projection = fields ? fields.split(',').join(' ') : '';

        let query = NPC.findById(req.params.npcId, projection)

        //console.log(req.params.npcId)

        //console.log(expand)
        //handles expand with custom fields
        if (expand) {
            expand.split(",").forEach(ex => {
                const exFields = ex.split(':')
                console.log(exFields)

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
        npcJsonSchema.properties.relationships.items.properties.relationshipId.type = "object";
        npcJsonSchema.properties.relationships.items.required = ["relationshipId"]
        //npcJsonSchema.properties.information.additionalProperties = true //save this for the future!

        //console.log(npcJsonSchema);

        res.json(npcJsonSchema);
    } catch (err) {
        res.status(500).send(err)
    }
})

npcRouter.get('/relationships', async (req, res) => {
    try {
        // await the query so we return the actual documents (not a Query object)
        //const relationships = await Relationship.find().populate('npcA npcB').lean();
        const relationships = await Relationship.find().lean();
        res.status(200).json(relationships);
    } catch (err) {
        console.error('Error fetching relationships:', err);
        res.status(500).json({ error: err.message });
    }
})

npcRouter.get('/relationship/:npcId', async (req, res) => {

    let query = NPC.findById(req.params.npcId)


    query.populate({
        path: "relationships.relationshipId"
    })

    const npc = await query;

    // const npc = await NPC.findById(req.params.npcId).lean();

    // console.log(JSON.stringify(npc.relationships, null, 2))

    res.status(200).json(npc)
})

module.exports = npcRouter;