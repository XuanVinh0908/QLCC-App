import React, { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth'; 

// Import ảnh nền (Sửa đường dẫn nếu cần)
import bgImage from '../assets/background.webp'; 

function MainLayout() {
    const navigate = useNavigate();
    const location = useLocation(); 
    const { isAdmin } = useAuth(); 
    
    // State quản lý đóng/mở menu
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    
    // State xác định màn hình nhỏ (mobile)
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    // Tự động đóng menu nếu là màn hình nhỏ khi mới vào
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (mobile) setIsSidebarOpen(false);
            else setIsSidebarOpen(true);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login'); 
    };

    const isActive = (path) => location.pathname === path 
        ? 'active bg-primary text-white shadow-sm' 
        : 'text-dark hover-bg-light';

    // Kích thước menu
    const sidebarWidth = '280px';

    return (
        // 1. CONTAINER CHÍNH (Chứa ảnh nền)
        <div 
            className="min-vh-100 position-relative"
            style={{
                backgroundImage: `url(${bgImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed',
                overflowX: 'hidden' // Ngăn thanh cuộn ngang
            }}
        >
            {/* Lớp phủ mờ nền */}
            <div className="min-vh-100" style={{ backgroundColor: 'rgba(255, 255, 255, 0.4)' }}>
                
                {/* --- 2. SIDEBAR (MENU TRÁI - FIX CỨNG VÀO CẠNH TRÁI) --- */}
                <aside 
                    className="border-end d-flex flex-column transition-all bg-white"
                    style={{
                        position: 'fixed',      // 👈 QUAN TRỌNG: Ghim cố định
                        top: 0,
                        left: 0,
                        height: '100vh',        // Cao full màn hình
                        width: isSidebarOpen ? sidebarWidth : '0px', 
                        zIndex: 1050,           // 👈 QUAN TRỌNG: Cao hơn mọi thứ (Bootstrap modal thường là 1050)
                        overflowX: 'hidden',    // Giấu nội dung khi đóng
                        overflowY: 'auto',      // Cho phép cuộn dọc trong menu
                        transition: 'width 0.3s ease',
                        whiteSpace: 'nowrap',   // Không xuống dòng chữ
                        // Hiệu ứng kính mờ
                        backgroundColor: 'rgba(255, 255, 255, 0.85)', 
                        backdropFilter: 'blur(12px)',
                        boxShadow: isSidebarOpen ? '4px 0 15px rgba(0,0,0,0.1)' : 'none'
                    }}
                >
                    {/* Header Menu */}
<div 
    className="p-3 border-bottom d-flex align-items-center justify-content-center" 
    style={{
        minHeight: '70px', // Đổi height thành minHeight để khung tự giãn cao nếu chữ xuống dòng
        flexShrink: 0
    }}
>
    <h5 
        className="fw-bold text-primary m-0" 
        style={{
            textShadow: '1px 1px 0px rgba(255,255,255,1)',
            whiteSpace: 'normal', // QUAN TRỌNG: Cho phép xuống dòng
            textAlign: 'center',  // Căn giữa cho đẹp
            lineHeight: '1.4',    // Chỉnh khoảng cách dòng
            fontSize: '1.1rem'    // (Tùy chọn) Giảm nhẹ cỡ chữ nếu tên quá dài
        }}
    >
        <i className="bi bi-clock-history me-2"></i> HỆ THỐNG QUẢN LÝ CHẤM CÔNG
    </h5>
</div>

                    {/* Danh sách Link */}
                    <div className="nav flex-column p-3 gap-2 flex-grow-1">
                        <small className="text-secondary fw-bold ms-2 text-uppercase" style={{fontSize: '0.7rem', letterSpacing: '1px'}}>Chung</small>
                        <Link to="/" className={`nav-link rounded fw-bold px-3 py-2 ${isActive('/')}`}>
                            <i className="bi bi-grid-fill me-2"></i> Tổng quan
                        </Link>
                        <Link to="/attendance" className={`nav-link rounded fw-bold px-3 py-2 ${isActive('/attendance')}`}>
                            <i className="bi bi-calendar-check me-2"></i> Chấm công
                        </Link>
                        <Link to="/activity" className={`nav-link rounded fw-bold px-3 py-2 ${isActive('/activity')}`}>
                            <i className="bi bi-eye-fill me-2"></i> Giám sát Ra/Vào
                        </Link>

                        <div className="my-2 border-top border-secondary opacity-25"></div>
                        <small className="text-secondary fw-bold ms-2 text-uppercase" style={{fontSize: '0.7rem', letterSpacing: '1px'}}>Quản lý</small>
                        
                        <Link to="/import" className={`nav-link rounded fw-bold px-3 py-2 ${isActive('/import')}`}>
                            <i className="bi bi-file-earmark-arrow-up-fill me-2"></i> Import Dữ liệu
                        </Link>
                        <Link to="/employees" className={`nav-link rounded fw-bold px-3 py-2 ${isActive('/employees')}`}>
                            <i className="bi bi-people-fill me-2"></i> Nhân sự
                        </Link>

                        {isAdmin && (
                            <>
                                <div className="my-2 border-top border-secondary opacity-25"></div>
                                <small className="text-secondary fw-bold ms-2 text-uppercase" style={{fontSize: '0.7rem', letterSpacing: '1px'}}>Admin</small>
                                <Link to="/groups" className={`nav-link rounded fw-bold px-3 py-2 ${isActive('/groups')}`}>
                                    <i className="bi bi-diagram-3-fill me-2"></i> Cơ cấu tổ chức
                                </Link>
                                <Link to="/admin" className={`nav-link rounded fw-bold px-3 py-2 ${isActive('/admin')}`}>
                                    <i className="bi bi-shield-lock-fill me-2"></i> Tài khoản
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Footer Menu */}
                    <div className="p-3 border-top" style={{flexShrink: 0}}>
                        <button onClick={handleLogout} className="btn btn-danger w-100 shadow-sm">
                            <i className="bi bi-box-arrow-right me-2"></i> Đăng xuất
                        </button>
                    </div>
                </aside>

                {/* --- 3. MAIN CONTENT (NỘI DUNG BÊN PHẢI) --- */}
                <div 
                    className="d-flex flex-column min-vh-100 transition-all"
                    style={{
                        // 👈 QUAN TRỌNG: Tự động lùi vào khi menu mở (trừ khi là mobile)
                        marginLeft: (isSidebarOpen && !isMobile) ? sidebarWidth : '0px',
                        transition: 'margin-left 0.3s ease',
                        width: 'auto'
                    }}
                >
                    {/* Topbar */}
                    <header 
                        className="border-bottom shadow-sm px-4 d-flex align-items-center justify-content-between sticky-top" 
                        style={{
                            height: '70px',
                            backgroundColor: 'rgba(255, 255, 255, 0.75)', 
                            backdropFilter: 'blur(10px)',
                            zIndex: 1040 // Thấp hơn menu (1050) một chút
                        }}
                    >
                        <div className="d-flex align-items-center">
                            <button 
                                className="btn btn-light shadow-sm border me-3" 
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            >
                                <i className="bi bi-list fs-5"></i>
                            </button>
                            <h5 className="m-0 text-dark fw-bold d-none d-md-block">Hệ thống Quản lý</h5>
                        </div>

                        <div className="d-flex align-items-center">
                            <span className="me-2 fw-bold text-dark text-end lh-sm">
                                Xin chào,<br/>
                                <small className="text-primary">{isAdmin ? 'Administrator' : 'Nhân viên'}</small>
                            </span>
                            <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center shadow-sm" style={{width: '40px', height: '40px'}}>
                                <i className="bi bi-person-fill fs-5"></i>
                            </div>
                        </div>
                    </header>

                    {/* Nội dung trang Dashboard/Con */}
                    <main className="flex-grow-1 p-3">
                        <Outlet />
                    </main>
                </div>

                {/* Overlay đen mờ khi mở menu trên Mobile (để bấm ra ngoài là đóng) */}
                {isMobile && isSidebarOpen && (
                    <div 
                        className="position-fixed top-0 start-0 w-100 h-100"
                        style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1045 }}
                        onClick={() => setIsSidebarOpen(false)}
                    ></div>
                )}
            </div>
        </div>
    );
}

export default MainLayout;