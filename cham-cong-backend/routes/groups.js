const express = require('express');
const db = require('../db.js');
const { protect } = require('../middleware/authMiddleware.js');
const multer = require('multer');
const xlsx = require('xlsx');

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// API 1: LẤY TẤT CẢ NHÓM (Cập nhật để JOIN lấy tên nhóm cha)
router.get('/', protect, async (req, res) => {
    try {
        // JOIN với chính nó để lấy tên nhóm cha
        const query = `
            SELECT 
                g.UserGroupID, 
                g.GroupName, 
                g.ParentGroupID, 
                p.GroupName AS ParentGroupName 
            FROM UserGroups AS g
            LEFT JOIN UserGroups AS p ON g.ParentGroupID = p.UserGroupID
            ORDER BY g.GroupName ASC
        `;
        const [groups] = await db.query(query);
        res.json(groups);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// API 2: TẠO NHÓM THỦ CÔNG (Cập nhật để nhận ParentGroupID)
router.post('/', protect, async (req, res) => {
    // Thêm ParentGroupID (có thể là null)
    const { groupName, parentGroupID } = req.body; 

    if (!groupName) {
        return res.status(400).json({ message: 'Vui lòng nhập tên nhóm' });
    }

    try {
        const [existing] = await db.query('SELECT * FROM UserGroups WHERE GroupName = ?', [groupName]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Tên nhóm đã tồn tại' });
        }

        // Nếu parentGroupID rỗng, chuyển thành NULL
        const finalParentId = parentGroupID ? parseInt(parentGroupID) : null;

        // Thêm ParentGroupID vào câu lệnh INSERT
        const query = 'INSERT INTO UserGroups (GroupName, ParentGroupID) VALUES (?, ?)';
        const [result] = await db.query(query, [groupName, finalParentId]);
        
        res.status(201).json({
            message: 'Tạo nhóm thành công',
            newGroup: {
                UserGroupID: result.insertId,
                GroupName: groupName,
                ParentGroupID: finalParentId
            }
        });

    } catch (err) {
        console.error(err);
        // Bắt lỗi khóa ngoại nếu ParentGroupID không tồn tại
        if (err.code === 'ER_NO_REFERENCED_ROW_2') {
             return res.status(400).json({ message: 'Nhóm cha được chọn không hợp lệ.' });
        }
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// API 3: IMPORT NHÓM TỪ EXCEL (Giữ nguyên)
router.post('/import', protect, upload.single('file'), async (req, res) => {
    // ... (Code import giữ nguyên, không hỗ trợ ParentGroupID qua Excel) ...
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
            INSERT INTO UserGroups (GroupName) VALUES ?
            ON DUPLICATE KEY UPDATE GroupName = VALUES(GroupName) 
        `;
        const values = data.map(row => [row.GroupName]);
        const [result] = await db.query(query, [values]);
        res.json({ 
            message: `Import thành công. ${result.affectedRows} nhóm được thêm/cập nhật.`,
            totalRows: data.length 
        });
    } catch (err) {
        console.error('Lỗi import nhóm:', err);
        res.status(500).json({ 
            message: 'Lỗi server khi import. Hãy chắc chắn file Excel có cột "GroupName"', 
            error: err.message 
        });
    }
});

// API 4: (MỚI) SỬA NHÓM
// PUT /api/groups/:id
router.put('/:id', protect, async (req, res) => {
    const { id } = req.params;
    const { groupName, parentGroupID } = req.body;

    if (!groupName) {
        return res.status(400).json({ message: 'Tên nhóm không được để trống' });
    }
    // Ngăn tự gán làm cha của chính mình
    if (parentGroupID && parseInt(parentGroupID) === parseInt(id)) {
        return res.status(400).json({ message: 'Không thể chọn chính nhóm này làm nhóm cha.' });
    }

    try {
        // Kiểm tra trùng tên (trừ chính nó ra)
        const [existing] = await db.query('SELECT * FROM UserGroups WHERE GroupName = ? AND UserGroupID != ?', [groupName, id]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Tên nhóm đã tồn tại' });
        }

        const finalParentId = parentGroupID ? parseInt(parentGroupID) : null;

        const query = 'UPDATE UserGroups SET GroupName = ?, ParentGroupID = ? WHERE UserGroupID = ?';
        const [result] = await db.query(query, [groupName, finalParentId, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Không tìm thấy nhóm' });
        }

        res.json({ message: 'Cập nhật nhóm thành công' });

    } catch (err) {
        console.error(err);
         if (err.code === 'ER_NO_REFERENCED_ROW_2') {
             return res.status(400).json({ message: 'Nhóm cha được chọn không hợp lệ.' });
        }
        // Có thể thêm kiểm tra lỗi vòng lặp cha-con ở đây (phức tạp hơn)
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// API 5: (MỚI) XÓA NHÓM
// DELETE /api/groups/:id
router.delete('/:id', protect, async (req, res) => {
    const { id } = req.params;

    try {
        // Bắt đầu transaction để đảm bảo an toàn
        await db.beginTransaction();

        // 1. Kiểm tra xem có nhóm con nào đang trỏ vào không
        const [children] = await db.query('SELECT UserGroupID FROM UserGroups WHERE ParentGroupID = ?', [id]);
        if (children.length > 0) {
            await db.rollback();
            return res.status(400).json({ message: 'Không thể xóa nhóm này vì nó đang là cha của nhóm khác.' });
        }

        // 2. Kiểm tra xem có User nào đang thuộc nhóm này không
        const [users] = await db.query('SELECT UserID FROM Users WHERE UserGroupID = ?', [id]);
        if (users.length > 0) {
            await db.rollback();
            return res.status(400).json({ message: 'Không thể xóa nhóm này vì có tài khoản đang thuộc nhóm.' });
        }
        
        // 3. Kiểm tra xem có Nhân viên nào đang thuộc nhóm này không
        const [employees] = await db.query('SELECT EmployeeID FROM Employees WHERE UserGroupID = ?', [id]);
        if (employees.length > 0) {
             // Thay vì báo lỗi, set UserGroupID của NV về NULL
             await db.query('UPDATE Employees SET UserGroupID = NULL WHERE UserGroupID = ?', [id]);
        }

        // 4. Thực hiện xóa
        const [result] = await db.query('DELETE FROM UserGroups WHERE UserGroupID = ?', [id]);

        if (result.affectedRows === 0) {
            await db.rollback();
            return res.status(404).json({ message: 'Không tìm thấy nhóm' });
        }

        // Thành công -> commit transaction
        await db.commit();
        res.json({ message: 'Xóa nhóm thành công' });

    } catch (err) {
        await db.rollback(); // Rollback nếu có lỗi
        console.error(err);
        res.status(500).json({ message: 'Lỗi server' });
    }
});


module.exports = router;