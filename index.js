const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const cors = require('cors')

const locationRouter = require('./routes/location.router')
const npcRouter = require('./routes/npc.router')
const adminRouter = require('./routes/admin.router')

const app = express();

app.use(cors ({
  origin:  'http://localhost:3000', // your frontend origin
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true, // if you're using cookies or auth headers
}));

app.use(bodyParser.json());
app.use('/locations/', locationRouter);
app.use('/npcs/', npcRouter);
app.use('/login', adminRouter);

mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
}).then(() => {
    console.log('Server Connceted');
        
    app.listen(process.env.PORT, () => {
        console.log(`Server Listening on Port ${process.env.PORT}`)
    });
})
.catch((err) => {
    console.log('Unable to connect to server', err)
})

//insert any info
app.post('/insert-info', async (req, res) => {
    console.log('in here');

    // if (err) {
    //     console.error(`Error getting new information: ${err}`)
    //     return res.status(400).send("Error: Inserting information is invalid")
    // }

    const dataFile = path.resolve(__dirname, './data/data.json');
    console.log(`Data path; ${dataFile}`)

    //the information we are going to insert
    const newItem = req.body;

    fs.readFile(dataFile, 'utf8', (err, data) => {
        if (err) {
            console.error(`Error reading file: ${err}`);
            return res.status(500).send('Error reading file');
        }


        let myData = JSON.parse(data);

        
        if (newItem.itemType == 'npc') {
            myData.npcs.push(newItem)
        } else if (newItem.itemType == 'event') {
            myData.events.push(newItem)
        } else if (newItem.itemType == 'location') {
            myData.locations.push(newItem)
        } else {
            console.log(`Incorrect data type: ${newItem.type}`);
            return res.status(500).send(`Incorrect item type: ${newItem.itemType}`);
        }

        fs.writeFile(dataFile, JSON.stringify(myData, null, 2), (err) => {
            if (err) {
                console.error(`Error: Can't write to file: ${err}`)
                return res.status(500).send("Error writing to file")
            }
            console.log("Date successfully written to file");
            return res.status(201).send("Data successfully written to file");
        });
    });
});