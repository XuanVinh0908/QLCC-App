const express = require('express');
const db = require('../db.js');
const { protect } = require('../middleware/authMiddleware.js');

const router = express.Router();

// --- GIỮ NGUYÊN HÀM TRỢ GIÚP CỦA BẠN ---
const getAllowedGroupIDs = async (userGroupID) => {
    const [userGroupInfo] = await db.query('SELECT ParentGroupID FROM UserGroups WHERE UserGroupID = ?', [userGroupID]);
    if (userGroupInfo.length === 0) return [];
    if (userGroupInfo[0].ParentGroupID === null) {
        // Là nhóm cha -> Lấy chính nó và các nhóm con
        const [subGroups] = await db.query('SELECT UserGroupID FROM UserGroups WHERE ParentGroupID = ?', [userGroupID]);
        return [userGroupID, ...subGroups.map(g => g.UserGroupID)];
    } else {
        // Là nhóm con -> Chỉ lấy chính nó
        return [userGroupID];
    }
};

// --- API 1: (READ) LẤY DANH SÁCH (Đã fix lỗi biến sql/query) ---
router.get('/', protect, async (req, res) => {
    try {
        const { userGroupID, role } = req.user;
        const { groupID: queryGroupID } = req.query; 

        // 1. CÂU SQL CƠ BẢN (Đã thêm Position, DetailID, hex-face)
        let sql = `
            SELECT 
                e.*, 
                g.GroupName,
                d.DetailName, -- Tên phòng ban chi tiết
                e.Position    -- Chức vụ
            FROM employees e
            LEFT JOIN UserGroups g ON e.UserGroupID = g.UserGroupID
            LEFT JOIN detail_groupuser d ON e.DetailID = d.DetailID
        `;
        
        const params = [];
        let whereConditions = [];

        // 2. LOGIC LỌC NHÓM (GIỮ NGUYÊN LOGIC CỦA BẠN)
        if (role === 'Admin') {
            if (queryGroupID && queryGroupID !== 'all') {
                whereConditions.push('e.UserGroupID = ?');
                params.push(parseInt(queryGroupID));
            }
        } else { 
            // User thường
            const allowedIDs = await getAllowedGroupIDs(userGroupID);

            if (allowedIDs.length > 0) {
                 const [userGroupInfo] = await db.query('SELECT ParentGroupID FROM UserGroups WHERE UserGroupID = ?', [userGroupID]);
                 const isParentGroupLeader = userGroupInfo[0]?.ParentGroupID === null;
                 const isFiltering = queryGroupID && queryGroupID !== String(userGroupID);

                 if (isParentGroupLeader && isFiltering) {
                      if (queryGroupID === (userGroupID + '_only')) {
                           whereConditions.push('e.UserGroupID = ?');
                           params.push(userGroupID);
                      } else {
                           const targetChildID = parseInt(queryGroupID);
                           if (allowedIDs.includes(targetChildID) && targetChildID !== userGroupID) {
                                whereConditions.push('e.UserGroupID = ?');
                                params.push(targetChildID);
                           } else {
                                whereConditions.push('1 = 0'); // Không có quyền
                           }
                      }
                 } else {
                      whereConditions.push(`e.UserGroupID IN (?)`);
                      params.push(allowedIDs);
                 }
            } else {
                whereConditions.push('1 = 0'); 
            }
        }

        // 3. NỐI ĐIỀU KIỆN (Fix lỗi biến 'query' thành 'sql')
        if (whereConditions.length > 0) {
             sql += ' WHERE ' + whereConditions.join(' AND ');
        }

        sql += ' ORDER BY g.GroupName ASC, e.FullName ASC';

        const [employees] = await db.query(sql, params);
        res.json(employees);

    } catch (err) {
        console.error('Lỗi lấy danh sách nhân viên:', err);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// --- API 2: (CREATE) THÊM MỚI (Đã bổ sung cột mới) ---
router.post('/', protect, async (req, res) => {
    try {
        // Nhận thêm: Position, DetailID, Gender, Phone, Email, Address, HexFace
        const { 
            SourceEmployeeID, FullName, Position, 
            UserGroupID, DetailID, 
            Gender, Phone, Email, Address, HexFace 
        } = req.body;

        // Nếu User thường không gửi UserGroupID, lấy mặc định của họ
        const finalGroupID = (req.user.role === 'Admin' && UserGroupID) ? UserGroupID : req.user.userGroupID;

        if (!SourceEmployeeID || !FullName) {
            return res.status(400).json({ message: 'Vui lòng điền Mã NV và Họ tên' });
        }

        // Check trùng mã
        const [existing] = await db.query('SELECT EmployeeID FROM employees WHERE SourceEmployeeID = ?', [SourceEmployeeID]);
        if (existing.length > 0) return res.status(400).json({ message: 'Mã nhân viên này đã tồn tại' });

        const sql = `
            INSERT INTO employees 
            (SourceEmployeeID, FullName, Position, UserGroupID, DetailID, Gender, Phone, Email, Address, \`hex-face\`) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const [result] = await db.query(sql, [
            SourceEmployeeID, FullName, 
            Position || null, 
            finalGroupID, 
            DetailID || null, 
            Gender || null, Phone || null, Email || null, Address || null, 
            HexFace || null
        ]);

        res.status(201).json({ 
            message: 'Thêm nhân viên thành công', 
            newEmployee: { EmployeeID: result.insertId, SourceEmployeeID, FullName } 
        });
    } catch (err) { 
        console.error(err); 
        res.status(500).json({ message: 'Lỗi server' }); 
    }
});

// --- API 3: (UPDATE) SỬA NHÂN VIÊN (Đã bổ sung cột mới) ---
router.put('/:id', protect, async (req, res) => {
    const { id } = req.params;
    const { 
        SourceEmployeeID, FullName, Position, 
        UserGroupID: newUserGroupID, DetailID,
        Gender, Phone, Email, Address, HexFace 
    } = req.body;
    
    const { userGroupID, role } = req.user;

    if (!SourceEmployeeID || !FullName || !newUserGroupID) {
        return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
    }

    try {
        // Check trùng mã với người khác
        const [existing] = await db.query('SELECT EmployeeID FROM employees WHERE SourceEmployeeID = ? AND EmployeeID != ?', [SourceEmployeeID, id]);
        if (existing.length > 0) return res.status(400).json({ message: 'Mã nhân viên đã bị trùng' });

        let sql = `
            UPDATE employees SET 
                SourceEmployeeID = ?, 
                FullName = ?, 
                Position = ?, 
                UserGroupID = ?, 
                DetailID = ?,
                Gender = ?, Phone = ?, Email = ?, Address = ?
                -- Lưu ý: Không update hex-face ở đây nếu không gửi lên (để tránh mất dữ liệu)
        `;
        
        const params = [
            SourceEmployeeID, FullName, 
            Position || null, 
            newUserGroupID, 
            DetailID || null,
            Gender || null, Phone || null, Email || null, Address || null
        ];

        // Chỉ update HexFace nếu có gửi lên (để tránh Web làm mất dữ liệu của Tablet)
        if (HexFace !== undefined) {
            sql += `, \`hex-face\` = ?`;
            params.push(HexFace);
        }

        sql += ` WHERE EmployeeID = ?`;
        params.push(id);

        // --- LOGIC PHÂN QUYỀN CŨ (GIỮ NGUYÊN) ---
        if (role !== 'Admin') {
            const allowedIDs = await getAllowedGroupIDs(userGroupID);
            if (allowedIDs.length > 0) {
                // Chỉ được sửa nhân viên thuộc nhóm mình quản lý
                sql += ` AND UserGroupID IN (?)`; 
                // Cần push allowedIDs vào params NHƯNG phải để ý thứ tự params
                // SQL UPDATE có WHERE EmployeeID = ? ở cuối, rồi mới đến AND UserGroupID...
                // Kỹ thuật: Đổi thứ tự WHERE
                
                // (Cách fix đơn giản nhất để query chạy đúng với params):
                // Ta check quyền TRƯỚC khi chạy UPDATE
                if (!allowedIDs.includes(parseInt(newUserGroupID))) {
                    return res.status(403).json({ message: 'Không thể chuyển nhân viên sang nhóm bạn không quản lý' });
                }
                
                // Check xem nhân viên hiện tại có thuộc nhóm quản lý không
                const [currentEmp] = await db.query('SELECT UserGroupID FROM employees WHERE EmployeeID = ?', [id]);
                if (currentEmp.length === 0 || !allowedIDs.includes(currentEmp[0].UserGroupID)) {
                    return res.status(403).json({ message: 'Bạn không có quyền sửa nhân viên này' });
                }
            } else { 
                return res.status(403).json({ message: 'Không có quyền' }); 
            }
        }
        // --- KẾT THÚC LOGIC PHÂN QUYỀN ---

        const [result] = await db.query(sql, params);
        
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Không tìm thấy NV hoặc lỗi cập nhật' });
        res.json({ message: 'Cập nhật thành công' });

    } catch (err) { console.error(err); res.status(500).json({ message: 'Lỗi server' }); }
});

// --- API 4: XÓA NHÂN VIÊN (Dùng DELETE chuẩn thay vì remove khỏi nhóm) ---
router.delete('/:id', protect, async (req, res) => {
    const { id } = req.params;
    const { userGroupID, role } = req.user;

    try {
        let sql = 'DELETE FROM employees WHERE EmployeeID = ?';
        const params = [id];

        if (role !== 'Admin') {
            const allowedIDs = await getAllowedGroupIDs(userGroupID);
            if (allowedIDs.length > 0) {
                sql += ` AND UserGroupID IN (?)`;
                params.push(allowedIDs);
            } else {
                return res.status(403).json({ message: 'Không có quyền xóa' });
            }
        }

        const [result] = await db.query(sql, params);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Không tìm thấy nhân viên hoặc không có quyền xóa' });
        
        res.json({ message: 'Đã xóa nhân viên vĩnh viễn' });
    } catch (err) { console.error(err); res.status(500).json({ message: 'Lỗi server' }); }
});

module.exports = router;