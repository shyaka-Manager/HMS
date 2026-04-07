const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'hospital_system'
});

db.connect(err => {
    if (err) {
      console.error('error connecting to mysql database: ', err)
      return;
    }
    console.log('mysql database connected successfully');
});

module.exports = db;