const Location = require('../../models/location.model');
const NPC = require('../../models/npc.model');
const Events = require('../../models/event.model');
const Relationship = require('../../models/relationship.model');
const mongoose = require('mongoose');

////
// Bascially this middleware is for to use to get linked information, but have it limited
// ex: npc page has events, that event has location associated
//    instead of expanding that event out, we are going to use this middleware to get the name because its cleaner
///


const expansionMiddleware = async (req, res, next) => {

    if (!req.query.reason) {
        return next();
    }

    console.log('in expansion middleware')
    const originalJson = res.json.bind(res);

    //this basically overrides the res.json() function in the endpint
    res.json = async (data) => {
        try {
            const expandedData = await expandData(data, req.query.reason);
            originalJson(expandedData);
        } catch (error) {
            console.error('Expansion error:', error);
            // Send original data if expansion fails
            originalJson(data);
        }
    };

    next();
}

async function expandData (npcData, reason) {

    if (!npcData) return npcData

    switch (reason) {
        // This is for an npc's own page
        case 'npc_detail':
            return await expandNpcDetail(npcData);
        case 'form_relationships':
            return await expandNpcFormRelationships(npcData)
        default:
            return npcData;
    }

}

async function expandNpcDetail(npcData) {
    const expanded = JSON.parse(JSON.stringify(npcData));
    
    // More comprehensive expansion for detail view
    if (expanded.events && expanded.events.length > 0) {

        const locationIds = [...new Set(
            //get all the events with a location -> get all unique ids -> then make it back into an array
            expanded.events
                .filter(event => event.location)
                .map(event => event.location)
        )];

        // get all location names of the ids
        const locations = await Location.find(
            { _id: { $in: locationIds } },
            'name'
        );

        //console.log(locations)

        //make into a set so we can assign the events their location name fast
        const locationMap = new Map();
        locations.forEach(location => {
            locationMap.set(location._id.toString(), location);
        });

        //console.log(locationMap)

        //for each event, 'copy' the event, but add the location name to it
        expanded.events = expanded.events.map(event => ({
            ...event,
            locationName: locationMap.get(event.location?.toString())?.name || null
        }));
    }

    ///get the npcs that this person is related to
    if (expanded.relationships && expanded.relationships.length > 0) {

        const npcIds = new Set()
        
        for (const relation of expanded.relationships) {
            npcIds.add(relation.relationshipId.npcA)
            npcIds.add(relation.relationshipId.npcB)
        }

        const npcIdsArray = [...npcIds]

        const npcNames = await NPC.find(
            { _id: { $in: npcIdsArray } },
            'name'
        )
        console.log('names of npcs: ')
        console.log(npcNames)

        const npcNameMap = new Map();
        npcNames.forEach(npc => {
            npcNameMap.set(npc._id.toString(), npc)
        })

        expanded.relationships = expanded.relationships.map(relation => ({
            ...relation,
            npcAName: npcNameMap.get(relation.relationshipId.npcA.toString()).name || null,
            npcBName: npcNameMap.get(relation.relationshipId.npcB.toString()).name || null 
        }))
    }

    console.log(expanded.relationships)
    return expanded;
}

async function expandNpcFormRelationships(npcData) {
    //this function is to massage the data that goes into the npc form
    
    const relationships = []
    
    for (const relation in npcRelationships) {
        const currRelationship = null

    }

}


module.exports = expansionMiddleware;