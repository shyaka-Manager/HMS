const Sequelize = require("sequelize");

const sequelize = new Sequelize(
  process.env.SQL_DATABASENAME,
  process.env.SQL_USERNAME,
  process.env.SQL_PASSWORD,
  {
    host: process.env.SQL_HOST || "127.0.0.1",
    port: Number(process.env.SQL_PORT || 3306),
    dialect: "mysql",
    logging: false,
    define: {
      freezeTableName: true,
      timestamps: true,
    },
    timezone: "+00:00",
  }
);

module.exports = { sequelize };
