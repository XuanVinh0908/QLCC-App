const express = require('express');
const db = require('../db.js');
const { protect } = require('../middleware/authMiddleware.js');

const router = express.Router();

// API: LẤY DỮ LIỆU GIÁM SÁT RA/VÀO (SỬA LOGIC LỌC NHÓM)
router.get('/', protect, async (req, res) => {
    const { userGroupID, role } = req.user;
    const { startDate, endDate, groupID: queryGroupID } = req.query;

    try {
        let query = `
            SELECT
                DATE_FORMAT(r.CheckTime, '%Y-%m-%d %H:%i:%s') AS CheckTime,
                e.FullName,
                ug.GroupName,
                r.AccessPoint,
                CASE ap.ActivityType WHEN 'In' THEN 'Đi Vào' WHEN 'Out' THEN 'Đi Ra' ELSE 'Khác' END AS ActivityType
            FROM RawAttendanceLogs AS r
            JOIN Employees AS e ON r.SourceEmployeeID = e.SourceEmployeeID
            LEFT JOIN UserGroups AS ug ON e.UserGroupID = ug.UserGroupID
            LEFT JOIN AccessPoints AS ap ON r.AccessPoint = ap.AccessPointName
        `;

        const params = [];
        let whereConditions = [];
        let filterSpecificGroups = false;

        // --- SỬA LOGIC LỌC NHÓM (Tương tự attendance.js) ---
        if (role === 'Admin') {
            if (queryGroupID && queryGroupID !== 'all') {
                const targetGroupID = parseInt(queryGroupID.split('_')[0]);
                if (!queryGroupID.includes('_only') && (await db.query('SELECT ParentGroupID FROM UserGroups WHERE UserGroupID = ?', [targetGroupID]))[0][0]?.ParentGroupID === null) {
                     whereConditions.push('(e.UserGroupID = ? OR e.UserGroupID IN (SELECT UserGroupID FROM UserGroups WHERE ParentGroupID = ?))');
                     params.push(targetGroupID, targetGroupID);
                } else {
                     whereConditions.push('e.UserGroupID = ?');
                     params.push(targetGroupID);
                }
                filterSpecificGroups = true;
            }
        } else { // User thường
             const [userGroupInfo] = await db.query('SELECT ParentGroupID FROM UserGroups WHERE UserGroupID = ?', [userGroupID]);
             if (userGroupInfo.length > 0) {
                 const isParentGroup = userGroupInfo[0].ParentGroupID === null;
                 if (isParentGroup) {
                     if (queryGroupID && queryGroupID !== 'all' && queryGroupID !== String(userGroupID)) {
                          const [childCheck] = await db.query('SELECT UserGroupID FROM UserGroups WHERE UserGroupID = ? AND ParentGroupID = ?', [parseInt(queryGroupID), userGroupID]);
                          if (childCheck.length > 0) {
                              whereConditions.push('e.UserGroupID = ?');
                              params.push(parseInt(queryGroupID));
                              filterSpecificGroups = true;
                          } else { whereConditions.push('1 = 0'); }
                     } else if (queryGroupID && queryGroupID === (userGroupID + '_only')) {
                          whereConditions.push('e.UserGroupID = ?');
                          params.push(userGroupID);
                          filterSpecificGroups = true;
                     } else {
                          whereConditions.push('(e.UserGroupID = ? OR e.UserGroupID IN (SELECT UserGroupID FROM UserGroups WHERE ParentGroupID = ?))');
                          params.push(userGroupID, userGroupID);
                     }
                 } else { // User là trưởng nhóm con
                     whereConditions.push('e.UserGroupID = ?');
                     params.push(userGroupID);
                     filterSpecificGroups = true;
                 }
             } else { whereConditions.push('1 = 0'); }
        }
        // --- KẾT THÚC SỬA LOGIC LỌC NHÓM ---

        // Lọc theo ngày/giờ (giữ nguyên)
        if (startDate && endDate) {
            whereConditions.push('r.CheckTime BETWEEN ? AND ?');
            params.push(startDate, endDate);
        }

        if (whereConditions.length > 0) {
            query += ' WHERE ' + whereConditions.join(' AND ');
        }

        query += ' ORDER BY r.CheckTime DESC';

        const [results] = await db.query(query, params);
        res.json(results);

    } catch (err) {
        console.error('Lỗi lấy dữ liệu giám sát:', err);
        res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
});

module.exports = router;