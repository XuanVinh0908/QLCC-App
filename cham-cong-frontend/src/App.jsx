import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Import các trang
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AttendancePage from './pages/AttendancePage';
import AdminPage from './pages/AdminPage';
import ImportPage from './pages/ImportPage';
import EmployeePage from './pages/EmployeePage';
import GroupPage from './pages/GroupPage';
import ActivityLogPage from './pages/ActivityLogPage'; // <-- Đảm bảo dòng này tồn tại

// Import Layout
import MainLayout from './components/MainLayout';

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
                {/* Các trang con lồng bên trong MainLayout */}
                <Route index element={<DashboardPage />} /> 
                <Route path="attendance" element={<AttendancePage />} />
                <Route path="import" element={<ImportPage />} />
                <Route path="employees" element={<EmployeePage />} />
                <Route path="activity" element={<ActivityLogPage />} /> {/* <-- Đảm bảo dòng này tồn tại */}
                <Route path="groups" element={<GroupPage />} />
                <Route path="admin" element={<AdminPage />} />
            </Route>
            
             {/* Nếu gõ 1 đường link không tồn tại, đá về trang chủ */}
             <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
    );
}

export default App;