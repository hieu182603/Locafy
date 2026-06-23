const jwt = require('jsonwebtoken');

/**
 * adminMiddleware – xác thực token VÀ kiểm tra role === 'admin'.
 * Dùng thay cho authMiddleware + check role lặp đi lặp lại trong mỗi route.
 */
module.exports = function adminMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Yêu cầu đăng nhập.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'locafy_secret_key_2026_super_secure_fallback'
    );
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Chỉ admin mới có quyền truy cập.' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn.' });
  }
};
