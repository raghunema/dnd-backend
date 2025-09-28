const express = require('express');
const Event = require('../models/event.model');
const Location = require('../models/location.model');
const NPC = require('../models/npc.model');
const mongoose = require("mongoose");
require('mongoose-schema-jsonschema')(mongoose);

const eventRouter = express.Router();


////////////////////////
/// POST Statements ///
///////////////////////

//new event
eventRouter.post('/new', async (req, res) => {
    console.log("Trying to save new event");
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const newEvent = await Event.create(req.body);
        await newEvent.save({ session })

        if (newEvent.location) {
            const location = await Location.findByIdAndUpdate(
                newEvent.location,
                { $addToSet: {events: newEvent._id} },
                { session }
            );
        }

        if (newEvent.npcs && newEvent.npcs.length > 0) {
            await NPC.updateMany(
                {_id: { $in: newEvent.npcs } },
                { $addToSet: {events: newEvent._id}},
                { session }
            )
        }

        console.log("Event saved successfully");
        session.commitTransaction();
        session.endSession();

        res.status(201).send(newEvent);
    } catch (err) {
        session.abortTransaction();
        session.endSession();
        
        console.error("Error saving Event:");
        console.error(err.stack)
        res.status(500).send(`Error saving Event: ${err.message}`);
    }
});

//update an event
eventRouter.post('/update', async (req, res) => {
    console.log("trying to update event")

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const eventId = req.body._id;
        const newEvent = req.body;
        const newEventNpcs = req.body.npcs;

        const oldEvent = await Event.findById(eventId).session(session);

        if (!oldEvent) {
            session.abortTransaction()
            session.endSession()
            return res.status(404).send(`Event with id ${oldEvent} not found to update.`);
        }

        console.log(`found oldEvent`)
        //npcs that have been removed from the event
        const npcsToDeleteFrom = oldEvent.npcs.filter(
            oldNpcs => !newEventNpcs.includes(oldNpcs.toString())
        );

        if (npcsToDeleteFrom.length > 0) {
            console.log(`deleting event from npcs`)
            await NPC.updateMany(
                { _id: { $in: npcsToDeleteFrom } },
                { $pull: { events: eventId } },
                { session }
            )
        }

        //console.log(newEvent.npcs)
        if (newEvent.npcs.length > 0) {
            //using set to avoid dupes
            await NPC.updateMany(
                { _id: { $in: newEvent.npcs } },
                { $addToSet: { events: eventId } },
                { session }
            )
        }

        //add event to location
        await Location.findByIdAndUpdate(
            newEvent.location, 
            { $addToSet:  { events: eventId } },
            { session }
        )

        const event = await Event.findByIdAndUpdate(eventId, newEvent, { new: true, runValidators: true, session })

        await session.commitTransaction();
        session.endSession();

        console.log(`Updated Event: ${event.name}`);
        res.status(200).send(event)
    } catch (err) {
        await session.abortTransaction();
        session.endSession();

        console.error(`Error updating event:  ${err.message}`)
        console.log(err.stack)

        res.status(501).send(`Error updating event: ${err}`)
    }

})


//////////////////////
/// GET Statements ///
/////////////////////

//get all events with a projection
eventRouter.get('/all', async (req, res) => {
    try {
        const { fields, expand } = req.query;

        const projection = fields ? fields.split(',').join(' ') : '';
        //To get only id and slug - you would pass fields in the query of the get request
            // ex: localhost:8000/events/all?fields=slug,name&expand=npcs

        let query = Event.find({}, projection)
        
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

        console.log('getting all event')
        const allEvents = await query.sort({fromDate: 1});

        res.status(201).send(allEvents)
    } catch (err) {
        console.log(`Error getting all Events`)
        res.status(500).send(`Error getting all events: ${err.message}`)
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

        eventJsonSchema.properties.information.type = 'object'
    
        //console.log(eventJsonSchema);
        res.json(eventJsonSchema);

    } catch (err) {
        res.status(500).send(err)
    }
})


