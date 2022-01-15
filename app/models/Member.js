const { Sequelize, DataTypes } = require("sequelize");
const sequelize = require("../../config/database");
const group = require("./Group");
const Member = sequelize.define("members", {
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  },
  member_id: {
    type: DataTypes.BIGINT,
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
  group_id: {
    type: DataTypes.INTEGER,
    references: {
      model: "members",
      key: "id",
    },
    allowNull: false,
  },
});

Member.associate = (models) => {
  Member.belongsTo(models.Group, {
    foreignKey: {
      allowNull: false,
    },
  });
};

module.exports = Member;
