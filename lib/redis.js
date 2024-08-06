const redis = require('redis')

const redisClient = redis.createClient()

redisClient.on('error', (err) => {
    console.error('Redis error:', err)
})

redisClient.connect().then(() => {
    console.log("Conncted to redis")
})

module.exports = { redisClient }