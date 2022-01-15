const bcrypt = require("bcryptjs");
const { Sequelize, DataTypes } = require("sequelize");
const sequelize = require("../../config/database");

const User = sequelize.define(
  "users",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    tel: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    app_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    app_hash: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    nom: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    session_string: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: "",
    },
    connected: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    session_generated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    // fullName: DataTypes.STRING,
    // email: {
    // 	type: DataTypes.STRING,
    // 	allowNull: false
    // },
    // password: {
    // 	type: DataTypes.STRING,
    // 	allowNull: false
    // },
    // resetToken: {
    // 	type: DataTypes.STRING,
    // 	allowNull: true
    // },
    // resetTokenExpiry: {
    // 	type: DataTypes.DATE,
    // 	allowNull:true
    // }
  }
  // , {
  //     indexes: [
  //         // Create a unique index on email
  //         {
  //             unique: true,
  //             fields: ["email"],
  //         },
  //     ],
  // }
);

module.exports = User;
