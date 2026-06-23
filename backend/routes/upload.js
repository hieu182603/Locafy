const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cloudinary = require('../utils/cloudinary');

// Setup Multer to store uploaded files in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// POST /api/upload: Upload single file (image, video, doc) to Cloudinary or local fallback
router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Không tìm thấy file nào được tải lên.' });
  }

  // Convert file buffer to base64 Data URI string
  const fileBase64 = req.file.buffer.toString('base64');
  const fileUri = `data:${req.file.mimetype};base64,${fileBase64}`;

  try {
    // Check if Cloudinary credentials are set up
    const isConfigured = 
      process.env.CLOUDINARY_CLOUD_NAME && 
      process.env.CLOUDINARY_API_KEY && 
      process.env.CLOUDINARY_API_SECRET;

    if (!isConfigured) {
      throw new Error('Cloudinary config missing');
    }

    // Try Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(fileUri, {
      folder: 'locafy_uploads', // folder name on Cloudinary dashboard
      resource_type: 'auto',   // auto detect image, video, pdf, etc.
    });

    return res.status(200).json({
      ok: true,
      url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
      bytes: uploadResult.bytes,
      format: uploadResult.format,
      resource_type: uploadResult.resource_type,
    });
  } catch (error) {
    console.warn('Cloudinary upload failed, falling back to local file storage:', error.message || error);

    try {
      // Dynamic directory creation
      const uploadsDir = path.join(__dirname, '../uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Generate unique filename
      const ext = path.extname(req.file.originalname) || '.jpg';
      const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
      const filePath = path.join(uploadsDir, filename);

      // Write file buffer to local storage
      fs.writeFileSync(filePath, req.file.buffer);

      // Return local url pointing to localhost:5000/uploads
      const localUrl = `http://localhost:5000/uploads/${filename}`;
      
      return res.status(200).json({
        ok: true,
        url: localUrl,
        public_id: filename,
        bytes: req.file.size,
        format: ext.replace('.', ''),
        resource_type: req.file.mimetype.split('/')[0],
        isLocalFallback: true
      });
    } catch (localError) {
      console.error('Local upload fallback error:', localError);
      return res.status(500).json({ 
        error: 'Tải file thất bại (lỗi Cloudinary và lỗi lưu cục bộ).' 
      });
    }
  }
});

module.exports = router;
