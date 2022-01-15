const { Sequelize, DataTypes } = require("sequelize");
const sequelize = require("../../config/database");

const Group = sequelize.define("groups", {
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  },
  group_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  mon_groupe: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
});

Group.associate = (models) => {
  Group.hasMany(models.Member, {
    onDelete: "cascade",
  });
};

module.exports = Group;
