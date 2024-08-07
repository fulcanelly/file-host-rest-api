const { Op } = require('sequelize');
const { Session, sequelize } = require('./models');
const moment = require('moment')
const { config } = require('./config');
const { redisClient } = require('./lib/redis');



async function destroyOldSessions() {
  console.log('* Destroying old sessions')
  let page = 0
  let sessions = []

  do {
    sessions = await Session.findAll({
      where: {
        updatedAt: {
          [Op.lt]: moment().subtract(config.sessionExpireAfter).toDate(),
        },
      },
      order: ['id'],
      limit: 10,
      offset: 10 * page
    })

    await Promise.all(sessions.map(s => s.destroy()))

    page++
  } while (sessions.length)
  console.log('* Done destroying old sessions')


};

(async () => {
  await destroyOldSessions()

  await redisClient.disconnect()
  await sequelize.close()
})()