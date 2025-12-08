const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const db = require('../db.js');
const { protect } = require('../middleware/authMiddleware.js');

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// API 1: IMPORT NHÂN VIÊN (Giữ nguyên)
router.post('/employees', protect, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Không tìm thấy file' });
    }
    try {
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);

        if (data.length === 0) {
            return res.status(400).json({ message: 'File Excel rỗng' });
        }
        const query = `
            INSERT INTO Employees (SourceEmployeeID, FullName, UserGroupID)
            VALUES ?
            ON DUPLICATE KEY UPDATE
                FullName = VALUES(FullName),
                UserGroupID = VALUES(UserGroupID)
        `;
        const values = data.map(row => [
            row.SourceEmployeeID,
            row.FullName,
            row.UserGroupID
        ]);
        await db.query(query, [values]);
        res.json({
            message: `Import và gán thành công ${data.length} nhân viên.`,
            totalRows: data.length
        });
    } catch (err) {
        console.error('Lỗi import nhân viên:', err);
        res.status(500).json({
            message: 'Lỗi server khi import. Hãy chắc chắn file Excel có 3 cột: "SourceEmployeeID", "FullName", và "UserGroupID"',
            error: err.message
        });
    }
});

// API 2: IMPORT CHẤM CÔNG (ĐÃ CẬP NHẬT ĐỂ LỌC THEO EVENT)
// POST /api/import/attendance
router.post('/attendance', protect, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Không tìm thấy file' });
    }

    try {
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        // Đọc cả cột 'Event'
        const data = xlsx.utils.sheet_to_json(worksheet, { cellDates: true });

        if (data.length === 0) {
            return res.status(400).json({ message: 'File rỗng' });
        }

        // --- THAY ĐỔI CHÍNH Ở ĐÂY ---
        // 1. Lọc theo cả 4 cột: ID, Time, Access Point, VÀ Event
        const validData = data.filter(row =>
            row.ID &&
            row.Time &&
            row['Access Point'] &&
            row.Event === 'Valid Face Unlock' // <-- THÊM ĐIỀU KIỆN LỌC MỚI
        );
        // --- KẾT THÚC THAY ĐỔI (PHẦN 1) ---

        if (validData.length === 0) {
            return res.status(400).json({
                message: 'File không có dữ liệu "Valid Face Unlock" hợp lệ (thiếu "ID", "Time", hoặc "Access Point").'
            });
        }

        const query = `
            INSERT INTO RawAttendanceLogs (SourceEmployeeID, CheckTime, AccessPoint)
            VALUES ?
        `;

        // 2. Map dữ liệu đã lọc (không đổi)
        const values = validData.map(row => [
            row.ID,
            row.Time,
            row['Access Point']
        ]);

        await db.query(query, [values]);

        res.json({
            // Cập nhật thông báo
            message: `Import thành công ${validData.length} lượt "Valid Face Unlock" (đã bỏ qua ${data.length - validData.length} dòng khác/lỗi).`,
            totalRows: validData.length
        });

    } catch (err) {
        console.error('Lỗi import chấm công chi tiết:', err.message);
         res.status(500).json({
            // Cập nhật thông báo lỗi
            message: 'Lỗi server khi import file. Hãy chắc chắn file có cột "ID", "Time", "Access Point" và "Event".',
            error: err.message
        });
    }
});

module.exports = router;