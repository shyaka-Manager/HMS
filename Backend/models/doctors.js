const { sequelize } = require("../config/db");
const Sequelize = require("sequelize");

const Doctors = sequelize.define("doctors", {
  name: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  email: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true,
  },
  avatar: {
    type: Sequelize.STRING,
    allowNull: false,
    defaultValue: "https://placehold.co/128x128",
  },
  speciality: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  department: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  availability: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  rating: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  fee: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  schedule: {
    type: Sequelize.TEXT,
    allowNull: false,
    defaultValue: "[]",
  },
});

module.exports = { Doctors };
