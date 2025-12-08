import React, { useState } from 'react';
import axios from 'axios';
import './AdminForms.css'; // Sẽ dùng chung CSS

function CreateGroup() {
    const [groupName, setGroupName] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (!groupName) {
            setError('Vui lòng nhập tên nhóm');
            return;
        }

        const token = localStorage.getItem('token');
        try {
            const response = await axios.post(
                '/api/groups',
                { groupName }, // Dữ liệu gửi đi
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            setMessage(`Tạo thành công nhóm: ${response.data.newGroup.GroupName}`);
            setGroupName(''); // Xóa ô input

        } catch (err) {
            console.error(err);
            if (err.response && err.response.data.message) {
                setError(err.response.data.message);
            } else {
                setError('Lỗi server, không thể tạo nhóm');
            }
        }
    };

    return (
        <div className="admin-form-section">
            <h3>Tạo Nhóm người dùng mới</h3>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="groupName">Tên nhóm mới</label>
                    <input
                        type="text"
                        id="groupName"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                    />
                </div>
                <button type="submit" className="admin-button">Tạo nhóm</button>

                {message && <p className="success-message">{message}</p>}
                {error && <p className="error-message">{error}</p>}
            </form>
        </div>
    );
}

export default CreateGroup;