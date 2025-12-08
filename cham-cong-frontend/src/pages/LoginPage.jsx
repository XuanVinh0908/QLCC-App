import React, { useState } from 'react';
import axios from 'axios';
import './LoginPage.css';
import { useNavigate } from 'react-router-dom'; // <-- 1. IMPORT

function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const navigate = useNavigate(); // <-- 2. GỌI HOOK

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        try {
            const response = await axios.post('/api/auth/login', { 
                username: username,
                password: password
            });

            console.log('Đăng nhập thành công:', response.data);
            localStorage.setItem('token', response.data.token);
            
            // alert('Đăng nhập thành công!'); // <-- 3. XÓA DÒNG NÀY
            navigate('/home'); // <-- 4. THAY BẰNG DÒNG NÀY

        } catch (err) {
            // ... (phần còn lại giữ nguyên) ...
            console.error('Lỗi đăng nhập:', err);
            if (err.response && err.response.data.message) {
                setError(err.response.data.message);
            } else {
                setError('Không thể kết nối tới server. Vui lòng thử lại.');
            }
        }
    };

    // ... (Phần return HTML giữ nguyên) ...
    return (
        <div className="login-container">
            <form className="login-form" onSubmit={handleSubmit}>
                <h2>Đăng nhập Chấm công</h2>
                
                {error && <p className="error-message">{error}</p>}
                
                <div className="form-group">
                    <label htmlFor="username">Tên đăng nhập</label>
                    <input
                        type="text"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>
                
                <div className="form-group">
                    <label htmlFor="password">Mật khẩu</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                
                <button type="submit" className="login-button">Đăng nhập</button>
            </form>
        </div>
    );
}

export default LoginPage;