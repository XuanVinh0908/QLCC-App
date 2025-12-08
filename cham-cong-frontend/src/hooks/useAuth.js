import { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode'; // Thư viện giải mã token

export const useAuth = () => {
    const [auth, setAuth] = useState({ token: null, user: null });

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                // Giải mã token để lấy thông tin user (payload)
                const decodedToken = jwtDecode(token); 
                setAuth({ token: token, user: decodedToken });
            } catch (error) {
                console.error("Token không hợp lệ:", error);
                // Nếu token lỗi (vd: hết hạn, bị sửa), xóa nó đi
                localStorage.removeItem('token');
            }
        }
    }, []); // Mảng rỗng [] nghĩa là chỉ chạy 1 lần khi tải

    // Trả về thông tin user và vai trò
    return {
        token: auth.token,
        user: auth.user,
        // Kiểm tra xem user có tồn tại VÀ role có phải là 'Admin' không
        isAdmin: auth.user ? auth.user.role === 'Admin' : false
    };
};