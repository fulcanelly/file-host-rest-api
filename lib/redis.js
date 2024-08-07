const redis = require('redis')

const url = `redis://${process.env.REDIS_HOST}:6379`;

const redisClient = redis.createClient({ url })

redisClient.on('error', (err) => {
  console.error('Redis error:', err)
})

redisClient.connect().then(() => {
  console.log("Conncted to redis")
})

module.exports = { redisClient }