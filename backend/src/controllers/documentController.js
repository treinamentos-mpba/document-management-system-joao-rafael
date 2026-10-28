const documentService = require('../services/documentService');
const ServiceError = require('../services/serviceError');

function requireOwner(req, res, next) {
  const owner = req.get('X-User-Id')?.trim();
  if (!owner) {
    return next(
      new ServiceError(400, 'USER_ID_REQUIRED', 'O cabeçalho X-User-Id é obrigatório.'),
    );
  }

  req.owner = owner;
  return next();
}

async function uploadDocument(req, res) {
  const document = await documentService.createDocument(req.owner, req.file);
  res.status(201).json({ document });
}

function listDocuments(req, res) {
  res.json({ documents: documentService.listDocuments(req.owner) });
}

async function downloadDocument(req, res, next) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.id)) {
    throw new ServiceError(400, 'INVALID_DOCUMENT_ID', 'Identificador de documento inválido.');
  }

  const { document, filePath } = await documentService.getDocumentForDownload(
    req.params.id,
    req.owner,
  );

  res.download(
    filePath,
    document.originalName,
    {
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Content-Type-Options': 'nosniff',
      },
    },
    (error) => {
      if (error) {
        next(error);
      }
    },
  );
}

module.exports = { downloadDocument, listDocuments, requireOwner, uploadDocument };