eventRouter.get('/single/:eventId', async(req, res) => {
    console.log('trying to get a single event')

    try { 
        const { fields, expand } = req.query;

        const projection = fields ? fields.split(',').join(' ') : '';

        let query = Event.findById(req.params.eventId, projection)

        if (expand) {
            expand.split(",").forEach(relation => {
                query = query.populate(relation.trim());
            });
        }

        const event = await query;
        res.status(201).send(event)
    } catch (err) {
        console.log(err.stack)
        res.status(500).send(err)
    }

})

// get events filtered - to get very specific information, for later down the line
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

////////////// DEPRECEATED CODE //////////////////// 

//get a single event
// eventRouter.get('/single/:eventSlug', async (req, res) => {
//     try {
//         const { eventSlug } = req.params;

//         const event = await Event.findOne({
//             slug: eventSlug
//         })

//         // if (event.location) {
//         //     const eventLoc = await Location.findById(event.location);

//         //     event.locationInfo = eventLoc;
//         // }

//         res.status(201).send(event)
//     } catch (err) {
//         console.log("Error getting specific event")
//         res.status(501).send(`Error getting an event: ${err}`)
//     }
// })

//get events of an npc - should be in the npc router
// eventRouter.get('/npcEvents/:npcSlug', async (req, res) => {
//     console.log("Getting events of an npc")

//     try {
//         const { npcSlug } = req.params;
//         const events = []
//         const npc = await NPC.findOne({slug: npcSlug})

//         for (const eventId of npc.events) {
//             console.log(eventId)
//             const event = await Event.findById(eventId)
//             if (event) events.push(event)
//         }

//         console.log("Responding to events")
//         res.status(200).json(events)
//     } catch (err) {
//         console.error("Error finding npc events:", err);
//         res.status(500).send(`Error getting events`);
//     }
// });

//get events of a location -- this should be in the location router
// eventRouter.get('/locationEvents/:locationId', async (req, res) => {
//     console.log("Getting events of an location")

//     try {
//         const { locationId } = req.params;
        
//         const events = []

//         const location = await Location.findById(locationId)
//         for (const eventId of location.events) {
//             const event = await Event.findById(eventId)
//             if (event) events.push(event)
//         }

//         console.log("Responding to location events")
//         res.status(200).json(events)
//     } catch (err) {
//         console.error("Error getting location events:", err);
//         res.status(500).send(`Error getting events`);
//     }
// });

//add event to a npc - this should be in the npc router
// eventRouter.post('/:npcSlug', async (req, res) => {
//     console.log("Adding new event to npc")
    
//     try {
//         const { npcSlug } = req.params;
//         const npc = await NPC.findOne({slug: npcSlug})
//         console.log(`Found npc: ${npc.npcSlug}`)

//         if (!npc) return res.status(404).json({ error: 'NPC not found' })

//         let event;
//         //event already exists
//         if (req.body.eventId) {
//             event = await Event.findById(req.body.eventId);

//             //add npc to event
//             if(!event.npcs) event.npcs = []
//             event.npcs.push(npc._id)
//             await event.save()

//         } else {
//             const { slug, name, description, fromDate, toDate, npcs, location, information} = req.body.event
//             event = await Event.create({
//                slug, name, description, fromDate, toDate, npcs, location, information
//             })
//         }

//         if (!npc.events) npc.events = [];
        
//         npc.events.push(event._id)
//         console.log(npc.events)
//         await npc.save();

//         console.log(`Event added to npc successfully`)
//         res.status(201).send(npc)
//     } catch (err) {
//         console.log(`Error adding to npc timeline`)
//         res.status(500).send(`Error saving location: ${err.message}`)
//     }
// })

//get only id, slug, and name information to pre-pop form ---- will now be handeled in the all 
// eventRouter.get('/form', async (req, res) => {
//     try {
//         const allEvents = await Event.find(
//            {},
//            "name slug"
//         )
//         res.status(201).send(allEvents)
//     } catch (err) {
//         console.log(`Error getting all Events`)
//         res.status(500).send(`Error getting all events: ${err.message}`)
//     }
// })

//updates the location of the event
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