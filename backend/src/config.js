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
});