const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db.js'); // Dùng ../ vì chúng ta ở trong thư mục con

const router = express.Router();

// API 1: TẠO TÀI KHOẢN (cho Admin)
// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { username, password, roleID, userGroupID } = req.body;

    // 1. Kiểm tra xem các trường có bị thiếu không
    if (!username || !password || !roleID || !userGroupID) {
        return res.status(400).json({ message: 'Vui lòng điền đủ thông tin' });
    }

    try {
        // 2. Mã hóa mật khẩu
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Lấy RoleName và GroupName để kiểm tra
        const [roles] = await db.query('SELECT RoleName FROM Roles WHERE RoleID = ?', [roleID]);
        const [groups] = await db.query('SELECT GroupName FROM UserGroups WHERE UserGroupID = ?', [userGroupID]);

        if (roles.length === 0 || groups.length === 0) {
             return res.status(404).json({ message: 'RoleID hoặc UserGroupID không tồn tại' });
        }

        // 4. Lưu vào CSDL
        const query = `
            INSERT INTO Users (Username, HashedPassword, RoleID, UserGroupID)
            VALUES (?, ?, ?, ?)
        `;
        await db.query(query, [username, hashedPassword, roleID, userGroupID]);

        res.status(201).json({ 
            message: 'Tạo tài khoản thành công',
            username: username,
            role: roles[0].RoleName,
            group: groups[0].GroupName
        });

    } catch (err) {
        // Lỗi nếu trùng username
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Username đã tồn tại' });
        }
        res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
});


// API 2: ĐĂNG NHẬP
// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Vui lòng nhập username và password' });
    }

    try {
        // 1. Tìm người dùng trong CSDL (và JOIN để lấy tên Role)
        const query = `
            SELECT Users.*, Roles.RoleName 
            FROM Users 
            JOIN Roles ON Users.RoleID = Roles.RoleID 
            WHERE Users.Username = ?
        `;
        const [users] = await db.query(query, [username]);

        // 2. Kiểm tra xem user có tồn tại không
        if (users.length === 0) {
            return res.status(401).json({ message: 'Username hoặc password không đúng' });
        }

        const user = users[0];

        // 3. So sánh mật khẩu người dùng gõ với mật khẩu đã mã hóa trong DB
        const isMatch = await bcrypt.compare(password, user.HashedPassword);

        if (!isMatch) {
            return res.status(401).json({ message: 'Username hoặc password không đúng' });
        }

        // 4. Nếu đúng -> Tạo "Thẻ bài" (Token)
        const payload = {
            userID: user.UserID,
            username: user.Username,
            role: user.RoleName,
            userGroupID: user.UserGroupID
        };

        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET, // Chìa khóa bí mật từ .env
            { expiresIn: '1d' } // Token có hạn sử dụng 1 ngày
        );

        // 5. Trả Token về cho React
        res.json({
            message: 'Đăng nhập thành công',
            token: token,
            user: payload // Gửi kèm thông tin user
        });

    } catch (err) {
        res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
});


module.exports = router; // Xuất router này ra