const mongoose = require('mongoose');
const Relationship = require('../../models/relationship.model');
const NPC = require('../../models/npc.model');

async function createRelationship ({
    npcX, 
    relXtoY,
    npcY,
    relYtoX,
    description,
    strength
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

        
        const relationAlreadyExists = await Relationship.find({
            npcA: npcA,
            npcB: npcB
        })

        if (relationAlreadyExists) {
            //don't want to error out immediately but also don't want to make anything crazy happen
            return null;
        }

        const newRelationship = await Relationship.create([{
            npcA: npcA, 
            relAtoB: relAtoB,
            npcB: npcB, 
            relBtoA: relBtoA,
            description: description,
            strength: strength
        }], { session }) 

        if (!newRelationship) {
            throw new Error("Error creating new relationship")
        }

        const relationshipDoc = newRelationship[0];

        const newNpcA = await NPC.findByIdAndUpdate(
           npcA,
           {
            $push: {
                relationships: {
                    relationshipId: relationshipDoc._id,
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
            $push: {
                relationships: {
                    relationshipId: relationshipDoc._id,
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
        session.endSession();

        console.log("created new relationship")
        return newRelationship;
    } catch (err) {
        await session.abortTransaction();
        session.endSession();

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