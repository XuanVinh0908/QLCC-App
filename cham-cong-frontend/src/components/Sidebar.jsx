import React from 'react';
import { Link } from 'react-router-dom';

const Sidebar = () => {
    return (
        <div className="bg-white border-end h-100 d-flex flex-column p-3">
            {/* Logo hoặc Tên App */}
            <div className="mb-4 text-center">
                <h4 className="fw-bold text-primary">CHẤM CÔNG</h4>
            </div>

            {/* Danh sách Menu */}
            <div className="nav flex-column gap-2">
                <Link to="/dashboard" className="nav-link btn btn-light text-start fw-bold text-dark">
                    <i className="bi bi-grid-fill me-2"></i> Dashboard
                </Link>
                <Link to="/employees" className="nav-link btn btn-light text-start text-secondary">
                    <i className="bi bi-people-fill me-2"></i> Nhân viên
                </Link>
                <Link to="/attendance" className="nav-link btn btn-light text-start text-secondary">
                    <i className="bi bi-calendar-check-fill me-2"></i> Chấm công
                </Link>
                {/* Thêm các menu khác tùy ý */}
            </div>

            <div className="mt-auto border-top pt-3">
                <button className="btn btn-danger w-100">
                    <i className="bi bi-box-arrow-right me-2"></i> Đăng xuất
                </button>
            </div>
        </div>
    );
};

export default Sidebar;