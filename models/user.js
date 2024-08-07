const bcrypt = require('bcrypt');
const { Op } = require('sequelize');

'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }

    static findByPublicId(id) {
      return User.findOne({
        where: {
          [Op.or]: [
            {
              email: id
            },
            {
              phone: id
            }
          ]
        }
      })
    }

    getPublicId() {
      return this.phone || this.email
    }

    async validatePassword(password) {
      return await bcrypt.compare(password, this.password);
    }
  }
  User.init({
    phone: DataTypes.STRING,
    email: DataTypes.STRING,
    password: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'User',
    hooks: {
      beforeCreate: async (user, options) => {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      },

      beforeUpdate: async (user, options) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      }
    }
  });
  return User;
};