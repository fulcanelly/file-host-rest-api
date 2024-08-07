'use strict';
const {
  Model
} = require('sequelize')
const { redisClient } = require('../lib/redis')
const { config } = require('../config')

module.exports = (sequelize, DataTypes) => {
  class Session extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    async blacklistAll() {
      await Promise.all([
        this.blacklistAccessToken(),
        this.blacklistRefreshToken()
      ])
    }

    async blacklistAccessToken() {
      await redisClient.set('blacklist:' + this.accessPart, this.accessHash, { EX: config.expireBlacklistRedis })
    }

    async blacklistRefreshToken() {
      await redisClient.set('blacklist:' + this.refreshPart, this.refreshHash, { EX: config.expireBlacklistRedis })
    }

    static associate(models) {
      Session.belongsTo(models.User, {
        foreignKey: 'userId'
      })
      models.User.hasMany(Session)
    }
  }
  Session.init({
    accessPart: DataTypes.STRING,
    accessHash: DataTypes.STRING,
    refreshPart: DataTypes.STRING,
    refreshHash: DataTypes.STRING,
    userId: DataTypes.INTEGER,
    expireAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'Session',
    hooks: {
      beforeDestroy: async (session, opts) => {
        await session.blacklistAll()
      }
    }
  });
  return Session;
};