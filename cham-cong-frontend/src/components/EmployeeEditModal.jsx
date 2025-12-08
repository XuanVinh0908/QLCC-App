import React, { useState, useEffect } from 'react';
import './EmployeeEditModal.css';

// Nhận thêm prop 'groups'
function EmployeeEditModal({ employee, groups, onClose, onSave }) {
    const [formData, setFormData] = useState({
        SourceEmployeeID: '',
        FullName: '',
        UserGroupID: '' // Thêm state cho UserGroupID
    });

    useEffect(() => {
        if (employee) {
            setFormData({
                SourceEmployeeID: employee.SourceEmployeeID,
                FullName: employee.FullName,
                // Chuyển null thành chuỗi rỗng
                UserGroupID: employee.UserGroupID ? String(employee.UserGroupID) : '' 
            });
        }
    }, [employee]);

    if (!employee) return null;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Gửi cả UserGroupID (chuyển về số hoặc null)
        onSave(employee.EmployeeID, {
             ...formData,
             UserGroupID: formData.UserGroupID ? parseInt(formData.UserGroupID) : null
        });
    };

    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <form onSubmit={handleSubmit}>
                    <h2>Sửa thông tin Nhân viên</h2>
                    {/* Mã NV */}
                    <div className="form-group"> {/* ... */} </div>
                     <div className="form-group">
                        <label htmlFor="SourceEmployeeID">Mã Nhân viên (Gốc)</label>
                        <input type="text" id="SourceEmployeeID" name="SourceEmployeeID" value={formData.SourceEmployeeID} onChange={handleChange} required/>
                    </div>

                    {/* Họ tên */}
                    <div className="form-group"> {/* ... */} </div>
                     <div className="form-group">
                        <label htmlFor="FullName">Họ và Tên</label>
                        <input type="text" id="FullName" name="FullName" value={formData.FullName} onChange={handleChange} required/>
                    </div>


                    {/* Dropdown chọn nhóm mới */}
                    <div className="form-group">
                        <label htmlFor="UserGroupID">Thuộc Nhóm</label>
                        <select
                            id="UserGroupID"
                            name="UserGroupID" // Thêm name
                            value={formData.UserGroupID}
                            onChange={handleChange}
                            required // Bắt buộc chọn nhóm khi sửa
                        >
                            <option value="" disabled>-- Chọn một nhóm --</option>
                            {/* Cho phép chọn cả nhóm cha và nhóm con */}
                            {groups.map(group => (
                                <option key={group.UserGroupID} value={group.UserGroupID}>
                                    {group.GroupName} {group.ParentGroupID ? '(Con)' : '(Cha)'}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Nút bấm */}
                    <div className="modal-actions"> {/* ... */} </div>
                     <div className="modal-actions">
                        <button type="button" onClick={onClose} className="btn-cancel">Hủy</button>
                        <button type="submit" className="btn-save">Lưu thay đổi</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default EmployeeEditModal;