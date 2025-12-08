const express = require('express');
const db = require('../db.js');
const { protect } = require('../middleware/authMiddleware.js');

const router = express.Router();

// API 1: XỬ LÝ DỮ LIỆU THÔ (Giữ nguyên)
router.post('/process', protect, async (req, res) => { /* ... Giữ nguyên code ... */
     try {
        const processQuery = `
            DELETE FROM DailyAttendance;
            INSERT INTO DailyAttendance (EmployeeID, WorkDate, FirstCheckIn, LastCheckOut)
            WITH RankedLogs AS (
                 SELECT
                    e.EmployeeID, DATE(r.CheckTime) AS WorkDate, r.CheckTime, ap.ActivityType,
                    ROW_NUMBER() OVER(PARTITION BY e.EmployeeID, DATE(r.CheckTime) ORDER BY r.CheckTime ASC) AS rn_asc,
                    ROW_NUMBER() OVER(PARTITION BY e.EmployeeID, DATE(r.CheckTime) ORDER BY r.CheckTime DESC) AS rn_desc,
                    ROW_NUMBER() OVER(PARTITION BY e.EmployeeID, DATE(r.CheckTime) ORDER BY CASE WHEN ap.ActivityType = 'In' THEN 1 ELSE 2 END ASC, r.CheckTime ASC) AS rn_in_asc,
                    ROW_NUMBER() OVER(PARTITION BY e.EmployeeID, DATE(r.CheckTime) ORDER BY CASE WHEN ap.ActivityType = 'Out' THEN r.CheckTime ELSE NULL END DESC) AS rn_out_desc
                FROM RawAttendanceLogs AS r JOIN Employees AS e ON r.SourceEmployeeID = e.SourceEmployeeID JOIN AccessPoints AS ap ON r.AccessPoint = ap.AccessPointName
                WHERE e.UserGroupID IS NOT NULL AND ap.ActivityType != 'Other'
            ),
            FinalLogs AS (
                SELECT
                    EmployeeID, WorkDate,
                    MAX(CASE WHEN rn_in_asc = 1 THEN TIME(CheckTime) ELSE NULL END) AS EarliestInTime,
                    MAX(CASE WHEN rn_out_desc = 1 THEN TIME(CheckTime) ELSE NULL END) AS LastValidCheckOut,
                    MAX(CASE WHEN rn_asc = 1 THEN ActivityType ELSE NULL END) AS FirstActivityType,
                    MAX(CASE WHEN rn_desc = 1 THEN ActivityType ELSE NULL END) AS LastActivityType
                FROM RankedLogs GROUP BY EmployeeID, WorkDate
            )
            SELECT EmployeeID, WorkDate, CASE WHEN FirstActivityType = 'In' THEN EarliestInTime ELSE NULL END AS FirstCheckIn, CASE WHEN LastActivityType = 'Out' THEN LastValidCheckOut ELSE NULL END AS LastCheckOut FROM FinalLogs;
        `;
        const [result] = await db.query(processQuery, [], { multipleStatements: true });
        const affectedRows = result[1] ? result[1].affectedRows : 0;
        res.json({ message: `Xử lý dữ liệu chấm công thành công (logic mới)!`, affectedRows: affectedRows });
    } catch (err) {
        console.error('Lỗi xử lý chấm công (logic mới):', err);
        res.status(500).json({ message: 'Lỗi server khi xử lý dữ liệu', error: err.message });
    }
});


