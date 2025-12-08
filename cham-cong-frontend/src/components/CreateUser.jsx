import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminForms.css';

function CreateUser() {
    // State cho form
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [roleID, setRoleID] = useState(2); // Mặc định là 'User' (ID=2)
    const [userGroupID, setUserGroupID] = useState('');

    // State để chứa danh sách nhóm
    const [groups, setGroups] = useState([]); 

    // State cho thông báo
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // Tự động gọi API lấy danh sách nhóm khi component được tải
    useEffect(() => {
        const fetchGroups = async () => {
            const token = localStorage.getItem('token');
            try {
                const response = await axios.get(
                    '/api/groups',
                    { headers: { 'Authorization': `Bearer ${token}` } }
                );
                setGroups(response.data);
                // Tự động chọn nhóm đầu tiên nếu có
                if (response.data.length > 0) {
                    setUserGroupID(response.data[0].UserGroupID);
                }
            } catch (err) {
                console.error('Lỗi không thể tải danh sách nhóm:', err);
                setError('Lỗi: Không thể tải danh sách nhóm.');
            }
        };
        fetchGroups();
    }, []); // Mảng rỗng [] nghĩa là chỉ chạy 1 lần lúc tải

    // Xử lý khi bấm nút Tạo
    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (!username || !password || !roleID || !userGroupID) {
            setError('Vui lòng điền đầy đủ thông tin');
            return;
        }

        const token = localStorage.getItem('token');
        try {
            const response = await axios.post(
                '/api/auth/register',
                { username, password, roleID, userGroupID },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            setMessage(`Tạo tài khoản thành công: ${response.data.username}`);
            // Xóa form
            setUsername('');
            setPassword('');

        } catch (err) {
            console.error(err);
            if (err.response && err.response.data.message) {
                setError(err.response.data.message);
            } else {
                setError('Lỗi server, không thể tạo tài khoản');
            }
        }
    };

    return (
        <div className="admin-form-section">
            <h3>Tạo Tài khoản người dùng mới</h3>
            <form onSubmit={handleSubmit}>
                {/* Username */}
                <div className="form-group">
                    <label htmlFor="username">Tên đăng nhập</label>
                    <input
                        type="text"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>
                {/* Password */}
                <div className="form-group">
                    <label htmlFor="password">Mật khẩu</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                {/* Role */}
                <div className="form-group">
                    <label htmlFor="role">Phân loại tài khoản</label>
                    <select 
                        id="role" 
                        value={roleID} 
                        onChange={(e) => setRoleID(e.target.value)}
                    >
                        <option value={1}>Admin</option>
                        <option value={2}>User (Quản lý)</option>
                    </select>
                </div>
                {/* Group */}
                <div className="form-group">
                    <label htmlFor="group">Gán vào Nhóm/Tổ chức</label>
                    <select 
                        id="group" 
                        value={userGroupID} 
                        onChange={(e) => setUserGroupID(e.target.value)}
                        required
                    >
                        <option value="" disabled>-- Chọn một nhóm --</option>
                        {groups.map(group => (
                            <option 
                                key={group.UserGroupID} 
                                value={group.UserGroupID}
                            >
                                {group.GroupName}
                            </option>
                        ))}
                    </select>
                </div>

                <button type="submit" className="admin-button">Tạo tài khoản</button>

                {message && <p className="success-message">{message}</p>}
                {error && <p className="error-message">{error}</p>}
            </form>
        </div>
    );
}

export default CreateUser;