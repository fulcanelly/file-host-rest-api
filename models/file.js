'use strict';

const {
  Model
} = require('sequelize');

const fs = require('fs');
const util = require('util');
const unlink = util.promisify(fs.unlink);

module.exports = (sequelize, DataTypes) => {
  class File extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */

    deleteFile() {
      return unlink(this.path)
    }

    static associate(models) {
      File.belongsTo(models.User, {
        foreignKey: 'userId'
      })
      models.User.hasMany(File)
    }
  }
  File.init({
    name: DataTypes.STRING,
    path: DataTypes.STRING,
    extension: DataTypes.STRING,
    mimetype: DataTypes.STRING,
    size: DataTypes.INTEGER,
    userId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'File',
  });
  return File;
};