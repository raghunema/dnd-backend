const mongoose = require('mongoose');
const Relationship = require('../../models/relationship.model');
const NPC = require('../../models/npc.model');

async function createRelationship ({
    npcX, 
    relXtoY,
    npcY,
    relYtoX,
    description,
    strength = 0
}) {
    console.log("Creating an relationship")
    const session = await mongoose.startSession();
    await session.startTransaction();

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

        // const newRelationship = await Relationship.create([{
        //     npcA: npcA, 
        //     relAtoB: relAtoB,
        //     npcB: npcB, 
        //     relBtoA: relBtoA,
        //     description: description,
        //     strength: strength
        // }], { session }) 

        const relationship = await Relationship.findOneAndUpdate (
            { npcA: npcA, npcB: npcB},
            {
                npcA: npcA, 
                relAtoB: relAtoB,
                npcB: npcB, 
                relBtoA: relBtoA,
                description: description,
                strength: strength
            },
            {   session, 
                new: true,
                upsert: true,
                setDefaultOnInsert: true
            }
        )

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

        console.log(newNpcA)

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

        console.log(newNpcB)

        if (!newNpcB) {
            throw new Error("Error updating npc B")
        }

        await session.commitTransaction();

        console.log("created new relationship")
        return relationship;

    } catch (err) {
        await session.abortTransaction();

        console.log("Error creating a relationship")
        console.log(err)
        throw err // is this correct??

    } finally {
        session.endSession();
    }
}

async function getRelationships ({relationshipIds, relationshipIndexes}) {

}

module.exports = { createRelationship }