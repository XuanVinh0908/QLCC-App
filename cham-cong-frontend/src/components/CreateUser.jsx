import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CreateUser = () => {
    // 1. State quản lý Form
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        roleID: 2,      // Mặc định là User (ID=2)
        userGroupID: '' // Sẽ được tự động điền khi tải danh sách nhóm
    });

    // 2. State danh sách nhóm (KHÔI PHỤC TỪ CODE CŨ)
    const [groups, setGroups] = useState([]);

    const [message, setMessage] = useState({ type: '', content: '' });
    const [isLoading, setIsLoading] = useState(false);

    // 3. useEffect lấy danh sách nhóm khi trang vừa tải (KHÔI PHỤC TỪ CODE CŨ)
    useEffect(() => {
        const fetchGroups = async () => {
            const token = localStorage.getItem('token');
            try {
                const response = await axios.get('/api/groups', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                setGroups(response.data);

                // Logic cũ: Tự động chọn nhóm đầu tiên nếu có
                if (response.data.length > 0) {
                    setFormData(prev => ({
                        ...prev,
                        userGroupID: response.data[0].UserGroupID
                    }));
                }
            } catch (err) {
                console.error('Lỗi tải danh sách nhóm:', err);
                setMessage({ type: 'warning', content: 'Không thể tải danh sách phòng ban.' });
            }
        };
        fetchGroups();
    }, []);

    // Xử lý nhập liệu
    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    // Xử lý Submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage({ type: '', content: '' });

        // Validate cơ bản
        if (!formData.username || !formData.password || !formData.userGroupID) {
            setMessage({ type: 'danger', content: 'Vui lòng điền đủ thông tin và chọn nhóm.' });
            setIsLoading(false);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('/api/auth/register', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setMessage({ type: 'success', content: `Tạo thành công tài khoản: ${response.data.username}` });
            
            // Reset form nhưng giữ lại role và group mặc định để tạo tiếp cho nhanh
            setFormData(prev => ({
                ...prev,
                username: '',
                password: ''
            }));

        } catch (err) {
            console.error("Lỗi tạo user:", err);
            const errorMsg = err.response?.data?.message || 'Lỗi server, vui lòng thử lại';
            setMessage({ type: 'danger', content: errorMsg });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="card shadow-sm border-0 rounded-4">
            <div className="card-header bg-primary text-white fw-bold py-3">
                <i className="bi bi-person-plus-fill me-2"></i> Cấp tài khoản mới
            </div>
            <div className="card-body p-4">
                {message.content && (
                    <div className={`alert alert-${message.type} small shadow-sm`}>
                        {message.content}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* Username */}
                    <div className="mb-3">
                        <label className="form-label fw-bold small text-secondary">Tên đăng nhập</label>
                        <div className="input-group">
                            <span className="input-group-text bg-light"><i className="bi bi-person"></i></span>
                            <input 
                                type="text" 
                                className="form-control" 
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                required 
                                placeholder="VD: nguyen_van_a"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="mb-3">
                        <label className="form-label fw-bold small text-secondary">Mật khẩu</label>
                        <div className="input-group">
                            <span className="input-group-text bg-light"><i className="bi bi-key"></i></span>
                            <input 
                                type="password" 
                                className="form-control" 
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required 
                                placeholder="******"
                            />
                        </div>
                    </div>

                    <div className="row">
                        {/* Role Select */}
                        <div className="col-md-6 mb-3">
                            <label className="form-label fw-bold small text-secondary">Phân loại tài khoản</label>
                            <select 
                                className="form-select"
                                name="roleID"
                                value={formData.roleID}
                                onChange={handleChange}
                            >
                                <option value={1}>Admin (Quản trị)</option>
                                <option value={2}>User (Nhân viên/Quản lý)</option>
                            </select>
                        </div>

                        {/* Group Select (KHÔI PHỤC TÍNH NĂNG CHỌN NHÓM) */}
                        <div className="col-md-6 mb-3">
                            <label className="form-label fw-bold small text-secondary">Thuộc Nhóm/Tổ chức</label>
                            <select 
                                className="form-select"
                                name="userGroupID"
                                value={formData.userGroupID}
                                onChange={handleChange}
                                required
                            >
                                <option value="" disabled>-- Chọn phòng ban --</option>
                                {groups.map(group => (
                                    <option key={group.UserGroupID} value={group.UserGroupID}>
                                        {group.GroupName}
                                    </option>
                                ))}
                            </select>
                            {groups.length === 0 && (
                                <div className="form-text text-danger" style={{fontSize: '11px'}}>
                                    * Chưa tải được danh sách nhóm
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="d-grid mt-2">
                        <button type="submit" className="btn btn-primary fw-bold py-2 shadow-sm" disabled={isLoading}>
                            {isLoading ? (
                                <span><i className="spinner-border spinner-border-sm me-2"></i>Đang xử lý...</span>
                            ) : (
                                <span><i className="bi bi-check-circle-fill me-2"></i>Tạo tài khoản</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateUser;