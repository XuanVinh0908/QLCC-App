import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';

const EmployeePage = () => {
    const { user, isAdmin } = useAuth(); // Lấy thông tin user hiện tại

    // --- STATE QUẢN LÝ DỮ LIỆU ---
    const [employees, setEmployees] = useState([]);
    const [groups, setGroups] = useState([]);       // Danh sách Sở/Ban (UserGroups)
    const [details, setDetails] = useState([]);     // Danh sách Phòng ban con (Detail_GroupUser)
    
    // --- STATE QUẢN LÝ FORM & UI ---
    const [showModal, setShowModal] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', content: '' });

    // Dữ liệu Form
    const [formData, setFormData] = useState({
        EmployeeID: null,
        SourceEmployeeID: '', // Mã NV
        FullName: '',
        Position: '',         // (Mới) Chức vụ
        UserGroupID: '',      // Sở/Ban
        DetailID: '',         // (Mới) Phòng ban
        Phone: '',
        Email: '',
        Address: '',
        Gender: 'Nam'
    });

    // --- 1. LOAD DỮ LIỆU BAN ĐẦU ---
    useEffect(() => {
        fetchEmployees();
        fetchGroups();
    }, []);

    // Load danh sách nhân viên
    const fetchEmployees = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/employees', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEmployees(res.data);
        } catch (err) {
            console.error("Lỗi tải NV:", err);
        }
    };

    // Load danh sách nhóm cha (Sở/Ban)
    const fetchGroups = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/groups', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setGroups(res.data);
        } catch (err) {
            console.error("Lỗi tải nhóm:", err);
        }
    };

    // --- 2. LOGIC CASCADING DROPDOWN (CHỌN SỞ -> HIỆN PHÒNG) ---
    // Hàm lấy phòng ban con dựa theo ID nhóm cha
    const fetchDetailsByGroup = async (groupID) => {
        if (!groupID) {
            setDetails([]);
            return;
        }
        try {
            const token = localStorage.getItem('token');
            // Gọi API mới chúng ta vừa tạo ở Backend
            const res = await axios.get(`/api/details/by-group/${groupID}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDetails(res.data);
        } catch (err) {
            console.error("Lỗi tải phòng ban chi tiết:", err);
            setDetails([]);
        }
    };

    // Khi người dùng chọn Nhóm cha trên Form
    const handleGroupChange = (e) => {
        const newGroupID = e.target.value;
        setFormData({ 
            ...formData, 
            UserGroupID: newGroupID, 
            DetailID: '' // Reset phòng ban con khi đổi nhóm cha
        });
        
        // Gọi API lấy danh sách phòng ban mới
        fetchDetailsByGroup(newGroupID);
    };

    // --- 3. XỬ LÝ FORM ---
    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Mở Form Thêm mới
    const handleAddNew = () => {
        setIsEditMode(false);
        setFormData({
            EmployeeID: null, SourceEmployeeID: '', FullName: '', Position: '',
            UserGroupID: '', DetailID: '', Phone: '', Email: '', Address: '', Gender: 'Nam'
        });
        setDetails([]); // Reset danh sách phòng ban
        setMessage({ type: '', content: '' });
        setShowModal(true);
    };

    // Mở Form Sửa
    const handleEdit = (emp) => {
        setIsEditMode(true);
        setFormData({
            EmployeeID: emp.EmployeeID,
            SourceEmployeeID: emp.SourceEmployeeID || emp.EmployeeCode, // Fix lỗi tên cột
            FullName: emp.FullName,
            Position: emp.Position || '',
            UserGroupID: emp.UserGroupID,
            DetailID: emp.DetailID || '',
            Phone: emp.Phone || '',
            Email: emp.Email || '',
            Address: emp.Address || '',
            Gender: emp.Gender || 'Nam'
        });
        
        // QUAN TRỌNG: Phải load danh sách phòng ban của user đó ngay lập tức
        if (emp.UserGroupID) {
            fetchDetailsByGroup(emp.UserGroupID);
        }
        
        setMessage({ type: '', content: '' });
        setShowModal(true);
    };

    // Submit Form (Thêm hoặc Sửa)
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        const token = localStorage.getItem('token');

        try {
            if (isEditMode) {
                // GỌI API SỬA (PUT)
                // Lưu ý: Không gửi HexFace ở đây để tránh làm mất dữ liệu mặt
                await axios.put(`/api/employees/${formData.EmployeeID}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setMessage({ type: 'success', content: 'Cập nhật thành công!' });
            } else {
                // GỌI API THÊM (POST)
                await axios.post('/api/employees', formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setMessage({ type: 'success', content: 'Thêm mới thành công!' });
                // Reset form để nhập tiếp
                setFormData({ ...formData, SourceEmployeeID: '', FullName: '', Position: '' });
            }
            
            fetchEmployees(); // Tải lại danh sách
            if(isEditMode) setTimeout(() => setShowModal(false), 1500); // Đóng modal sau 1.5s nếu là sửa

        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Lỗi hệ thống';
            setMessage({ type: 'danger', content: errorMsg });
        } finally {
            setIsLoading(false);
        }
    };

    // Xóa nhân viên
    const handleDelete = async (id) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa nhân viên này?")) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/employees/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchEmployees();
        } catch (err) {
            alert('Lỗi khi xóa nhân viên');
        }
    };

    return (
        <div className="container-fluid p-4">
            {/* --- HEADER --- */}
            <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2">
                <h3 className="fw-bold text-dark m-0">
                    <i className="bi bi-people-fill me-2"></i> Quản lý Nhân sự
                </h3>
                <button className="btn btn-primary shadow-sm fw-bold" onClick={handleAddNew}>
                    <i className="bi bi-person-plus-fill me-2"></i> Thêm nhân viên
                </button>
            </div>

            {/* --- BẢNG DANH SÁCH --- */}
            <div className="card shadow-sm border-0 rounded-4">
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="bg-light text-secondary">
                                <tr>
                                    <th className="ps-4">Mã NV</th>
                                    <th>Họ và Tên</th>
                                    <th>Chức vụ</th>
                                    <th>Phòng ban</th>
                                    <th>Đơn vị (Sở/Ban)</th>
                                    <th className="text-center">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employees.map((emp) => (
                                    <tr key={emp.EmployeeID}>
                                        <td className="ps-4 fw-bold text-primary">{emp.SourceEmployeeID || emp.EmployeeCode}</td>
                                        <td>
                                            <div className="fw-bold">{emp.FullName}</div>
                                            <small className="text-muted">{emp.Gender} - {emp.Phone}</small>
                                        </td>
                                        <td>
                                            {emp.Position ? (
                                                <span className="badge bg-info text-dark bg-opacity-10 border border-info px-2 py-1">
                                                    {emp.Position}
                                                </span>
                                            ) : <span className="text-muted small">-</span>}
                                        </td>
                                        <td>
                                            {emp.DetailName || <span className="text-muted small fs-7">Chưa xếp phòng</span>}
                                        </td>
                                        <td>
                                            <span className="fw-bold text-secondary" style={{fontSize: '0.9rem'}}>
                                                {emp.GroupName}
                                            </span>
                                        </td>
                                        <td className="text-center">
                                            <button className="btn btn-sm btn-outline-primary me-2 border-0 bg-light" onClick={() => handleEdit(emp)}>
                                                <i className="bi bi-pencil-square"></i>
                                            </button>
                                            <button className="btn btn-sm btn-outline-danger border-0 bg-light" onClick={() => handleDelete(emp.EmployeeID)}>
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {employees.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="text-center py-5 text-muted">
                                            Chưa có dữ liệu nhân viên.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* --- MODAL THÊM / SỬA (Custom đơn giản dùng CSS Bootstrap) --- */}
            {showModal && (
                <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content rounded-4 border-0 shadow">
                            <div className="modal-header bg-primary text-white">
                                <h5 className="modal-title fw-bold">
                                    {isEditMode ? 'Cập nhật thông tin' : 'Thêm nhân viên mới'}
                                </h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                            </div>
                            <div className="modal-body p-4">
                                {message.content && (
                                    <div className={`alert alert-${message.type} mb-3 shadow-sm`}>{message.content}</div>
                                )}
                                
                                <form onSubmit={handleSubmit}>
                                    <div className="row g-3">
                                        {/* Cột 1: Thông tin cơ bản */}
                                        <div className="col-md-6">
                                            <label className="form-label fw-bold small text-secondary">Mã Nhân viên <span className="text-danger">*</span></label>
                                            <input type="text" className="form-control" name="SourceEmployeeID" value={formData.SourceEmployeeID} onChange={handleInputChange} required placeholder="VD: NV001" />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-bold small text-secondary">Họ và Tên <span className="text-danger">*</span></label>
                                            <input type="text" className="form-control" name="FullName" value={formData.FullName} onChange={handleInputChange} required placeholder="VD: Nguyễn Văn A" />
                                        </div>

                                        {/* Cột 2: Chức vụ & Giới tính */}
                                        <div className="col-md-6">
                                            <label className="form-label fw-bold small text-secondary">Chức vụ (Mới)</label>
                                            <input type="text" className="form-control" name="Position" value={formData.Position} onChange={handleInputChange} placeholder="VD: Trưởng phòng, Chuyên viên..." />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-bold small text-secondary">Giới tính</label>
                                            <select className="form-select" name="Gender" value={formData.Gender} onChange={handleInputChange}>
                                                <option value="Nam">Nam</option>
                                                <option value="Nữ">Nữ</option>
                                            </select>
                                        </div>

                                        {/* Cột 3: Đơn vị & Phòng ban (QUAN TRỌNG) */}
                                        <div className="col-md-6">
                                            <label className="form-label fw-bold small text-secondary">Đơn vị / Sở Ban <span className="text-danger">*</span></label>
                                            <select 
                                                className="form-select border-primary" 
                                                name="UserGroupID" 
                                                value={formData.UserGroupID} 
                                                onChange={handleGroupChange} // Gọi hàm load phòng ban con
                                                required
                                            >
                                                <option value="">-- Chọn đơn vị --</option>
                                                {groups.map(g => (
                                                    <option key={g.UserGroupID} value={g.UserGroupID}>{g.GroupName}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-bold small text-secondary">Phòng ban trực thuộc (Mới)</label>
                                            <select 
                                                className="form-select" 
                                                name="DetailID" 
                                                value={formData.DetailID} 
                                                onChange={handleInputChange}
                                                disabled={!formData.UserGroupID} // Khóa nếu chưa chọn Sở
                                            >
                                                <option value="">-- Chọn phòng ban --</option>
                                                {details.map(d => (
                                                    <option key={d.DetailID} value={d.DetailID}>{d.DetailName}</option>
                                                ))}
                                            </select>
                                            {formData.UserGroupID && details.length === 0 && (
                                                <div className="form-text text-warning small">Đơn vị này chưa khai báo phòng ban con.</div>
                                            )}
                                        </div>

                                        {/* Cột 4: Liên hệ */}
                                        <div className="col-md-6">
                                            <label className="form-label fw-bold small text-secondary">Số điện thoại</label>
                                            <input type="text" className="form-control" name="Phone" value={formData.Phone} onChange={handleInputChange} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-bold small text-secondary">Email</label>
                                            <input type="email" className="form-control" name="Email" value={formData.Email} onChange={handleInputChange} />
                                        </div>
                                    </div>

                                    <div className="d-flex justify-content-end mt-4 pt-3 border-top gap-2">
                                        <button type="button" className="btn btn-light" onClick={() => setShowModal(false)}>Hủy bỏ</button>
                                        <button type="submit" className="btn btn-primary fw-bold px-4" disabled={isLoading}>
                                            {isLoading ? 'Đang lưu...' : (isEditMode ? 'Cập nhật' : 'Thêm mới')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeePage;