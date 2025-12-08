import React, { useState, useEffect } from 'react';
import './EmployeeEditModal.css'; // Mượn CSS cũ

// Nhận thêm prop 'allGroups'
function GroupEditModal({ group, allGroups, onClose, onSave }) {
    const [formData, setFormData] = useState({
        groupName: '',
        parentGroupID: '' // Lưu ID nhóm cha
    });

    // Cập nhật form khi 'group' thay đổi
    useEffect(() => {
        if (group) {
            setFormData({
                groupName: group.GroupName,
                // Nếu ParentGroupID là null, đặt thành chuỗi rỗng cho select
                parentGroupID: group.ParentGroupID ? String(group.ParentGroupID) : '' 
            });
        }
    }, [group]);

    if (!group) return null;

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Gọi onSave với dữ liệu mới (chuyển parentID rỗng thành null)
        onSave(group.UserGroupID, {
            groupName: formData.groupName,
            parentGroupID: formData.parentGroupID || null
        });
    };

    // Lọc danh sách nhóm cha tiềm năng (loại bỏ chính nó và các con của nó - tránh vòng lặp)
    const potentialParents = allGroups.filter(g => 
        g.UserGroupID !== group.UserGroupID && // Không thể là cha của chính mình
        g.ParentGroupID === null // Chỉ nhóm gốc mới được làm cha (đơn giản hóa)
        // (Có thể mở rộng để cho phép nhóm con làm cha của nhóm khác, nhưng phức tạp hơn)
    );


    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <form onSubmit={handleSubmit}>
                    <h2>Sửa thông tin Nhóm</h2>

                    {/* Tên Nhóm */}
                    <div className="form-group">
                        <label htmlFor="groupName">Tên Nhóm</label>
                        <input
                            type="text"
                            id="groupName"
                            name="groupName" // Thêm name
                            value={formData.groupName}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    {/* Dropdown chọn nhóm cha */}
                     <div className="form-group">
                        <label htmlFor="parentGroupID">Thuộc Nhóm cha</label>
                        <select
                            id="parentGroupID"
                            name="parentGroupID" // Thêm name
                            value={formData.parentGroupID}
                            onChange={handleChange}
                        >
                            <option value="">-- Không có (Nhóm gốc) --</option>
                            {potentialParents.map(parent => (
                                <option key={parent.UserGroupID} value={parent.UserGroupID}>
                                    {parent.GroupName}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Nút bấm */}
                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="btn-cancel">
                            Hủy
                        </button>
                        <button type="submit" className="btn-save">
                            Lưu thay đổi
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default GroupEditModal;