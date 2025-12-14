const express = require('express');
const db = require('../db.js');
const router = express.Router();

// ==================================================================
// 1. API LẤY DANH SÁCH NHÓM/ĐƠN VỊ
// URL: /GET_LIST_GROUP
// ==================================================================
router.get('/GET_LIST_GROUP', async (req, res) => {
    try {
        const query = `
            SELECT 
                UserGroupID AS GroupId, 
                GroupName 
            FROM UserGroups 
            ORDER BY GroupName ASC
        `;
        const [groups] = await db.query(query);
        res.json(groups);
    } catch (err) {
        console.error('Tablet Get Group Error:', err);
        res.status(500).json([]); 
    }
});

// ==================================================================
// 2. API ĐỒNG BỘ DỮ LIỆU NHÂN VIÊN
// URL: /GET_LIST_FACE?unitId=...
// Sửa đổi: Lấy TOÀN BỘ nhân viên (kể cả chưa có Face) để phục vụ đăng ký
// ==================================================================
router.get('/GET_LIST_FACE', async (req, res) => {
    try {
        const unitId = req.query.unitId; 

        if (!unitId) {
            return res.status(400).json({ message: 'Thiếu tham số unitId' });
        }

        const [groupInfo] = await db.query('SELECT ParentGroupID FROM UserGroups WHERE UserGroupID = ?', [unitId]);
        
        let query = '';
        let params = [];

        // --- SỬA ĐỔI: Đã bỏ dòng điều kiện lọc FaceHex --- 
        // Chúng ta lấy hết để tablet hiển thị danh sách
        
        if (groupInfo.length > 0 && groupInfo[0].ParentGroupID === null) {
            // A. Nhóm Cha: Lấy nhân viên của chính nó VÀ các nhóm con
            query = `
                SELECT 
                    SourceEmployeeID as StaffCode, 
                    FullName, 
                    FaceHex 
                FROM Employees 
                WHERE (UserGroupID = ? OR UserGroupID IN (SELECT UserGroupID FROM UserGroups WHERE ParentGroupID = ?))
            `;
            params = [unitId, unitId];
        } else {
            // B. Nhóm Con: Chỉ lấy nhân viên của nhóm đó
            query = `
                SELECT 
                    SourceEmployeeID as StaffCode, 
                    FullName, 
                    FaceHex 
                FROM Employees 
                WHERE UserGroupID = ?
            `;
            params = [unitId];
        }

        const [employees] = await db.query(query, params);
        res.json(employees);

    } catch (err) {
        console.error('Tablet Sync Error:', err);
        res.status(500).json([]); 
    }
});

// 3. API LẤY THÔNG TIN 1 NGƯỜI
// ==================================================================
router.get('/LAY_FACEID', async (req, res) => {
    try {
        const { nhanvien } = req.query; 

        if (!nhanvien) {
            return res.status(400).json({ status: 'ERROR', message: 'Thiếu mã nhân viên' });
        }

        const query = `
            SELECT SourceEmployeeID, FullName, FaceHex 
            FROM Employees 
            WHERE SourceEmployeeID = ?
        `;
        
        // SỬA: Thêm String() để đảm bảo ID luôn là chuỗi
        const [rows] = await db.query(query, [String(nhanvien)]);

        if (rows.length === 0) {
            return res.status(404).json({ status: 'ERROR', message: 'Không tìm thấy nhân viên' });
        }

        const emp = rows[0];
        res.json({
            "id": emp.SourceEmployeeID,
            "userName": emp.FullName,
            "anhdangky": emp.FaceHex || "",
            "x": 0, "y": 0, "distance": 2000
        });

    } catch (err) {
        console.error('Tablet Get Info Error:', err);
        res.status(500).json({ status: 'ERROR', message: 'Lỗi server' });
    }
});

// ==================================================================
// 4. API CHẤM CÔNG (Check-in)
// ==================================================================
router.post('/PUT_CHAMCONG', async (req, res) => {
    try {
        const { nhanvien, unitId } = req.body; 

        if (!nhanvien) {
            return res.status(400).json({ status: 'ERROR', message: 'Thiếu ID nhân viên' });
        }

        const checkTime = new Date();
        let accessPointName = unitId ? `TABLET_GROUP_${unitId}` : 'TABLET';

        const query = `
            INSERT INTO RawAttendanceLogs (SourceEmployeeID, CheckTime, AccessPoint)
            VALUES (?, ?, ?)
        `;

        // SỬA: Thêm String(nhanvien)
        await db.query(query, [String(nhanvien), checkTime, accessPointName]);

        res.json({ 
            status: 'OK', 
            message: 'Ghi nhận thành công',
            time: checkTime 
        });

    } catch (err) {
        console.error('Tablet Checkin Error:', err);
        res.status(500).json({ status: 'ERROR', message: 'Lỗi server' });
    }
});

// ==================================================================
// 5. API ĐĂNG KÝ KHUÔN MẶT (Sửa lỗi chính ở đây)
// ==================================================================
router.post('/DANGKY', async (req, res) => {
    try {
        const { nhanvien, fileName } = req.body; 

        if (!nhanvien || !fileName) {
            return res.status(400).json({ status: 'ERROR', message: 'Thiếu thông tin' });
        }

        const query = `
            UPDATE Employees 
            SET FaceHex = ? 
            WHERE SourceEmployeeID = ?
        `;

        // SỬA QUAN TRỌNG: String(nhanvien)
        // Việc này sẽ biến lệnh thành: ... WHERE SourceEmployeeID = '21934871'
        // Thay vì: ... WHERE SourceEmployeeID = 21934871
        const [result] = await db.query(query, [fileName, String(nhanvien)]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 'ERROR', message: 'Không tìm thấy nhân viên' });
        }

        res.json({ status: 'OK', message: 'Đăng ký thành công' });

    } catch (err) {
        console.error('Tablet Register Error:', err);
        // In lỗi chi tiết ra console để debug nếu cần
        console.log(err); 
        res.status(500).json({ status: 'ERROR', message: 'Lỗi server: ' + err.code });
    }
});

module.exports = router;