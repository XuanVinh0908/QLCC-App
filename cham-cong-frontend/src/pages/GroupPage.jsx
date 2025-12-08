import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ImportSection from '../components/ImportSection';
// import CreateGroup from '../components/CreateGroup'; // Không dùng component riêng nữa
import GroupEditModal from '../components/GroupEditModal'; // Tạo Modal mới
import '../components/AdminForms.css';
import './EmployeePage.css'; // Mượn CSS bảng

function GroupPage() {
    // === STATE ===
    const [groups, setGroups] = useState([]); // Danh sách nhóm (bao gồm ParentGroupName)
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    // State cho Form Thêm mới
    const [newGroupName, setNewGroupName] = useState('');
    const [newParentGroupID, setNewParentGroupID] = useState(''); // Lưu ID nhóm cha

    // State cho Modal Sửa
    const [editingGroup, setEditingGroup] = useState(null); // (null = đang đóng)

    // === HÀM GỌI API ===

    // 1. Tải danh sách nhóm
    const fetchGroups = async () => {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        try {
            const response = await axios.get('/api/groups', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setGroups(response.data);
            setIsLoading(false);
        } catch (err) {
            console.error(err);
            setError('Không thể tải danh sách nhóm');
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchGroups();
    }, []);

    // 2. Thêm mới thủ công
    const handleAddGroup = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        const token = localStorage.getItem('token');
        try {
            await axios.post('/api/groups',
                { groupName: newGroupName, parentGroupID: newParentGroupID || null }, // Gửi cả parentID
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            setMessage('Tạo nhóm thành công!');
            setNewGroupName('');
            setNewParentGroupID('');
            fetchGroups(); // Tải lại danh sách
        } catch (err) {
            setError(err.response?.data?.message || 'Lỗi khi thêm nhóm');
        }
    };

     // 3. Lưu Sửa (từ Modal)
    const handleSaveGroup = async (groupID, updatedData) => {
        setError('');
        setMessage('');
        const token = localStorage.getItem('token');
        try {
            await axios.put(`/api/groups/${groupID}`, updatedData, {
                 headers: { 'Authorization': `Bearer ${token}` }
            });
            setMessage('Cập nhật thành công!');
            setEditingGroup(null); // Đóng Modal
            fetchGroups(); // Tải lại danh sách
        } catch (err) {
            setError(err.response?.data?.message || 'Lỗi khi cập nhật');
        }
    };

    // 4. Xóa nhóm
    const handleDeleteGroup = async (groupID, groupName) => {
        if (!window.confirm(`Bạn có chắc muốn xóa nhóm "${groupName}"? Hành động này không thể hoàn tác.`)) {
            return;
        }
        setError('');
        setMessage('');
        const token = localStorage.getItem('token');
        try {
            await axios.delete(`/api/groups/${groupID}`, {
                 headers: { 'Authorization': `Bearer ${token}` }
            });
            setMessage('Xóa nhóm thành công!');
            fetchGroups(); // Tải lại danh sách
        } catch (err) {
            setError(err.response?.data?.message || 'Lỗi khi xóa nhóm');
        }
    };


    // === RENDER ===
    return (
        <div className="employee-page-container"> {/* Tái sử dụng layout */}

            {/* CỘT 1: DANH SÁCH NHÓM */}
            <div className="employee-list-section">
                <h3>Danh sách Nhóm người dùng</h3>
                {isLoading && <p>Đang tải...</p>}
                <table className="employee-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Tên Nhóm</th>
                            <th>Nhóm Cha</th> {/* Cột mới */}
                            <th>Hành động</th> {/* Cột mới */}
                        </tr>
                    </thead>
                    <tbody>
                        {groups.map(group => (
                            <tr key={group.UserGroupID}>
                                <td>{group.UserGroupID}</td>
                                <td>{group.GroupName}</td>
                                <td>{group.ParentGroupName || '(Nhóm gốc)'}</td> {/* Hiển thị tên cha */}
                                <td className="action-buttons">
                                     <button
                                        className="btn-edit"
                                        onClick={() => setEditingGroup(group)} // Mở modal sửa
                                    >
                                        Sửa
                                    </button>
                                     <button
                                        className="btn-remove"
                                        onClick={() => handleDeleteGroup(group.UserGroupID, group.GroupName)}
                                    >
                                        Xóa
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {error && <p className="error-message" style={{ padding: '1rem' }}>{error}</p>}
                 {message && <p className="success-message" style={{ padding: '1rem' }}>{message}</p>}
            </div>

            {/* CỘT 2: CÁC FORM */}
            <div className="employee-forms-section">

                {/* Form Thêm mới thủ công (Cập nhật) */}
                <div className="admin-form-section">
                    <h3>Tạo Nhóm mới</h3>
                    <form onSubmit={handleAddGroup}>
                        <div className="form-group">
                            <label htmlFor="newGroupName">Tên nhóm mới</label>
                            <input
                                type="text"
                                id="newGroupName"
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                                required
                            />
                        </div>
                         {/* Dropdown chọn nhóm cha */}
                         <div className="form-group">
                            <label htmlFor="newParentGroupID">Thuộc Nhóm cha (Để trống nếu là nhóm gốc)</label>
                            <select
                                id="newParentGroupID"
                                value={newParentGroupID}
                                onChange={(e) => setNewParentGroupID(e.target.value)}
                            >
                                <option value="">-- Không có (Nhóm gốc) --</option>
                                {groups
                                    .filter(g => g.ParentGroupID === null) // Chỉ hiển thị nhóm gốc làm cha
                                    .map(parent => (
                                        <option key={parent.UserGroupID} value={parent.UserGroupID}>
                                            {parent.GroupName}
                                        </option>
                                ))}
                            </select>
                        </div>
                        <button type="submit" className="admin-button">Tạo nhóm</button>
                    </form>
                </div>

                {/* Chức năng Import Excel (Giữ nguyên) */}
                <ImportSection
                    title="Import Nhóm từ Excel (Chỉ Tên nhóm)"
                    apiUrl="/api/groups/import"
                    requiredColumns="GroupName"
                    onImportSuccess={fetchGroups} // Tự động tải lại bảng
                />

            </div>

             {/* Modal Sửa Nhóm (MỚI) */}
             {editingGroup && (
                <GroupEditModal
                    group={editingGroup}
                    allGroups={groups} // Truyền danh sách nhóm vào modal
                    onClose={() => setEditingGroup(null)}
                    onSave={handleSaveGroup}
                />
            )}
        </div>
    );
}

export default GroupPage;