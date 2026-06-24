const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Yêu cầu đăng nhập để thực hiện chức năng này.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'locafy_secret_key_2026_super_secure_fallback');
    req.user = decoded; // Contains { id, email, role }
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Mã xác thực không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.' });
  }
};
