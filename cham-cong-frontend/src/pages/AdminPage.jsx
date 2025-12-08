import React from 'react';
// import CreateGroup from '../components/CreateGroup'; // (Đã dời đi)
import CreateUser from '../components/CreateUser';
import '../components/AdminForms.css'; // (Vẫn cần cho CreateUser)

function AdminPage() {
    return (
        <div>
            <h2>Quản lý Tài khoản (Admin)</h2>
            <p>
                Khu vực này dùng để cấp tài khoản người dùng mới (Admin hoặc User)
                và gán họ vào một nhóm đã tồn tại.
            </p>

            {/* Chỉ còn chức năng Tạo User */}
            <CreateUser />

            {/* CreateGroup đã được chuyển sang GroupPage.jsx */}
        </div>
    );
}

export default AdminPage;