'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Session extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
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
  });
  return Session;
};