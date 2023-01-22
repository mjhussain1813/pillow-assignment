const redis = require('redis');

let redisClient = redis.createClient();
redisClient.on('error', (err) => console.log('Redis Client Error', err));

async function connectRedis(){
    await redisClient.connect();
}

export {
    connectRedis,
    redisClient
}