require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db.js');

// Import các file routes
const authRoutes = require('./routes/auth.js');
const importRoutes = require('./routes/import.js');
const attendanceRoutes = require('./routes/attendance.js');
const groupRoutes = require('./routes/groups.js');
const employeeRoutes = require('./routes/employees.js');
const activityRoutes = require('./routes/activity.js'); // <-- 1. IMPORT FILE MỚI

// Khởi tạo app
// --- 1. IMPORT ROUTE TABLET MỚI ---
const tabletRoutes = require('./routes/tablet.js');
const app = express();
const port = 5000;

// Sử dụng middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Tăng limit để an toàn
//dashboard route
const dashboardRoutes = require('./routes/dashboard.js');
app.use('/api/dashboard', dashboardRoutes);

// ------------------------------------
// ĐỊNH TUYẾN (ROUTING)
// ------------------------------------

app.use('/api/auth', authRoutes);
app.use('/api/import', importRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/activity', activityRoutes); // <-- 2. SỬ DỤNG ROUTE MỚI
// --- 2. SỬ DỤNG ROUTE TABLET (Gắn vào root) ---
app.use('/', tabletRoutes);
// API "Hello World"
app.get('/', async (req, res) => {
    try {
        const [results, fields] = await db.query("SELECT 'Kết nối CSDL thành công!' AS result");
        res.json({ 
            message: 'Chào mừng bạn đến với API Chấm công!',
            db_status: results[0].result 
        });
    } catch (err) {
        res.status(500).json({ 
            message: 'Lỗi API', 
            error: err.message 
        });
    }
});

// Chạy server
app.listen(port, () => {
    console.log(`Server đang chạy tại http://localhost:${port}`);
});