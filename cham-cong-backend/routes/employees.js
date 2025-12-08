const express = require('express');
const db = require('../db.js');
const { protect } = require('../middleware/authMiddleware.js');

const router = express.Router();

// Hàm trợ giúp (Không đổi)
const getAllowedGroupIDs = async (userGroupID) => {
    const [userGroupInfo] = await db.query('SELECT ParentGroupID FROM UserGroups WHERE UserGroupID = ?', [userGroupID]);
    if (userGroupInfo.length === 0) return [];
    if (userGroupInfo[0].ParentGroupID === null) {
        const [subGroups] = await db.query('SELECT UserGroupID FROM UserGroups WHERE ParentGroupID = ?', [userGroupID]);
        return [userGroupID, ...subGroups.map(g => g.UserGroupID)];
    } else {
        return [userGroupID];
    }
};

// API 1: (READ) LẤY DANH SÁCH NHÂN VIÊN (SỬA LOGIC LỌC)
router.get('/', protect, async (req, res) => {
    try {
        const { userGroupID, role } = req.user;
        const { groupID: queryGroupID } = req.query; // groupID từ frontend

        let query = `
            SELECT
                e.EmployeeID,
                e.SourceEmployeeID,
                e.FullName,
                ug.GroupName
            FROM Employees AS e
            LEFT JOIN UserGroups AS ug ON e.UserGroupID = ug.UserGroupID
        `;
        const params = [];
        let whereConditions = [];

        // --- SỬA LOGIC LỌC NHÓM ---
        if (role === 'Admin') {
            if (queryGroupID && queryGroupID !== 'all') {
                // Admin lọc nhóm cụ thể (cha hoặc con)
                const targetGroupID = parseInt(queryGroupID);
                whereConditions.push('e.UserGroupID = ?'); // Chỉ lấy đúng nhóm đó
                params.push(targetGroupID);
            }
            // Nếu Admin chọn 'all', không lọc theo nhóm
        } else { // User thường (Cha hoặc Con)
            const allowedIDs = await getAllowedGroupIDs(userGroupID); // Lấy các ID được phép xem

            if (allowedIDs.length > 0) {
                 const [userGroupInfo] = await db.query('SELECT ParentGroupID FROM UserGroups WHERE UserGroupID = ?', [userGroupID]);
                 const isParentGroupLeader = userGroupInfo[0]?.ParentGroupID === null;

                 // Kiểm tra xem user có đang lọc không (queryGroupID khác giá trị mặc định)
                 const isFiltering = queryGroupID && queryGroupID !== String(userGroupID);

                 if (isParentGroupLeader && isFiltering) {
                      // Trưởng nhóm cha đang lọc
                      if (queryGroupID === (userGroupID + '_only')) {
                           // Lọc chỉ nhóm cha
                           whereConditions.push('e.UserGroupID = ?');
                           params.push(userGroupID);
                      } else {
                           // Lọc nhóm con cụ thể (phải kiểm tra xem có thuộc quyền ko)
                           const targetChildID = parseInt(queryGroupID);
                           if (allowedIDs.includes(targetChildID) && targetChildID !== userGroupID) {
                                whereConditions.push('e.UserGroupID = ?');
                                params.push(targetChildID);
                           } else {
                                // Nếu chọn nhóm không hợp lệ -> trả rỗng
                                whereConditions.push('1 = 0');
                           }
                      }
                 } else {
                      // User không lọc HOẶC là nhóm con -> Lấy theo allowedIDs
                      whereConditions.push(`e.UserGroupID IN (?)`);
                      params.push(allowedIDs);
                 }
            } else {
                whereConditions.push('1 = 0'); // Không có quyền xem nhóm nào
            }
        }
        // --- KẾT THÚC SỬA LOGIC LỌC NHÓM ---


        if (whereConditions.length > 0) {
             query += ' WHERE ' + whereConditions.join(' AND ');
        }

        query += ' ORDER BY ug.GroupName ASC, e.FullName ASC';

        const [employees] = await db.query(query, params);
        res.json(employees);

    } catch (err) {
        console.error('Lỗi lấy danh sách nhân viên:', err);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// API 2: (CREATE) THÊM MỚI (Giữ nguyên)
router.post('/', protect, async (req, res) => { /* ... */ });
 router.post('/', protect, async (req, res) => {
     const { SourceEmployeeID, FullName } = req.body;
     const userGroupID = req.user.userGroupID;
     if (!SourceEmployeeID || !FullName) return res.status(400).json({ message: 'Vui lòng điền đủ Mã NV và Họ tên' });
      try {
        const [existing] = await db.query('SELECT EmployeeID FROM Employees WHERE SourceEmployeeID = ?', [SourceEmployeeID]);
        if (existing.length > 0) return res.status(400).json({ message: 'Mã nhân viên này đã tồn tại' });
        const query = 'INSERT INTO Employees (SourceEmployeeID, FullName, UserGroupID) VALUES (?, ?, ?)';
        const [result] = await db.query(query, [SourceEmployeeID, FullName, userGroupID]);
        res.status(201).json({ message: 'Thêm nhân viên thành công', newEmployee: { EmployeeID: result.insertId, SourceEmployeeID, FullName } });
    } catch (err) { console.error(err); res.status(500).json({ message: 'Lỗi server' }); }
});


// API 3: (UPDATE) SỬA NHÂN VIÊN (Giữ nguyên)
router.put('/:id', protect, async (req, res) => { /* ... */ });
 router.put('/:id', protect, async (req, res) => {
    const { id } = req.params;
    const { SourceEmployeeID, FullName, UserGroupID: newUserGroupID } = req.body;
    const { userGroupID, role } = req.user;
    if (!SourceEmployeeID || !FullName || !newUserGroupID) return res.status(400).json({ message: 'Vui lòng điền đủ Mã NV, Họ tên và chọn Nhóm mới' });
    try {
        const [existing] = await db.query('SELECT EmployeeID FROM Employees WHERE SourceEmployeeID = ? AND EmployeeID != ?', [SourceEmployeeID, id]);
        if (existing.length > 0) return res.status(400).json({ message: 'Mã nhân viên này đã bị trùng với một người khác' });
        const [groupExists] = await db.query('SELECT UserGroupID FROM UserGroups WHERE UserGroupID = ?', [newUserGroupID]);
        if (groupExists.length === 0) return res.status(400).json({ message: 'Nhóm mới được chọn không hợp lệ.' });
        let query = 'UPDATE Employees SET SourceEmployeeID = ?, FullName = ?, UserGroupID = ? WHERE EmployeeID = ?';
        const params = [SourceEmployeeID, FullName, newUserGroupID, id];
        if (role !== 'Admin') {
            const allowedIDs = await getAllowedGroupIDs(userGroupID);
            if (allowedIDs.length > 0) {
                query += ` AND UserGroupID IN (?)`; // Kiểm tra nhóm CŨ
                params.push(allowedIDs);
                 if (!allowedIDs.includes(parseInt(newUserGroupID))) return res.status(403).json({ message: 'Bạn không có quyền chuyển nhân viên sang nhóm này.' });
            } else { query += ' AND 1 = 0'; }
        }
        const [result] = await db.query(query, params);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Không tìm thấy nhân viên hoặc bạn không có quyền sửa' });
        res.json({ message: 'Cập nhật nhân viên thành công' });
    } catch (err) { console.error(err); res.status(500).json({ message: 'Lỗi server' }); }
});


// API 4: (DELETE) XÓA KHỎI NHÓM (Giữ nguyên)
router.put('/remove/:id', protect, async (req, res) => { /* ... */ });
 router.put('/remove/:id', protect, async (req, res) => {
    const { id } = req.params;
    const { userGroupID, role } = req.user;
    try {
        let query = 'UPDATE Employees SET UserGroupID = NULL WHERE EmployeeID = ?';
        const params = [id];
        if (role !== 'Admin') {
            const allowedIDs = await getAllowedGroupIDs(userGroupID);
            if (allowedIDs.length > 0) { query += ` AND UserGroupID IN (?)`; params.push(allowedIDs); }
            else { query += ' AND 1 = 0'; }
        }
        const [result] = await db.query(query, params);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Không tìm thấy nhân viên hoặc bạn không có quyền xóa' });
        res.json({ message: 'Xóa nhân viên khỏi nhóm thành công' });
    } catch (err) { console.error(err); res.status(500).json({ message: 'Lỗi server' }); }
});


module.exports = router;