// API 2: LẤY DỮ LIỆU ĐÃ XỬ LÝ (SỬA LOGIC LỌC NHÓM)
router.get('/', protect, async (req, res) => {
    const { userGroupID, role } = req.user;
    const { startDate, endDate, groupID: queryGroupID } = req.query; // groupID từ frontend

    try {
        let query = `
            SELECT
                DATE_FORMAT(da.WorkDate, '%Y-%m-%d') AS WorkDate,
                e.FullName,
                ug.GroupName,
                da.FirstCheckIn,
                da.LastCheckOut
            FROM
                DailyAttendance AS da
            JOIN
                Employees AS e ON da.EmployeeID = e.EmployeeID
            LEFT JOIN
                UserGroups AS ug ON e.UserGroupID = ug.UserGroupID
        `;

        const params = [];
        let whereConditions = [];
        let filterSpecificGroups = false; // Cờ để biết có đang lọc nhóm cụ thể không

        // --- SỬA LOGIC LỌC NHÓM ---
        if (role === 'Admin') {
            if (queryGroupID && queryGroupID !== 'all') {
                const targetGroupID = parseInt(queryGroupID.split('_')[0]); // Lấy ID gốc
                 // Admin chọn nhóm cha (không có _only) -> lấy cha + con
                if (!queryGroupID.includes('_only') && (await db.query('SELECT ParentGroupID FROM UserGroups WHERE UserGroupID = ?', [targetGroupID]))[0][0]?.ParentGroupID === null) {
                     whereConditions.push('(e.UserGroupID = ? OR e.UserGroupID IN (SELECT UserGroupID FROM UserGroups WHERE ParentGroupID = ?))');
                     params.push(targetGroupID, targetGroupID);
                } else { // Admin chọn nhóm con hoặc nhóm cha có _only
                     whereConditions.push('e.UserGroupID = ?');
                     params.push(targetGroupID);
                }
                filterSpecificGroups = true;
            }
            // Nếu Admin chọn 'all', không thêm điều kiện lọc nhóm
        } else { // User thường
            const [userGroupInfo] = await db.query('SELECT ParentGroupID FROM UserGroups WHERE UserGroupID = ?', [userGroupID]);
            if (userGroupInfo.length > 0) {
                const isParentGroup = userGroupInfo[0].ParentGroupID === null;

                if (isParentGroup) { // User là trưởng nhóm cha
                    if (queryGroupID && queryGroupID !== 'all' && queryGroupID !== String(userGroupID)) { // Chọn lọc nhóm con cụ thể
                         // Kiểm tra xem nhóm con đó có thực sự thuộc nhóm cha không
                         const [childCheck] = await db.query('SELECT UserGroupID FROM UserGroups WHERE UserGroupID = ? AND ParentGroupID = ?', [parseInt(queryGroupID), userGroupID]);
                         if (childCheck.length > 0) {
                             whereConditions.push('e.UserGroupID = ?');
                             params.push(parseInt(queryGroupID));
                             filterSpecificGroups = true;
                         } else { // Nếu chọn nhóm con không hợp lệ -> trả rỗng
                             whereConditions.push('1 = 0');
                         }
                    } else if (queryGroupID && queryGroupID === (userGroupID + '_only')) { // Chọn chỉ xem nhóm cha
                         whereConditions.push('e.UserGroupID = ?');
                         params.push(userGroupID);
                         filterSpecificGroups = true;
                    } else { // Mặc định hoặc chọn "Nhóm của tôi & Con"
                         whereConditions.push('(e.UserGroupID = ? OR e.UserGroupID IN (SELECT UserGroupID FROM UserGroups WHERE ParentGroupID = ?))');
                         params.push(userGroupID, userGroupID);
                         // Không set filterSpecificGroups vì đây là view mặc định
                    }
                } else { // User là trưởng nhóm con
                    whereConditions.push('e.UserGroupID = ?');
                    params.push(userGroupID);
                    filterSpecificGroups = true; // Luôn lọc theo nhóm con
                }
            } else { whereConditions.push('1 = 0'); } // Không tìm thấy nhóm user
        }
        // --- KẾT THÚC SỬA LOGIC LỌC NHÓM ---

        // Lọc theo ngày (giữ nguyên)
        if (startDate && endDate) {
            whereConditions.push('da.WorkDate BETWEEN ? AND ?');
            params.push(startDate, endDate);
        }

        if (whereConditions.length > 0) {
            query += ' WHERE ' + whereConditions.join(' AND ');
        }

        query += ' ORDER BY da.WorkDate DESC, e.FullName ASC';

        const [results] = await db.query(query, params);
        res.json(results);

    } catch (err) {
        console.error('Lỗi lấy dữ liệu chấm công:', err);
        res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
});

module.exports = router;