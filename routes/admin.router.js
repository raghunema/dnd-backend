const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const nodemailer = require('nodemailer')

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

    const token = jwt.sign(
        { 
            id: user._id,  
            name: user.name,
            username: user.username,
            privileges: user.privileges
        }, 
        JWT_SECRET, 
        { expiresIn: '24h' }
    );

    // res.cookie('token', token, {
    //     httpOnly: true,
    //     secure: process.env.NODE_ENV === 'production',
    //     sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'none',
    //     maxAge: 60 * 60 * 1000 * 24 // 1 Day
    // });

    // res.cookie('userInfo', JSON.stringify({
    //     "user": user.username,
    //     "userDisplayName": user.name,
    //     "privileges": user.privileges
    // }), {
    //     httpOnly: false,
    //     secure: true,
    //     sameSite: 'none',
    //     maxAge: 60 * 60 * 1000 * 24
    // });

    res.status(200).json({
        token, 
        user: {
            username: user.username,
            privileges: user.privileges
        },
        success: true 
    });
});

adminRouter.post('/magic-link', async (req, res) => {
    console.log("Magic Link Requested")

    console.log(req.body)

    const { email } = req.body;
    const tokenExpiry = Date.now() + (15 * 60 * 1000) //when the new token will expire in 15mins

    //should make a token - store it based on the email of the user
    const tokenBytes = crypto.randomBytes(32).toString('hex');
    const magicToken = crypto.createHash('sha256').update(tokenBytes).digest('hex')

    //recreate the magic token during verification to compare with stored value
    const user = await User.findOneAndUpdate(
        { email },
        { $set: { magicToken: magicToken, magicTokenExpiry: tokenExpiry}},
        { new: true}
    )
    if (!user) return res.status(404).send('No user found with email')

    try {
        const magicLink = `http://localhost:3000/admin/login/magic-link?token=${tokenBytes}` //dev testing

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port:  587, //??
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        })

        const emailStatus = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Mathura Magic Link to sign in!',
            html: `
                <div>
                ${magicLink}
                </div>
                `
        })

        res.json({
            success: true,
            message: 'Magic Link sent!'
        })
    } catch (err) {
        console.log(`Failed to send link: ${err}`)
        res.status(500).json({
            success: false,
            error: 'Failed to send magic link'
        })
    }
    
})

adminRouter.post('/verify-magic-link', async (req, res) => {

    const { magicToken } = req.body;

    try {
        const hashedMagiToken = crypto.createHash('sha256').update(magicToken).digest('hex')
        
        //get user by magic token
        const user = await User.findOne( 
            { magicToken: hashedMagiToken }
        );

        if(!user) {
            return res.status(500).json({error: "No user with provided token found"})
        }

        //console.log(user)

        //check if token is expired
        if (Date.now() > user.magicTokenExpiry) {
            console.log("Token expired")
            return res.status(401).json({error: "Token Expired"})
        }

        const token = jwt.sign(
            { 
                id: user._id,  
                name: user.name,
                username: user.username,
                privileges: user.privileges
            }, 
            JWT_SECRET, 
            { expiresIn: '24h' }
        );

        console.log('logging in via email magic link')

        res.status(200).json({
            token, 
            user: {
                username: user.username,
                privileges: user.privileges
            },
            success: true 
        });
    } catch (err) {
        console.log(err)
        return res.status(500).json({error: err})
    }

})
adminRouter.post('/update-user', async (req, res) => {

    // const userUpdate = await User.findOneAndUpdate(
    //     { username: 'raghu'},
    //     {
    //         email: 'rnema35@gmail.com'
    //     },
    //     {new: true}
    // )
    
    const updatedUser = await User.findOne(
        { email: 'rnema35@gmail.com'}
    )

    console.log(updatedUser)

    res.json(updatedUser)
})

//don't actually need this in the backend
// adminRouter.get('/logout', (req, res) => {
//     res.clearCookie('token');
//     res.json({ success: true });
// });

module.exports = adminRouter;