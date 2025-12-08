import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ImportSection from '../components/ImportSection';
import EmployeeEditModal from '../components/EmployeeEditModal';
import { useAuth } from '../hooks/useAuth';
import './EmployeePage.css';
import '../components/AdminForms.css';

function EmployeePage() {
    // === STATE ===
    const { user, isAdmin } = useAuth();
    const [employees, setEmployees] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [newEmpId, setNewEmpId] = useState('');
    const [newEmpName, setNewEmpName] = useState('');
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [groups, setGroups] = useState([]);
    const [userGroupInfo, setUserGroupInfo] = useState(null);
    const [selectedGroup, setSelectedGroup] = useState('');

    // === HÀM GỌI API ===
    useEffect(() => {
        const fetchData = async () => {
             const token = localStorage.getItem('token');
             const headers = { Authorization: `Bearer ${token}` };
             try {
                 const groupsRes = await axios.get('/api/groups', { headers });
                 setGroups(groupsRes.data);
                 if (user && user.userGroupID) {
                    const currentUserGroup = groupsRes.data.find(g => g.UserGroupID === user.userGroupID);
                    setUserGroupInfo(currentUserGroup);
                    if (!isAdmin && currentUserGroup) {
                        setSelectedGroup(String(currentUserGroup.UserGroupID));
                    } else if (isAdmin) { setSelectedGroup('all'); }
                 } else if (isAdmin) { setSelectedGroup('all'); }
             } catch (err) { console.error('Lỗi tải dữ liệu nhóm:', err); setError('Không thể tải danh sách nhóm.'); }
         };
         fetchData();
    }, [user, isAdmin]);

    const fetchEmployees = async (groupID = selectedGroup) => {
        if (!groupID) return; // Đảm bảo selectedGroup đã được set
        setIsLoading(true); setError('');
        const token = localStorage.getItem('token');
        const params = {};
         if ((isAdmin || (userGroupInfo && userGroupInfo.ParentGroupID === null)) && groupID !== 'all') {
             if (!isAdmin && groupID === 'all' && userGroupInfo?.ParentGroupID === null) {
                 params.groupID = user.userGroupID; // 'all' của Parent Leader là ID của họ
             } else if (groupID !== 'all') { // Gửi ID nếu chọn cụ thể
                  const actualGroupID = groupID.includes('_only') ? groupID.split('_')[0] : groupID;
                  params.groupID = actualGroupID;
             }
         }

        try {
            const response = await axios.get('/api/employees', { headers: { 'Authorization': `Bearer ${token}` }, params: params });
            setEmployees(response.data);
        } catch (err) { setError('Không thể tải danh sách nhân viên'); }
        setIsLoading(false);
    };

    useEffect(() => {
        if (selectedGroup) { fetchEmployees(selectedGroup); }
    }, [selectedGroup]); // Bỏ isAdmin vì fetchGroups đã xử lý

    const handleAddEmployee = async (e) => {
        e.preventDefault(); setError(''); setMessage(''); const token = localStorage.getItem('token');
        try {
            await axios.post( '/api/employees', { SourceEmployeeID: newEmpId, FullName: newEmpName }, { headers: { 'Authorization': `Bearer ${token}` } });
            setMessage('Thêm nhân viên thành công!'); setNewEmpId(''); setNewEmpName(''); fetchEmployees();
        } catch (err) { setError(err.response?.data?.message || 'Lỗi khi thêm nhân viên'); }
    };

    const handleSaveEmployee = async (employeeID, updatedData) => {
        setError(''); setMessage(''); const token = localStorage.getItem('token');
        try {
            await axios.put(`/api/employees/${employeeID}`, updatedData, { headers: { 'Authorization': `Bearer ${token}` } });
            setMessage('Cập nhật thành công!'); setEditingEmployee(null); fetchEmployees();
        } catch (err) { setError(err.response?.data?.message || 'Lỗi khi cập nhật'); }
    };

    const handleRemoveEmployee = async (employeeID) => {
        if (!window.confirm('Bạn có chắc muốn xóa nhân viên này khỏi nhóm? (NV sẽ thành "chưa gán")')) return;
        setError(''); setMessage(''); const token = localStorage.getItem('token');
        try {
            await axios.put( `/api/employees/remove/${employeeID}`, {}, { headers: { 'Authorization': `Bearer ${token}` } });
            setMessage('Xóa khỏi nhóm thành công!'); fetchEmployees();
        } catch (err) { setError(err.response?.data?.message || 'Lỗi khi xóa'); }
    };

    // === RENDER ===
    const isParentGroupLeader = !isAdmin && userGroupInfo && userGroupInfo.ParentGroupID === null;
    const showGroupFilter = isAdmin || isParentGroupLeader;
    const childGroups = isParentGroupLeader ? groups.filter(g => g.ParentGroupID === user.userGroupID) : [];

    return (
        <div className="employee-page-container">
            {/* CỘT 1: DANH SÁCH NHÂN VIÊN */}
            <div className="employee-list-section">
                 <h3>
                     Quản lý Nhân viên
                     {showGroupFilter && (
                         <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} style={{ marginLeft: '1rem', fontSize: '0.9rem', padding: '5px' }}>
                            {isAdmin && <option value="all">-- Tất cả Nhóm --</option>}
                            {isParentGroupLeader && <option value={String(user.userGroupID)}>-- Nhóm của tôi & cấp dưới --</option>}
                            {isParentGroupLeader && <option value={user.userGroupID + '_only'}>-- Chỉ Nhóm của tôi --</option>}
                            {isAdmin && groups.sort((a,b)=>a.GroupName.localeCompare(b.GroupName)).map(group => ( <option key={group.UserGroupID} value={String(group.UserGroupID)}>{group.GroupName}</option> ))}
                            {isParentGroupLeader && childGroups.sort((a,b)=>a.GroupName.localeCompare(b.GroupName)).map(group => ( <option key={group.UserGroupID} value={String(group.UserGroupID)}>{group.GroupName}</option> ))}
                         </select>
                     )}
                 </h3>
                 {isLoading && <p>Đang tải...</p>}
                 <table className="employee-table">
                     <thead>
                         <tr>
                             <th>Mã Nhân viên</th>
                             <th>Họ và Tên</th>
                             {/* --- THAY ĐỔI: Bỏ điều kiện isAdmin --- */}
                             <th>Tên Nhóm</th>
                             {/* --- KẾT THÚC THAY ĐỔI --- */}
                             <th>Hành động</th>
                         </tr>
                     </thead>
                     <tbody>
                         {employees.map(emp => (
                             <tr key={emp.EmployeeID}>
                                 <td>{emp.SourceEmployeeID}</td>
                                 <td>{emp.FullName}</td>
                                 {/* --- THAY ĐỔI: Bỏ điều kiện isAdmin --- */}
                                 <td>{emp.GroupName || '(Chưa gán)'}</td>
                                 {/* --- KẾT THÚC THAY ĐỔI --- */}
                                 <td className="action-buttons">
                                     <button className="btn-edit" onClick={() => setEditingEmployee(emp)}>Sửa</button>
                                     <button className="btn-remove" onClick={() => handleRemoveEmployee(emp.EmployeeID)}>Xóa</button>
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
                <div className="admin-form-section"> <h3>Thêm mới (vào nhóm của bạn)</h3> <form onSubmit={handleAddEmployee}> <div className="form-group"> <label htmlFor="newEmpId">Mã NV</label> <input type="text" id="newEmpId" value={newEmpId} onChange={(e) => setNewEmpId(e.target.value)} required/> </div> <div className="form-group"> <label htmlFor="newEmpName">Họ tên</label> <input type="text" id="newEmpName" value={newEmpName} onChange={(e) => setNewEmpName(e.target.value)} required/> </div> <button type="submit" className="admin-button">Thêm</button> </form> </div>
                <ImportSection title="Import Nhân viên từ Excel" apiUrl="/api/import/employees" requiredColumns="SourceEmployeeID, FullName, UserGroupID" onImportSuccess={fetchEmployees}/>
            </div>

            {/* Modal Sửa */}
            {editingEmployee && (
                <EmployeeEditModal employee={editingEmployee} groups={groups} onClose={() => setEditingEmployee(null)} onSave={handleSaveEmployee}/>
            )}
        </div>
    );
}
export default EmployeePage;