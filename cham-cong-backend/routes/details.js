const express = require('express');
const router = express.Router();
const db = require('../db'); 

// --- SỬA LỖI Ở DÒNG NÀY ---
// Thay vì import từ './auth', hãy import từ middleware chuẩn của bạn
const { protect } = require('../middleware/authMiddleware.js');

// 1. Lấy danh sách phòng ban con (Sửa verifyToken -> protect)
router.get('/by-group/:groupId', protect, async (req, res) => {
    try {
        const { groupId } = req.params;
        const [rows] = await db.query(
            'SELECT * FROM detail_groupuser WHERE UserGroupID = ? ORDER BY DetailName ASC', 
            [groupId]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// 2. Thêm mới phòng ban con (Sửa verifyToken -> protect)
// Lưu ý: Tôi bỏ 'isAdmin' middleware vì có thể file authMiddleware của bạn không export nó.
// Thay vào đó, ta check thủ công bên trong hàm.
router.post('/', protect, async (req, res) => {
    try {
        // Check quyền Admin thủ công (cho an toàn giống logic employees.js)
        if (req.user.role !== 'Admin' && req.user.roleID !== 1) {
            return res.status(403).json({ message: 'Chỉ Admin mới được thêm phòng ban' });
        }

        const { UserGroupID, DetailName, Description } = req.body;
        
        if (!UserGroupID || !DetailName) {
            return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
        }

        const [result] = await db.query(
            'INSERT INTO detail_groupuser (UserGroupID, DetailName, Description) VALUES (?, ?, ?)',
            [UserGroupID, DetailName, Description]
        );

        res.status(201).json({ 
            message: 'Thêm phòng ban thành công', 
            DetailID: result.insertId 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// 3. Xóa phòng ban
router.delete('/:id', protect, async (req, res) => {
    try {
        if (req.user.role !== 'Admin' && req.user.roleID !== 1) {
            return res.status(403).json({ message: 'Không có quyền' });
        }
        await db.query('DELETE FROM detail_groupuser WHERE DetailID = ?', [req.params.id]);
        res.json({ message: 'Đã xóa phòng ban' });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server' });
    }
});

module.exports = router;