const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('../utils/cloudinary');

// Setup Multer to store uploaded files in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// POST /api/upload: Upload single file (image, video, doc) to Cloudinary
router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Không tìm thấy file nào được tải lên.' });
  }

  try {
    // Check if Cloudinary credentials are set up
    const isConfigured = 
      process.env.CLOUDINARY_CLOUD_NAME && 
      process.env.CLOUDINARY_API_KEY && 
      process.env.CLOUDINARY_API_SECRET;

    if (!isConfigured) {
      return res.status(500).json({ 
        error: 'Cloudinary chưa được cấu hình. Vui lòng thêm Cloudinary keys vào file .env.' 
      });
    }

    // Convert file buffer to base64 Data URI string
    const fileBase64 = req.file.buffer.toString('base64');
    const fileUri = `data:${req.file.mimetype};base64,${fileBase64}`;

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(fileUri, {
      folder: 'locafy_uploads', // folder name on Cloudinary dashboard
      resource_type: 'auto',   // auto detect image, video, pdf, etc.
    });

    res.status(200).json({
      ok: true,
      url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
      bytes: uploadResult.bytes,
      format: uploadResult.format,
      resource_type: uploadResult.resource_type,
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({ 
      error: error.message || 'Có lỗi xảy ra khi tải file lên Cloudinary.' 
    });
  }
});

module.exports = router;
