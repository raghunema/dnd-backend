const redis = require('redis');

const redisClient = redis.createClient({
    username: 'default', 
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: 'redis-11199.c263.us-east-1-2.ec2.redns.redis-cloud.com',
        port: 11199
    }
})

module.exports = redisClient