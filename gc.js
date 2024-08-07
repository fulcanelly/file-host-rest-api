const { Op } = require('sequelize');
const { Session } = require('./models');
const moment = require('moment')
const { config } = require('./config');

const cron = require('node-cron');

cron.schedule('0 * * * *', async () => {
  await destroyOldSessions()
})

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
}
