import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import { format, subDays } from 'date-fns';
import * as XLSX from 'xlsx';
import { useAuth } from '../hooks/useAuth';

import './AttendancePage.css';

function AttendancePage() {
    // === STATE ===
    const { user, isAdmin } = useAuth();
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [startDate, setStartDate] = useState(subDays(new Date(), 7));
    const [endDate, setEndDate] = useState(new Date());
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
                    } else if (isAdmin) {
                        setSelectedGroup('all');
                    }
                } else if (isAdmin) {
                    setSelectedGroup('all');
                }
            } catch (err) { console.error('Lỗi tải dữ liệu nhóm:', err); setError('Không thể tải danh sách nhóm.'); }
        };
        fetchData();
    }, [user, isAdmin]);

    useEffect(() => {
        if (selectedGroup) {
            handleFetchData();
        }
    }, [selectedGroup, startDate, endDate]);

    const handleFetchData = async () => {
        if (!selectedGroup) return;
        setIsLoading(true); setError(''); setMessage(''); setData([]);
        const token = localStorage.getItem('token');
        const formattedStartDate = format(startDate, 'yyyy-MM-dd');
        const formattedEndDate = format(endDate, 'yyyy-MM-dd');
        const params = { startDate: formattedStartDate, endDate: formattedEndDate };
        if (selectedGroup !== 'all' && !(userGroupInfo?.ParentGroupID === null && selectedGroup === String(user?.userGroupID))) {
             // Chỉ gửi groupID nếu chọn khác 'all' VÀ không phải là Parent Leader chọn option mặc định
             const actualGroupID = selectedGroup.includes('_only') ? selectedGroup.split('_')[0] : selectedGroup;
             params.groupID = actualGroupID;
        } else if (isAdmin && selectedGroup !== 'all') { // Admin chọn nhóm cụ thể
            params.groupID = selectedGroup;
        }

        try {
            const response = await axios.get('/api/attendance', { headers: { 'Authorization': `Bearer ${token}` }, params: params });
            setData(response.data);
            if (response.data.length === 0) setMessage('Không tìm thấy dữ liệu.');
        } catch (err) { setError(err.response?.data?.message || 'Lỗi tải dữ liệu'); }
        setIsLoading(false);
    };

    const handleExportExcel = () => {
        if (data.length === 0) { setError('Không có dữ liệu để xuất.'); return; }
        const dataToExport = data.map(row => ({
            'Ngày-Tháng-Năm': row.WorkDate, 'Họ tên': row.FullName, 'Tên Nhóm': row.GroupName,
            'Thời gian chấm công vào': row.FirstCheckIn, 'Thời gian chấm công ra': row.LastCheckOut
        }));
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'DuLieuChamCong');
        XLSX.writeFile(wb, 'ChamCong.xlsx');
    };

    // === RENDER ===
    const isParentGroupLeader = !isAdmin && userGroupInfo && userGroupInfo.ParentGroupID === null;
    const showGroupFilter = isAdmin || isParentGroupLeader;
    const childGroups = isParentGroupLeader ? groups.filter(g => g.ParentGroupID === user.userGroupID) : [];

    return (
        <div className="attendance-container">
            <h2>Thông tin Chấm công</h2>
            <div className="filter-controls">
                {/* Lọc Ngày */}
                <div className="filter-group">
                    <label>Từ ngày</label>
                    <DatePicker selected={startDate} onChange={(date) => setStartDate(date)} dateFormat="dd/MM/yyyy"/>
                </div>
                <div className="filter-group">
                    <label>Đến ngày</label>
                    <DatePicker selected={endDate} onChange={(date) => setEndDate(date)} dateFormat="dd/MM/yyyy"/>
                </div>

                {/* Lọc Nhóm (Admin VÀ Trưởng nhóm cha) */}
                {showGroupFilter && (
                    <div className="filter-group">
                        <label>Lọc theo Nhóm</label>
                        <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)}>
                            {/* Option mặc định/tổng hợp */}
                            {isAdmin && <option value="all">-- Tất cả Nhóm --</option>}
                            {isParentGroupLeader && <option value={String(user.userGroupID)}>-- Nhóm của tôi & cấp dưới --</option>} {/* Đổi chữ */}
                            {isParentGroupLeader && <option value={user.userGroupID + '_only'}>-- Chỉ Nhóm của tôi --</option>}

                            {/* Liệt kê các nhóm cụ thể (Bỏ hậu tố) */}
                            {isAdmin && groups
                                .sort((a, b) => a.GroupName.localeCompare(b.GroupName))
                                .map(group => (
                                    <option key={group.UserGroupID} value={String(group.UserGroupID)}>
                                        {group.GroupName} {/* Bỏ hậu tố */}
                                    </option>
                            ))}
                            {isParentGroupLeader && childGroups
                                .sort((a, b) => a.GroupName.localeCompare(b.GroupName))
                                .map(group => (
                                    <option key={group.UserGroupID} value={String(group.UserGroupID)}>
                                         {group.GroupName} {/* Bỏ hậu tố */}
                                    </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* --- NÚT BẤM (CHỈ CÓ 1 LẦN) --- */}
                <button onClick={handleFetchData} className="action-button btn-fetch">
                    {isLoading ? 'Đang tải...' : 'Lấy dữ liệu'}
                </button>
                <button onClick={handleExportExcel} className="action-button btn-export">
                    Xuất Excel
                </button>
                 {/* --- KẾT THÚC NÚT BẤM --- */}
            </div>

            {message && <p className="success-message">{message}</p>}
            {error && <p className="error-message">{error}</p>}

            <div className="data-table-section">
                 <h3>Kết quả Chấm công</h3>
                 <table className="data-table">
                     <thead><tr><th>Ngày</th><th>Họ tên</th><th>Nhóm</th><th>Vào</th><th>Ra</th></tr></thead>
                     <tbody>
                         {data.map((row, index) => (
                             <tr key={index}><td>{row.WorkDate}</td><td>{row.FullName}</td><td>{row.GroupName}</td><td>{row.FirstCheckIn}</td><td>{row.LastCheckOut}</td></tr>
                         ))}
                     </tbody>
                 </table>
             </div>
        </div>
    );
}
export default AttendancePage;