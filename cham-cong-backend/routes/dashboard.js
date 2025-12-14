const express = require('express');
const db = require('../db.js');
const jwt = require('jsonwebtoken');
const router = express.Router();

// --- MIDDLEWARE (Giữ nguyên) ---
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET || 'CHAM_CONG_SECRET_KEY', (err, decoded) => {
        if (err) return res.sendStatus(403);
        req.user = decoded;
        next();
    });
}

// --- HÀM ĐỆ QUY (Giữ nguyên) ---
async function getRecursiveSubGroupIDs(rootGroupId) {
    let groupIds = [rootGroupId];
    const [children] = await db.query('SELECT UserGroupID FROM UserGroups WHERE ParentGroupID = ?', [rootGroupId]);
    for (const child of children) {
        const subIds = await getRecursiveSubGroupIDs(child.UserGroupID);
        groupIds = [...groupIds, ...subIds];
    }
    return [...new Set(groupIds)];
}

// --- API DASHBOARD (NÂNG CẤP) ---
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const { id, role } = req.user; 
        if (!id) return res.status(400).json({ message: 'Token lỗi' });

        let targetGroups = [];
        if (role === 'admin') {
            const [allGroups] = await db.query('SELECT UserGroupID, GroupName FROM UserGroups ORDER BY UserGroupID ASC');
            targetGroups = allGroups;
        } else {
            const [users] = await db.query('SELECT UserGroupID FROM Users WHERE UserID = ?', [id]);
            if (users.length === 0) return res.json([]);
            const rootGroupId = users[0].UserGroupID;
            if (rootGroupId) {
                const allRelatedIds = await getRecursiveSubGroupIDs(rootGroupId);
                const [groups] = await db.query('SELECT UserGroupID, GroupName FROM UserGroups WHERE UserGroupID IN (?)', [allRelatedIds]);
                targetGroups = groups;
            }
        }

        if (targetGroups.length === 0) return res.json([]);

        // --- TÍNH TOÁN SỐ LIỆU MỚI ---
        const today = new Date();
        const dateString = today.toLocaleDateString('en-CA'); // YYYY-MM-DD
        
        // GIỜ CHUẨN ĐỂ TÍNH ĐI MUỘN (Ví dụ: 8 giờ sáng)
        // Sau này nên lấy từ DB ra thay vì fix cứng
        const STANDARD_START_TIME = '08:00:00';

        const results = [];

        await Promise.all(targetGroups.map(async (group) => {
            const scopeIds = await getRecursiveSubGroupIDs(group.UserGroupID);
            
            // 1. Tổng nhân sự
            const [totalRows] = await db.query(`SELECT COUNT(*) as Total FROM Employees WHERE UserGroupID IN (?)`, [scopeIds]);
            const totalStaff = totalRows[0].Total;

            // 2. Đếm số người ĐÃ ĐẾN (Có check-in)
            const [presentRows] = await db.query(`
                SELECT COUNT(*) as Present
                FROM DailyAttendance da
                JOIN Employees e ON da.EmployeeID = e.EmployeeID
                WHERE da.WorkDate = ? 
                AND da.FirstCheckIn IS NOT NULL
                AND e.UserGroupID IN (?)
            `, [dateString, scopeIds]);
            const presentCount = presentRows[0].Present;

            // 3. Đếm số người ĐI MUỘN (Check-in sau giờ chuẩn)
            // Lưu ý: Người đi muộn VẪN NẰM TRONG số người đã đến
            const [lateRows] = await db.query(`
                SELECT COUNT(*) as Late
                FROM DailyAttendance da
                JOIN Employees e ON da.EmployeeID = e.EmployeeID
                WHERE da.WorkDate = ? 
                AND da.FirstCheckIn > ? -- So sánh giờ
                AND e.UserGroupID IN (?)
            `, [dateString, STANDARD_START_TIME, scopeIds]);
            const lateCount = lateRows[0].Late;

            const absentCount = Math.max(0, totalStaff - presentCount);
            // Phần trăm người đã đến (so với tổng số)
            const percentPresent = totalStaff > 0 ? Math.round((presentCount / totalStaff) * 100) : 0;

            results.push({
                groupId: group.UserGroupID,
                name: group.GroupName,
                total: totalStaff,
                present: presentCount,
                absent: absentCount,
                late: lateCount, // Thêm trường này
                percent: percentPresent
            });
        }));

        results.sort((a, b) => a.groupId - b.groupId);
        res.json(results);

    } catch (err) {
        console.error('🔥 SQL ERROR:', err.sqlMessage || err.message);
        res.status(500).json({ message: 'Lỗi Server' });
    }
});

module.exports = router;