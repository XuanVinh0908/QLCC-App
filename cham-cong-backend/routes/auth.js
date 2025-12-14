const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db.js');

const router = express.Router();

// API 1: TẠO TÀI KHOẢN
router.post('/register', async (req, res) => {
    const { username, password, roleID, userGroupID } = req.body;

    if (!username || !password || !roleID || !userGroupID) {
        return res.status(400).json({ message: 'Vui lòng điền đủ thông tin' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const [roles] = await db.query('SELECT RoleName FROM Roles WHERE RoleID = ?', [roleID]);
        const [groups] = await db.query('SELECT GroupName FROM UserGroups WHERE UserGroupID = ?', [userGroupID]);

        if (roles.length === 0 || groups.length === 0) {
             return res.status(404).json({ message: 'RoleID hoặc UserGroupID không tồn tại' });
        }

        const query = `INSERT INTO Users (Username, HashedPassword, RoleID, UserGroupID) VALUES (?, ?, ?, ?)`;
        await db.query(query, [username, hashedPassword, roleID, userGroupID]);

        res.status(201).json({ 
            message: 'Tạo tài khoản thành công',
            username: username,
            role: roles[0].RoleName,
            group: groups[0].GroupName
        });

    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Username đã tồn tại' });
        }
        res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
});

// API 2: ĐĂNG NHẬP (QUAN TRỌNG: Sửa phần Payload)
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Vui lòng nhập username và password' });
    }

    try {
        const query = `
            SELECT Users.*, Roles.RoleName 
            FROM Users 
            JOIN Roles ON Users.RoleID = Roles.RoleID 
            WHERE Users.Username = ?
        `;
        const [users] = await db.query(query, [username]);

        if (users.length === 0) {
            return res.status(401).json({ message: 'Username hoặc password không đúng' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.HashedPassword);

        if (!isMatch) {
            return res.status(401).json({ message: 'Username hoặc password không đúng' });
        }

        // --- SỬA Ở ĐÂY ---
        const payload = {
            id: user.UserID,      // <--- Đổi userID thành id
            username: user.Username,
            role: user.RoleName,  // <--- Giữ nguyên role
            userGroupID: user.UserGroupID
        };

        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET || 'CHAM_CONG_SECRET_KEY', // Fallback key nếu quên .env
            { expiresIn: '1d' }
        );

        res.json({
            message: 'Đăng nhập thành công',
            token: token,
            user: payload
        });

    } catch (err) {
        res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
});

module.exports = router;