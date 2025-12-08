const jwt = require('jsonwebtoken');

// Middleware này sẽ là "người gác cổng"
const protect = (req, res, next) => {
    let token;

    // Kiểm tra xem header 'Authorization' có tồn tại và bắt đầu bằng 'Bearer' không
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // 1. Tách lấy token (bỏ chữ 'Bearer ')
            token = req.headers.authorization.split(' ')[1];

            // 2. Giải mã token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 3. Gắn thông tin user đã giải mã vào đối tượng `req`
            // để các API phía sau có thể biết ai đang gọi
            req.user = decoded; 

            // 4. Cho phép đi tiếp
            next(); 
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Token không hợp lệ' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Không có quyền truy cập, không tìm thấy token' });
    }
};

module.exports = { protect };