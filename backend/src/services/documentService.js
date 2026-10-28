const path = require('node:path');
const { randomUUID } = require('node:crypto');
const config = require('../config');
const documentRepository = require('../repositories/documentRepository');
const fileRepository = require('../repositories/fileRepository');
const ServiceError = require('./serviceError');

function publicDocument(document) {
  return {
    id: document.id,
    originalName: document.originalName,
    size: document.size,
    uploadedAt: document.uploadedAt,
    owner: document.owner,
  };
}

function normalizeOriginalName(originalName) {
  const fileName = path.basename(String(originalName || '').replace(/\\/g, '/'));
  return fileName.replace(/[\u0000-\u001f\u007f]/g, '_') || 'document';
}

async function createDocument(owner, file) {
  if (!file) {
    throw new ServiceError(400, 'FILE_REQUIRED', 'Envie um arquivo no campo file.');
  }

  const document = {
    id: randomUUID(),
    originalName: normalizeOriginalName(file.originalname),
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner,
    storageName: file.filename,
    mimeType: file.mimetype || 'application/octet-stream',
  };

  let totalStorageBytes;
  try {
    totalStorageBytes = await fileRepository.getTotalBytes();
  } catch (error) {
    await fileRepository.remove(file.filename);
    throw error;
  }

  if (totalStorageBytes > config.maxStorageBytes) {
    await fileRepository.remove(file.filename);
    throw new ServiceError(
      507,
      'STORAGE_LIMIT_REACHED',
      'O limite de armazenamento local foi atingido.',
    );
  }

  try {
    documentRepository.create(document);
  } catch (error) {
    await fileRepository.remove(file.filename);
    throw error;
  }

  return publicDocument(document);
}

function listDocuments(owner) {
  return documentRepository
    .findByOwner(owner)
    .sort((first, second) => second.uploadedAt.localeCompare(first.uploadedAt))
    .map(publicDocument);
}

async function getDocumentForDownload(id, owner) {
  const document = documentRepository.findById(id);
  if (!document || document.owner !== owner) {
    throw new ServiceError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
  }

  if (!(await fileRepository.exists(document.storageName))) {
    throw new ServiceError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
  }

  return {
    document: publicDocument(document),
    fileStream: fileRepository.createReadStream(document.storageName),
  };
}

module.exports = { createDocument, getDocumentForDownload, listDocuments };