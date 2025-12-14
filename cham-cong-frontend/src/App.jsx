import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// --- 1. QUAN TRỌNG: Thêm Import Bootstrap để giao diện KHÔNG BỊ VỠ ---
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

// Import các trang (Giữ nguyên theo file bạn gửi)
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard'; 
import AttendancePage from './pages/AttendancePage';
import AdminPage from './pages/AdminPage';
import ImportPage from './pages/ImportPage';
import EmployeePage from './pages/EmployeePage';
import GroupPage from './pages/GroupPage';
import ActivityLogPage from './pages/ActivityLogPage';

// Import Layout & Auth Context
import MainLayout from './components/MainLayout';
import { AuthProvider } from './hooks/useAuth'; // Cần cái này để MainLayout biết ai là Admin

// Giữ nguyên logic bảo vệ Router của bạn
function ProtectedRoute({ children }) {
    const token = localStorage.getItem('token');
    return token ? children : <Navigate to="/login" replace />;
}

function GuestRoute({ children }) {
    const token = localStorage.getItem('token');
    return token ? <Navigate to="/" replace /> : children;
}

function App() {
    return (
        // Bọc AuthProvider ở ngoài cùng để toàn bộ App nhận diện được User/Admin
        <AuthProvider>
            <Routes>
                {/* Tuyến đường cho khách (chưa đăng nhập) */}
                <Route
                    path="/login"
                    element={
                        <GuestRoute>
                            <LoginPage />
                        </GuestRoute>
                    }
                />

                {/* Tuyến đường được bảo vệ (đã đăng nhập) */}
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <MainLayout />
                        </ProtectedRoute>
                    }
                >
                    {/* Trang chủ mặc định vào Dashboard */}
                    <Route index element={<Dashboard />} /> 
                    
                    {/* Các trang chức năng (Giữ nguyên như cũ) */}
                    <Route path="attendance" element={<AttendancePage />} />
                    <Route path="import" element={<ImportPage />} />
                    <Route path="employees" element={<EmployeePage />} />
                    <Route path="activity" element={<ActivityLogPage />} />
                    
                    {/* Các trang Admin */}
                    <Route path="groups" element={<GroupPage />} />
                    <Route path="admin" element={<AdminPage />} />
                </Route>
                
                {/* Nếu gõ link sai -> Về trang chủ */}
                <Route path="*" element={<Navigate to="/" replace />} />

            </Routes>
        </AuthProvider>
    );
}

export default App;