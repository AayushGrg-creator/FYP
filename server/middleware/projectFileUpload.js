'use strict';

/**
 * middleware/projectFileUpload.js
 *
 * Separate from uploadMiddleware.js (which is avatar-specific: images only,
 * forced 500x500 crop). Project deliverables can be any common file type
 * (PDFs, docs, zips, images, spreadsheets), so this uses resource_type:
 * 'auto' so Cloudinary handles non-image files correctly, and applies no
 * image transformation.
 */

const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const ALLOWED_FORMATS = [
  'jpg', 'jpeg', 'png', 'gif', 'webp',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'txt', 'csv', 'zip', 'rar',
];

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isImage = file.mimetype.startsWith('image/');
    return {
      folder: 'tasktide/project-files',
      resource_type: isImage ? 'image' : 'raw', // non-images (pdf, docx, zip, etc.)
      // bypass Cloudinary's image-delivery PDF/ZIP restriction entirely
      allowed_formats: ALLOWED_FORMATS,
    };
  },
});

const uploadProjectFile = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB cap
});

module.exports = uploadProjectFile;