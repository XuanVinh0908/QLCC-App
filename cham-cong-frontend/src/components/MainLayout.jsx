import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import './MainLayout.css';
import { useAuth } from '../hooks/useAuth'; 

function MainLayout() {
    const navigate = useNavigate();
    const { isAdmin } = useAuth(); 

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login'); 
    };

    return (
        <div className="app-container">
            <nav className="sidebar">
                <h3 className="sidebar-title">Menu</h3>
                <ul className="nav-list">
                    <li className="nav-item">
                        <Link to="/">Trang tổng quan</Link>
                    </li>
                    <li className="nav-item">
                        <Link to="/attendance">Thông tin Chấm công</Link>
                    </li>
                    {/* LINK MỚI */}
                    <li className="nav-item">
                        <Link to="/activity">Giám sát Ra/Vào</Link>
                    </li>
                    <li className="nav-item">
                        <Link to="/import">Import Chấm công</Link>
                    </li>
                    <li className="nav-item">
                        <Link to="/employees">Quản lý Nhân sự</Link>
                    </li>

                    {/* Khu vực của Admin */}
                    {isAdmin && (
                        <> 
                            <li className="nav-item">
                                <Link to="/groups">Quản lý Nhóm</Link>
                            </li>
                            <li className="nav-item">
                                <Link to="/admin">Quản lý Tài khoản</Link>
                            </li>
                        </>
                    )}
                </ul>
                
                <button onClick={handleLogout} className="logout-button">
                    Đăng xuất
                </button>
            </nav>

            <main className="main-content">
                <Outlet /> 
            </main>
        </div>
    );
}

export default MainLayout;