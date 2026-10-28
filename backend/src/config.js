const path = require('node:path');

function positiveInteger(value, defaultValue, name) {
  if (value === undefined || value === '') {
    return defaultValue;
  }

  const parsedValue = Number(value);
  if (!Number.isSafeInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${name} deve ser um inteiro positivo.`);
  }

  return parsedValue;
}

const port = positiveInteger(process.env.PORT, 3000, 'PORT');
if (port > 65535) {
  throw new Error('PORT deve ser menor ou igual a 65535.');
}

if (process.env.NODE_ENV === 'production') {
  throw new Error(
    'O DMS ainda não possui autenticação; não pode ser iniciado em produção.',
  );
}

module.exports = Object.freeze({
  port,
  storageDir: path.resolve(
    process.env.STORAGE_DIR || path.join(__dirname, '../storage'),
  ),
  maxFileSizeBytes: positiveInteger(
    process.env.MAX_FILE_SIZE_BYTES,
    10 * 1024 * 1024,
    'MAX_FILE_SIZE_BYTES',
  ),
  maxStorageBytes: positiveInteger(
    process.env.MAX_STORAGE_BYTES,
    1024 * 1024 * 1024,
    'MAX_STORAGE_BYTES',
  ),
});