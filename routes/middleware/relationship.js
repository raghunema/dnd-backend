const mongoose = require('mongoose');
const Relationship = require('../../models/relationship.model');
const NPC = require('../../models/npc.model');
const { findByIdAndUpdate } = require('../../models/npcTimelineEvent.model');

async function createRelationship ({
    npcX, 
    relXtoY,
    npcY,
    relYtoX,
    description,
    strength = 0
},
    session
) {
    console.log("Creating an relationship")
    // const session = await mongoose.startSession();
    // await session.startTransaction();

    if (!session) throw new Error("No session provided")

    try {
        //validate that npcA and B are the same
        if (npcX.toString() === npcY.toString()) {
            throw new Error("Both NPCs cannot be the same")
        }

        //consistency for smaller id first
        const [npcA, relAtoB, npcB, relBtoA] =  npcX.toString() < npcY.toString()
            ? [npcX, relXtoY, npcY, relYtoX]
            : [npcY, relYtoX, npcX, relXtoY]

    
        //Maybe we want to upsert relationships
        const intStrength = parseInt(strength)
        const relationship = await Relationship.findOneAndUpdate (
            { npcA: npcA, npcB: npcB},
            {
                npcA: npcA, 
                relAtoB: relAtoB,
                npcB: npcB, 
                relBtoA: relBtoA,
                description: description,
                strength: intStrength
            },
            {   session, 
                new: true,
                upsert: true,
                setDefaultOnInsert: true
            }
        )

        //console.log(relationship)

        if (!relationship) {
            throw new Error("Error creating new relationship")
        }

        const newNpcA = await NPC.findByIdAndUpdate(
           npcA,
           {
            $addToSet: {
                relationships: {
                    relationshipId: relationship._id,
                    relationshipIndex: "npcA"
                }
            }
           },
           { session, new: true} 
        )

        //console.log(newNpcA)

        if (!newNpcA) {
            throw new Error("Error updating npc A")
        }

        const newNpcB = await NPC.findByIdAndUpdate(
           npcB,
           {
            $addToSet: {
                relationships: {
                    relationshipId: relationship._id,
                    relationshipIndex: "npcB"
                }
            }
           },
           { session, new: true} 
        )

        //console.log(newNpcB)

        if (!newNpcB) {
            throw new Error("Error updating npc B")
        }

        console.log("created new relationship")
        return relationship;
    } catch (err) {
        console.log("Error creating a relationship")
        console.log(err)
        throw err 
    } 
}

async function deleteRelationship(
    relationshipId,
    session
) {
    console.log('deleting relationship')

    try {

        const oldRelationship = await Relationship.findById(relationshipId).session(session);

        if (!oldRelationship) {
            throw new Error("relationship to delete not found")
        }

        //remove relationship from npcA 
        const npcA = await NPC.findByIdAndUpdate(
            oldRelationship.npcA,
            {
                $pull: {
                    relationships: {
                        relationshipId: relationshipId
                    }
                }
            },
            { session }
        )

        //remove relationship from npcB 
        const npcB = await NPC.findByIdAndUpdate(
            oldRelationship.npcB,
            {
                $pull: {
                    relationships: {
                        relationshipId: relationshipId
                    }
                }
            },
            { session }
        )

        const deletedRel = await Relationship.findByIdAndDelete(relationshipId, { session })

        return deletedRel
    } catch (err) {
        console.log("Error deleting a relationship")
        console.log(err)
        throw err 
    }
}

// async function getRelationships ({relationshipIds, relationshipIndexes}) {

// }

module.exports = { createRelationship, deleteRelationship }