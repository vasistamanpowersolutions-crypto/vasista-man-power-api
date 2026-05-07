const imagekit = require('../config/imagekit');
const sharp = require('sharp');
const asyncHandler = require('express-async-handler');

/**
 * @desc    Upload and optimize image
 * @route   POST /api/upload/image
 * @access  Public (or Private as needed)
 */
const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('Please upload an image');
  }

  try {
    // 1. Process image with Sharp to target ~60KB
    // We resize to a reasonable max size and compress
    const optimizedImageBuffer = await sharp(req.file.buffer)
      .resize({ width: 1024, withoutEnlargement: true }) // Don't upscale
      .jpeg({ 
        quality: 70, // Target high compression
        progressive: true,
        mozjpeg: true 
      })
      .toBuffer();

    // 2. Upload to ImageKit
    const uploadResponse = await imagekit.upload({
      file: optimizedImageBuffer,
      fileName: `optimized_${Date.now()}_${req.file.originalname}`,
      folder: '/uploads/optimized'
    });

    res.status(200).json({
      success: true,
      url: uploadResponse.url,
      size: uploadResponse.size, // Size in bytes
      width: uploadResponse.width,
      height: uploadResponse.height
    });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500);
    throw new Error('Image processing or upload failed: ' + error.message);
  }
});

module.exports = {
  uploadImage
};
