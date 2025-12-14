import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const navigate = useNavigate();

    // Hàm kiểm tra role an toàn
    const checkIsAdmin = (decodedToken) => {
        // Kiểm tra nhiều trường hợp: Role tên là 'Admin' HOẶC RoleID là 1
        if (
            decodedToken.role === 'Admin' || 
            decodedToken.role === 'admin' || 
            decodedToken.RoleName === 'admin' ||
            decodedToken.roleID === 1 ||       // <--- Thêm dòng này (nếu DB lưu ID)
            decodedToken.roleId === 1 ||       
            decodedToken.RoleID === 1 
        ) {
            return true;
        }
        return false;
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                setUser(decoded);
                setIsAdmin(checkIsAdmin(decoded)); // Gọi hàm check
            } catch (error) {
                console.error("Token lỗi:", error);
                localStorage.removeItem('token');
            }
        }
    }, []);

    const login = (token) => {
        localStorage.setItem('token', token);
        try {
            const decoded = jwtDecode(token);
            setUser(decoded);
            setIsAdmin(checkIsAdmin(decoded)); // Gọi hàm check ngay khi login
            navigate('/'); 
        } catch (error) {
            console.error("Lỗi login:", error);
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        setIsAdmin(false);
        navigate('/login');
    };

    return (
        <AuthContext.Provider value={{ user, isAdmin, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};