const sharp = require('sharp');
const imagekit = require('../config/imagekit');

/**
 * Compress base64 image to approximately 60KB
 * @param {string} base64String - Base64 encoded image string (with or without data URI prefix)
 * @param {string} imageName - Name for the image
 * @returns {Promise<Buffer>} - Compressed image buffer
 */
const compressImage = async (base64String, imageName = 'image') => {
  try {
    if (!base64String) {
      throw new Error('No image data provided');
    }

    console.log(`Compressing image: ${imageName}, input length: ${base64String.length}`);

    // Remove data URI prefix if present
    const cleanBase64 = base64String.replace(/^data:image\/\w+;base64,/, '');
    
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(cleanBase64, 'base64');

    console.log(`Buffer size: ${imageBuffer.length} bytes`);

    // Compress with sharp - target ~60KB
    const compressedBuffer = await sharp(imageBuffer)
      .resize({
        width: 1200,
        height: 1200,
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({
        quality: 65,
        progressive: true,
        mozjpeg: true
      })
      .toBuffer();

    console.log(`Compressed buffer size: ${compressedBuffer.length} bytes`);
    return compressedBuffer;
  } catch (error) {
    console.error('Image compression error:', error);
    throw new Error(`Image compression failed: ${error.message}`);
  }
};

/**
 * Upload compressed image to ImageKit and return URL
 * @param {Buffer} imageBuffer - Compressed image buffer
 * @param {string} fileName - File name for ImageKit
 * @param {string} folder - Folder path in ImageKit (e.g., '/candidates/aadhar')
 * @returns {Promise<Object>} - Object with url, fileId, size, width, height
 */
const uploadImageToImageKit = async (imageBuffer, fileName, folder = '/candidates') => {
  try {
    const uniqueFileName = `${Date.now()}_${fileName}`;
    
    const uploadResponse = await imagekit.upload({
      file: imageBuffer,
      fileName: uniqueFileName,
      folder: folder,
      tags: ['candidate', 'document'],
      isPrivateFile: false
    });

    return {
      url: uploadResponse.url,
      fileId: uploadResponse.fileId,
      size: uploadResponse.size,
      width: uploadResponse.width,
      height: uploadResponse.height
    };
  } catch (error) {
    throw new Error(`ImageKit upload failed: ${error.message}`);
  }
};

/**
 * Compress and upload image in one step
 * @param {string} base64String - Base64 encoded image
 * @param {string} fileName - File name
 * @param {string} folder - Folder path in ImageKit
 * @returns {Promise<Object>} - Upload result with URL
 */
const compressAndUploadImage = async (base64String, fileName, folder = '/candidates') => {
  try {
    if (!base64String) {
      return null;
    }

    const compressedBuffer = await compressImage(base64String, fileName);
    const uploadResult = await uploadImageToImageKit(compressedBuffer, fileName, folder);
    
    return uploadResult.url;
  } catch (error) {
    throw new Error(`Compress and upload failed: ${error.message}`);
  }
};

/**
 * Process multiple images in parallel
 * @param {Object} imageData - Object with image fields {aadharFront, aadharBack, panCard, profilePhoto}
 * @returns {Promise<Object>} - Object with URLs for each image field
 */
const processMultipleImages = async (imageData) => {
  try {
    const uploadPromises = {};

    if (imageData.aadharFront) {
      uploadPromises.aadharFront = compressAndUploadImage(
        imageData.aadharFront,
        'aadhar-front.jpg',
        '/candidates/aadhar'
      );
    }

    if (imageData.aadharBack) {
      uploadPromises.aadharBack = compressAndUploadImage(
        imageData.aadharBack,
        'aadhar-back.jpg',
        '/candidates/aadhar'
      );
    }

    if (imageData.panCard) {
      uploadPromises.panCard = compressAndUploadImage(
        imageData.panCard,
        'pan-card.jpg',
        '/candidates/pan'
      );
    }

    if (imageData.profilePhoto) {
      uploadPromises.profilePhoto = compressAndUploadImage(
        imageData.profilePhoto,
        'profile-photo.jpg',
        '/candidates/profile'
      );
    }

    // Execute all uploads in parallel
    const results = await Promise.allSettled(Object.values(uploadPromises));
    
    const processedImages = {};
    const keys = Object.keys(uploadPromises);
    
    keys.forEach((key, index) => {
      if (results[index].status === 'fulfilled') {
        processedImages[key] = results[index].value || '';
      } else {
        console.error(`Failed to upload ${key}:`, results[index].reason);
        processedImages[key] = '';
      }
    });

    return processedImages;
  } catch (error) {
    throw new Error(`Process multiple images failed: ${error.message}`);
  }
};

module.exports = {
  compressImage,
  uploadImageToImageKit,
  compressAndUploadImage,
  processMultipleImages
};
