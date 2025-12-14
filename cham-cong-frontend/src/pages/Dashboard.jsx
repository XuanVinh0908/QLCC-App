import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const Dashboard = () => {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchDashboardData = async () => {
        try {
            const token = localStorage.getItem('token'); 
            const response = await axios.get('/api/dashboard/stats', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStats(response.data);
            setLoading(false);
        } catch (err) {
            console.error("Lỗi tải dashboard:", err);
            setLoading(false); 
        }
    };

    useEffect(() => {
        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 30000); 
        return () => clearInterval(interval);
    }, []);

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center h-100">
            <div className="spinner-border text-light" role="status"></div>
            <span className="ms-2 text-light fw-bold">Đang tải dữ liệu...</span>
        </div>
    );

    return (
        // Bỏ hết code background image ở đây, chỉ giữ lại container
        <div className="container-fluid p-4">
            <h3 className="mb-4 fw-bold text-dark border-bottom border-dark pb-2 d-inline-block">
                <i className="bi bi-speedometer2 me-2"></i> Tổng Quan Chấm Công
            </h3>
            
            {stats.length === 0 ? (
                <div className="alert alert-light shadow-sm">Chưa có dữ liệu hiển thị.</div>
            ) : (
                <div className="row g-4"> 
                    {stats.map((item) => {
                        let percentColor = 'text-success';
                        let cardBorderColor = 'border-success';
                        
                        if(item.percent < 50) { 
                            percentColor = 'text-danger'; 
                            cardBorderColor = 'border-danger';
                        } else if(item.percent < 80) { 
                            percentColor = 'text-warning'; 
                            cardBorderColor = 'border-warning';
                        }

                        const chartData = {
                            labels: ['Đã đến', 'Vắng mặt'],
                            datasets: [{
                                data: [item.present, item.absent],
                                backgroundColor: ['#28a745', '#dc3545'], 
                                borderWidth: 0,
                            }],
                        };

                        const chartOptions = {
                            plugins: { legend: { display: false }, tooltip: { enabled: true } },
                            cutout: '70%', 
                            responsive: true,
                            maintainAspectRatio: false,
                        };

                        return (
                            <div key={item.groupId} className="col-12 col-md-6 col-lg-4 col-xl-3">
                                <div className={`card h-100 shadow rounded-4 border-top border-5 ${cardBorderColor} border-0 bg-white`}>
                                    <div className="card-header bg-transparent border-0 pt-4 text-center">
                                        <div className="fw-bold text-uppercase text-primary mb-0 text-truncate fs-2" style={{ fontWeight: '800' }}>
                                            {item.name}
                                        </div>
                                    </div>
                                    <div className="card-body pt-1 d-flex flex-column">
                                        <div className="text-center mb-3">
                                            <span className={`fw-bold display-5 ${percentColor}`}>{item.percent}%</span>
                                            <span className="fw-bold fs-5 text-secondary ms-2 text-uppercase">Có mặt</span>
                                        </div>
                                        <div className="position-relative mx-auto mb-4" style={{ height: '150px', width: '150px' }}>
                                            <Doughnut data={chartData} options={chartOptions} />
                                        </div>
                                        <div className="mt-auto bg-light rounded-3 p-3 border">
                                            <div className="d-flex justify-content-between align-items-center mb-2 border-bottom pb-2">
                                                <span className="fw-bold text-secondary">Tổng nhân sự:</span>
                                                <span className="badge bg-dark rounded-pill fs-6">{item.total}</span>
                                            </div>
                                            <div className="d-flex justify-content-between align-items-center py-1">
                                                <span className="fw-bold text-success">Đã đến:</span>
                                                <span className="fw-bold fs-5 text-dark">{item.present}</span>
                                            </div>
                                            <div className="d-flex justify-content-between align-items-center py-1">
                                                <span className="fw-bold text-danger">Vắng mặt:</span>
                                                <span className="fw-bold fs-5 text-dark">{item.absent}</span>
                                            </div>
                                            <div className="d-flex justify-content-between align-items-center py-1 border-top mt-1 pt-1">
                                                <span className="fw-bold text-warning text-dark">Đi muộn:</span>
                                                <span className="fw-bold fs-5 text-dark">{item.late}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Dashboard;