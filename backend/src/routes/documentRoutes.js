const { randomUUID } = require('node:crypto');
const express = require('express');
const multer = require('multer');
const config = require('../config');
const fileRepository = require('../repositories/fileRepository');
const documentController = require('../controllers/documentController');

fileRepository.ensureStorageDirectory();

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, config.storageDir),
    filename: (_req, _file, callback) => callback(null, randomUUID()),
  }),
  limits: { fileSize: config.maxFileSizeBytes, files: 1 },
});

const router = express.Router();
router.post(
  '/upload',
  documentController.requireOwner,
  upload.single('file'),
  documentController.uploadDocument,
);
router.get('/documents', documentController.requireOwner, documentController.listDocuments);
router.get(
  '/documents/:id/download',
  documentController.requireOwner,
  documentController.downloadDocument,
);

module.exports = router;