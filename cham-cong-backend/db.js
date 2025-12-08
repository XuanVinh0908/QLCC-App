const mysql = require('mysql2/promise');
require('dotenv').config(); 

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    timezone: '+07:00',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true // <-- THÊM DÒNG NÀY
});

pool.getConnection()
    .then(connection => {
        console.log('✅ Đã kết nối thành công với CSDL MySQL!');
        connection.release(); 
    })
    .catch(err => {
        console.error('🔴 Lỗi kết nối CSDL: ' + err.message);
    });

module.exports = pool;