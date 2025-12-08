import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { useAuth } from '../hooks/useAuth';
import './AttendancePage.css';

const getTodayStart = () => { const start = new Date(); start.setHours(0, 0, 0, 0); return start; };
const getTodayEnd = () => { const end = new Date(); end.setHours(23, 59, 59, 999); return end; };

function ActivityLogPage() {
    // === STATE ===
    const { user, isAdmin } = useAuth();
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [startDate, setStartDate] = useState(getTodayStart());
    const [endDate, setEndDate] = useState(getTodayEnd());
    const [groups, setGroups] = useState([]);
    const [userGroupInfo, setUserGroupInfo] = useState(null);
    const [selectedGroup, setSelectedGroup] = useState('');

    const [filterTime, setFilterTime] = useState('');
    const [filterName, setFilterName] = useState('');
    const [filterGroup, setFilterGroup] = useState('');
    const [filterAccessPoint, setFilterAccessPoint] = useState('');
    const [filterActivity, setFilterActivity] = useState('');

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

    useEffect(() => {
        if (selectedGroup) { handleFetchData(); }
    }, [selectedGroup, startDate, endDate]);

    const handleFetchData = async () => {
        if (!selectedGroup) return;
        setIsLoading(true); setError(''); setMessage(''); setData([]);
        const token = localStorage.getItem('token');
        const validStartDate = startDate || getTodayStart();
        const validEndDate = endDate || getTodayEnd();
        const formattedStartDate = format(validStartDate, 'yyyy-MM-dd HH:mm:ss');
        const formattedEndDate = format(validEndDate, 'yyyy-MM-dd HH:mm:ss');
        const params = { startDate: formattedStartDate, endDate: formattedEndDate };
        if (selectedGroup !== 'all' && !(userGroupInfo?.ParentGroupID === null && selectedGroup === String(user?.userGroupID))) {
             const actualGroupID = selectedGroup.includes('_only') ? selectedGroup.split('_')[0] : selectedGroup;
             params.groupID = actualGroupID;
        } else if (isAdmin && selectedGroup !== 'all') {
            params.groupID = selectedGroup;
        }

        try {
            const response = await axios.get('/api/activity', { headers: { 'Authorization': `Bearer ${token}` }, params: params });
            setData(response.data);
            if (response.data.length === 0) setMessage('Không tìm thấy dữ liệu.');
        } catch (err) { setError(err.response?.data?.message || 'Lỗi tải dữ liệu'); }
        setIsLoading(false);
    };

    const filteredData = useMemo(() => {
        return data.filter(row =>
            (row.CheckTime?.toLowerCase() || '').includes(filterTime.toLowerCase()) &&
            (row.FullName?.toLowerCase() || '').includes(filterName.toLowerCase()) &&
            (!isAdmin || (row.GroupName?.toLowerCase() || '').includes(filterGroup.toLowerCase())) &&
            (row.AccessPoint?.toLowerCase() || '').includes(filterAccessPoint.toLowerCase()) &&
            (row.ActivityType?.toLowerCase() || '').includes(filterActivity.toLowerCase())
        );
    }, [data, filterTime, filterName, filterGroup, filterAccessPoint, filterActivity, isAdmin]);

    const handleExportExcel = () => {
        if (filteredData.length === 0) { setError('Không có dữ liệu để xuất.'); return; }
        const dataToExport = filteredData.map(row => ({
            'Thời gian': row.CheckTime, 'Họ tên': row.FullName, 'Tên Nhóm': row.GroupName,
            'Tên cửa (AccessPoint)': row.AccessPoint, 'Loại Hoạt động': row.ActivityType
        }));
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'GiamSatRaVao');
        XLSX.writeFile(wb, 'GiamSatRaVao.xlsx');
    };

    // === RENDER ===
    const isParentGroupLeader = !isAdmin && userGroupInfo && userGroupInfo.ParentGroupID === null;
    const showGroupFilter = isAdmin || isParentGroupLeader;
    const childGroups = isParentGroupLeader ? groups.filter(g => g.ParentGroupID === user.userGroupID) : [];

    return (
        <div className="attendance-container">
            <h2>Giám sát Hoạt động Ra/Vào</h2>
            <div className="filter-controls">
                {/* Lọc Ngày/Giờ */}
                <div className="filter-group">
                    <label>Từ ngày-giờ</label>
                    <DatePicker selected={startDate} onChange={(date) => setStartDate(date)} showTimeSelect timeFormat="HH:mm" timeIntervals={15} dateFormat="dd/MM/yyyy HH:mm"/>
                </div>
                <div className="filter-group">
                    <label>Đến ngày-giờ</label>
                    <DatePicker selected={endDate} onChange={(date) => setEndDate(date)} showTimeSelect timeFormat="HH:mm" timeIntervals={15} dateFormat="dd/MM/yyyy HH:mm"/>
                </div>

                {/* Lọc Nhóm (Admin VÀ Trưởng nhóm cha) */}
                {showGroupFilter && (
                    <div className="filter-group">
                        <label>Lọc theo Nhóm</label>
                         <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)}>
                            {isAdmin && <option value="all">-- Tất cả Nhóm --</option>}
                            {isParentGroupLeader && <option value={String(user.userGroupID)}>-- Nhóm của tôi & cấp dưới --</option>} {/* Đổi chữ */}
                            {isParentGroupLeader && <option value={user.userGroupID + '_only'}>-- Chỉ Nhóm của tôi --</option>}
                            {isAdmin && groups.sort((a,b)=>a.GroupName.localeCompare(b.GroupName)).map(group => ( <option key={group.UserGroupID} value={String(group.UserGroupID)}>{group.GroupName} {/* Bỏ hậu tố */}</option> ))}
                            {isParentGroupLeader && childGroups.sort((a,b)=>a.GroupName.localeCompare(b.GroupName)).map(group => ( <option key={group.UserGroupID} value={String(group.UserGroupID)}>{group.GroupName} {/* Bỏ hậu tố */}</option> ))}
                        </select>
                    </div>
                )}

                {/* --- NÚT BẤM (CHỈ CÓ 1 LẦN) --- */}
                <button onClick={handleFetchData} className="action-button btn-fetch">
                    {isLoading ? 'Đang tải...' : 'Lấy dữ liệu'}
                </button>
                <button onClick={handleExportExcel} className="action-button btn-export">
                    Xuất Excel (Đã lọc)
                </button>
                 {/* --- KẾT THÚC NÚT BẤM --- */}
            </div>

            {message && <p className="success-message">{message}</p>}
            {error && <p className="error-message">{error}</p>}

             <div className="data-table-section">
                <h3>Chi tiết Hoạt động</h3>
                <table className="data-table">
                     <thead><tr><th>Thời gian</th><th>Họ tên</th><th>Tên Nhóm</th><th>Cửa</th><th>Hoạt động</th></tr></thead>
                     <tbody>
                         <tr className="filter-row">
                             <td><input type="text" placeholder="Lọc..." value={filterTime} onChange={e => setFilterTime(e.target.value)} /></td>
                             <td><input type="text" placeholder="Lọc..." value={filterName} onChange={e => setFilterName(e.target.value)} /></td>
                             <td><input type="text" placeholder="Lọc..." value={filterGroup} onChange={e => setFilterGroup(e.target.value)} /></td>
                             <td><input type="text" placeholder="Lọc..." value={filterAccessPoint} onChange={e => setFilterAccessPoint(e.target.value)} /></td>
                             <td><input type="text" placeholder="Lọc..." value={filterActivity} onChange={e => setFilterActivity(e.target.value)} /></td>
                         </tr>
                         {filteredData.map((row, index) => (
                             <tr key={index}>
                                 <td>{row.CheckTime}</td><td>{row.FullName}</td>
                                 <td>{row.GroupName}</td>
                                 <td>{row.AccessPoint}</td><td>{row.ActivityType}</td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
            </div>
        </div>
    );
}
export default ActivityLogPage;