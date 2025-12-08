import React, { useState } from 'react';
import axios from 'axios';
import ImportSection from '../components/ImportSection';
import './AttendancePage.css'; // Mượn CSS từ trang Attendance để tạo kiểu cho nút

function ImportPage() {
    // State cho nút "Xử lý"
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    // Hàm gọi API 'Process' (copy từ AttendancePage sang)
    const handleProcessData = async () => {
        if (!window.confirm('Bạn có chắc muốn xử lý dữ liệu chấm công thô? Dữ liệu đã xử lý trước đó sẽ được cập nhật.')) {
            return;
        }
        setIsLoading(true);
        setError('');
        setMessage('');
        const token = localStorage.getItem('token');
        try {
            const response = await axios.post(
                '/api/attendance/process',
                {}, // Không cần body
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            setMessage(response.data.message);
        } catch (err) {
            setError(err.response?.data?.message || 'Lỗi khi xử lý dữ liệu');
        }
        setIsLoading(false);
    };

    return (
        <div>
            <h2>Import Dữ liệu Chấm công</h2>
            
            {/* BƯỚC 1: IMPORT FILE */}
            <ImportSection 
                title="Bước 1: Tải lên file chấm công (thô)"
                apiUrl="/api/import/attendance"
                requiredColumns="SourceEmployeeID, CheckTime"
            />

            {/* BƯỚC 2: XỬ LÝ DỮ LIỆU (Mới thêm vào) */}
            <div className="admin-form-section" style={{marginTop: '2rem'}}>
                <h3>Bước 2: Xử lý dữ liệu thô (Tính MIN/MAX)</h3>
                <p>
                    Sau khi import file, hãy bấm nút này để hệ thống
                    tính toán giờ vào (sớm nhất) và giờ ra (muộn nhất) trong ngày.
                </p>
                
                <button 
                    onClick={handleProcessData} 
                    className="action-button btn-process"
                    disabled={isLoading}
                >
                    {isLoading ? 'Đang xử lý...' : 'Bắt đầu Xử lý Dữ liệu'}
                </button>

                {/* Hiển thị thông báo */}
                {message && <p className="success-message" style={{marginTop: '1rem'}}>{message}</p>}
                {error && <p className="error-message" style={{marginTop: '1rem'}}>{error}</p>}
            </div>
        </div>
    );
}

export default ImportPage;