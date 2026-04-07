const { createClient } = require('redis');

let client;

const connectRedis = async () => {
  client = createClient({
    socket: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT),
    },
  });

  client.on('error', (err) => console.error('[ERROR] Redis:', err.message));
  client.on('connect', () => console.log('[INFO]  Redis connected'));

  await client.connect();
};

const getRedis = () => {
  if (!client) throw new Error('Redis not initialized');
  return client;
};

module.exports = { connectRedis, getRedis };