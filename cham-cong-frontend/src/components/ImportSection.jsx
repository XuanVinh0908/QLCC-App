import React, { useState } from 'react';
import axios from 'axios';
import './ImportSection.css';

// Thêm prop onImportSuccess
function ImportSection({ title, apiUrl, requiredColumns, onImportSuccess }) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
        setMessage('');
        setError('');
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            setError('Vui lòng chọn một file Excel');
            return;
        }

        setIsLoading(true);
        setMessage('');
        setError('');

        const formData = new FormData();
        formData.append('file', selectedFile);
        const token = localStorage.getItem('token'); 

        try {
            const response = await axios.post(
                apiUrl, // <-- Chỉ cần dùng apiUrl (nó đã là '/api/import/...'),
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'Authorization': `Bearer ${token}` // LUÔN GỬI TOKEN
                    }
                }
            );
            
            setMessage(response.data.message);
            
            // BÁO CHO CHA (EmployeePage) BIẾT ĐÃ THÀNH CÔNG
            if (onImportSuccess) {
                onImportSuccess();
            }
            
        } catch (err) {
            console.error('Lỗi upload:', err);
            if (err.response && err.response.data.message) {
                setError(err.response.data.message);
            } else {
                setError('Lỗi kết nối. Không thể upload file.');
            }
        } finally {
            setIsLoading(false);
            setSelectedFile(null);
            document.getElementById(apiUrl).value = null; 
        }
    };

    return (
        <div className="import-section">
            <h3>{title}</h3>
            <p className="column-info">Các cột yêu cầu: <strong>{requiredColumns}</strong></p>
            
            <input 
                type="file" 
                id={apiUrl}
                onChange={handleFileChange} 
                accept=".xlsx, .xls"
            />
            
            <button 
                onClick={handleUpload} 
                disabled={isLoading || !selectedFile}
                className="upload-button"
            >
                {isLoading ? 'Đang tải lên...' : 'Upload'}
            </button>

            {message && <p className="success-message">{message}</p>}
            {error && <p className="error-message">{error}</p>}
        </div>
    );
}

export default ImportSection;