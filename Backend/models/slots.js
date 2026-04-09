const { sequelize } = require("../config/db");
const Sequelize = require("sequelize");

const Slots = sequelize.define("slots", {
  date: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  time: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  doctorId: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  patientId: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  isBooked: {
    type: Sequelize.BOOLEAN,
    defaultValue: true,
  },
});

module.exports = { Slots };
