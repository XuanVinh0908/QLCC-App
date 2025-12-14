import React from 'react';
import CreateUser from '../components/CreateUser'; // Import component con

// Không cần css riêng nữa vì dùng Bootstrap toàn tập
// import '../components/AdminForms.css'; 

function AdminPage() {
    return (
        <div className="container-fluid p-4">
            <h3 className="mb-4 fw-bold text-dark border-bottom pb-2">
                <i className="bi bi-shield-lock-fill me-2"></i> Quản trị hệ thống
            </h3>
            
            <p className="text-muted mb-4">
                Khu vực dành cho quản trị viên để cấp mới tài khoản và quản lý người dùng.
            </p>

            <div className="row g-4">
                {/* CỘT TRÁI: Component Tạo User (Của bạn đây) */}
                <div className="col-md-5 col-lg-4">
                    <CreateUser />
                </div>

                {/* CỘT PHẢI: Chỗ để hiển thị danh sách User (Sau này làm tiếp) */}
                <div className="col-md-7 col-lg-8">
                    <div className="card shadow-sm border-0 rounded-4 h-100 bg-white">
                        <div className="card-header bg-white fw-bold border-bottom py-3">
                            <i className="bi bi-people-fill me-2"></i> Danh sách tài khoản hiện có
                        </div>
                        <div className="card-body d-flex flex-column align-items-center justify-content-center text-muted opacity-50">
                            <i className="bi bi-table display-1 mb-3"></i>
                            <h5>Danh sách user sẽ hiển thị ở đây</h5>
                            <small>(Chức năng đang phát triển)</small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminPage;