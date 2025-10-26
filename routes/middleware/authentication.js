const jwt = require('jsonwebtoken');

const validateAuth = async (req, res, next) => {
    console.log('validating login')

    const authorizationHeaders = req.headers.authorization.split(' ');
    const token = authorizationHeaders[1];
    //console.log(authorizationHeaders)

    if (!authorizationHeaders || !token || token === 'null') {
        //console.log('no token')
        return res.status(401).json({error: 'Not authentication token recieved'});
    }

    //console.log('token');
    //console.log(token);


    jwt.verify(token, process.env.JWT_SECRET, (err, user) =>{
        if (err) {
            return res.status(405).json({error: 'User token expired'})
        }
        //console.log('user token still valid')
        //console.log(user)
        req.user = user;
        next();
    })
}

const checkPrivileges = async (req, res, next) => {

    if (req.user.privileges === 'all') {
        next();
    } else {
        return res.status(403).json({error: 'Not allowed for this user'})
    }

}

module.exports = { validateAuth, checkPrivileges }