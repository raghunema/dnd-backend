const validateAuth = async (req, res, next) => {

    const headers = req.headers;
    console.log('headers');
    console.log(headers);

    const token = req.headers.authorization;
    console.log('token:')
    console.log(token)

    next();
}

module.exports = { validateAuth }