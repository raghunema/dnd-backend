const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const User = require('../models/user.model');

const adminRouter = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

adminRouter.use(cookieParser());

adminRouter.post('/newUser', async (req, res) => {
    const {username, name, password, privileges}  = req.body

    try {

        const saltRounds = 10;
        const hash = await bcrypt.hash(password, saltRounds)

        const newUser = new User({
            username, 
            name,
            password: hash,
            privileges
        })

        await newUser.save();

        res.status(200).json({ message: 'New user saved successfully!' });
    } catch (err) {
        console.error('Failed saving new user:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
})

adminRouter.post('/', async (req, res) => {
    const { username, password } = req.body;
    console.log("Logging in")

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });

    res.cookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        domain: '.onrender.com',
        maxAge: 60 * 60 * 1000 * 24 // 1 Day
    });

    res.cookie('userInfo', JSON.stringify({
        "user": user.username,
        "userDisplayName": user.name,
        "privileges": user.privileges
    }), {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        domain: '.onrender.com',
        maxAge: 60 * 60 * 1000 * 24
    });

    res.status(200).json({ success: true });
});

// adminRouter.get('/logout', (req, res) => {
//     res.clearCookie('token');
//     res.json({ success: true });
// });

module.exports = adminRouter;