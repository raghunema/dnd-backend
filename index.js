const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const cors = require('cors');
const redisClient = require('./redisUtils')

const locationRouter = require('./routes/location.router')
const npcRouter = require('./routes/npc.router')
const adminRouter = require('./routes/admin.router')
const eventRouter = require('./routes/event.router')

const app = express();

const allowedOrigins = [
    'http://localhost:3000',
    'https://dnd-wiki-ten.vercel.app'
]

app.use(cors ({
  origin:  allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());
app.use('/locations/', locationRouter);
app.use('/npcs/', npcRouter);
app.use('/events', eventRouter)
app.use('/login', adminRouter);

mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
}).then(async () => {
    console.log('Server Connceted');

    redisClient.on('error', (err) => console.error('Redis Client Error', err));
    redisClient.on('connect', () => console.log('Redis Connected'));

    await redisClient.connect();
        
    app.listen(process.env.PORT || 3000, () => {
        console.log(`Server Listening on Port ${process.env.PORT}`)
    });
})
.catch((err) => {
    console.log('Unable to connect to server', err)
})

module.exports = { redisClient }