// Seed do servidor backend do Document Management System.
//
// Este arquivo é apenas um ponto de partida mínimo. Ao longo do workshop você
// vai usar o Agent Mode do GitHub Copilot para construir as camadas:
//   - routes/       (definição das rotas)
//   - controllers/  (entrada HTTP e validação)
//   - services/     (regras de negócio)
//   - repositories/ (persistência: arquivos locais + metadados em memória)
//
// Restrição do projeto: uploads são gravados no filesystem local da aplicação
// usando multer com diskStorage. Não utilize provedores externos.

const express = require('express');
const multer = require('multer');
const config = require('./config');
const documentRoutes = require('./routes/documentRoutes');
const ServiceError = require('./services/serviceError');

const app = express();

app.use(express.json());

// Endpoint de verificação de saúde. As demais rotas (/upload, /documents,
// /documents/:id/download) serão implementadas durante o Passo 2.
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use(documentRoutes);

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  let status = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  let message = 'Ocorreu um erro interno.';

  if (error instanceof ServiceError) {
    ({ status, code, message } = error);
  } else if (error instanceof multer.MulterError) {
    status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    code = error.code === 'LIMIT_FILE_SIZE' ? 'FILE_TOO_LARGE' : 'INVALID_MULTIPART';
    message =
      status === 413
        ? 'O arquivo excede o limite permitido.'
        : 'A requisição de upload é inválida.';
  } else if (
    req.is('multipart/form-data') &&
    ['Unexpected end of form', 'Multipart: Boundary not found', 'Unexpected end of multipart data'].includes(
      error.message,
    )
  ) {
    status = 400;
    code = 'INVALID_MULTIPART';
    message = 'A requisição de upload é inválida.';
  } else if (error.code === 'ENOENT' && req.path.startsWith('/documents/')) {
    status = 404;
    code = 'DOCUMENT_NOT_FOUND';
    message = 'Documento não encontrado.';
  } else {
    console.error(error);
  }

  return res.status(status).json({ error: { code, message } });
});

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`DMS backend ouvindo na porta ${config.port}`);
  });
}

module.exports = app;
