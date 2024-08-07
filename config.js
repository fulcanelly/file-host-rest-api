
const { duration } = require('moment')

module.exports = {
  config: {
    expireBlacklistRedis: duration(12, 'hours').asSeconds(),

    sessionExpireAfter: duration(12, 'hours'),

    accessTokenExpiresIn: '10m',

    refreshTokenExpiresIn: '12h',

    limits: {
      request: 500,
      timeWindow: duration(15, 'minutes')
    }
  }
}