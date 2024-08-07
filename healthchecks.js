// it's alrternative of depeneds_on in docker-compose, it's easier to get it right
require('dotenv').config()

const mysql = require('mysql2/promise')
const redis = require('redis')

const MYSQL_CONFIG = {
  database: process.env.MYSQL_DATABASE,
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_ROOT_PASSWORD
}

const url = `redis://${process.env.REDIS_HOST}:6379`


const MAX_RETRIES = 10
const RETRY_DELAY_MS = 1000

async function checkMySQL() {
  try {
    const connection = await mysql.createConnection(MYSQL_CONFIG);
    await connection.end();
    console.log('MySQL is available.');
    return true;
  } catch (error) {
    console.error('MySQL check failed:', error.message);
    return false;
  }
}

async function checkRedis() {
  const client = redis.createClient({ url });

  try {
    await client.connect()
    await client.ping()
    console.log('Redis is available.');
    return true
  } catch (error) {
    console.log('Redis check failed.', error.message);
    return false
  }

}

async function waitForServices() {
  let retries = 0;

  while (retries < MAX_RETRIES) {
    const mysqlAvailable = await checkMySQL();
    const redisAvailable = await checkRedis();

    if (mysqlAvailable && redisAvailable) {
      console.log('Both MySQL and Redis are available.');
      process.exit(0);
    }

    retries += 1;
    console.log(`Retry ${retries}/${MAX_RETRIES}...`);
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
  }

  console.error('Services did not become available in time.');
  process.exit(1);
}

waitForServices();
