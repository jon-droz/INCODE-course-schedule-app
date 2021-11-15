const crypto = require('crypto');
const authTokens= {};

const generateAuthToken = () => {
    return crypto.randomBytes(30).toString('hex');
}

const requireAuth = (req, res, next) => {
    if (req.user) {
        next();
    } else {
        res.render('login', {message: 'Please, login to continue'})
    }
}

const discoverAuthCookie = (req, res, next) => {
    const token = req.cookies['AuthToken'];
    req.user = authTokens[token];
    next()
}

module.exports = {
    generateAuthToken, requireAuth, discoverAuthCookie, authTokens
}