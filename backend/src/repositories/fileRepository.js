const fs = require('node:fs');
const path = require('node:path');
const config = require('../config');

function ensureStorageDirectory() {
  fs.mkdirSync(config.storageDir, { recursive: true });
}

function getPath(storageName) {
  if (
    typeof storageName !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storageName)
  ) {
    throw new Error('Identificador interno de armazenamento inválido.');
  }

  return path.join(config.storageDir, storageName);
}

async function exists(storageName) {
  try {
    return (await fs.promises.stat(getPath(storageName))).isFile();
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function remove(storageName) {
  try {
    await fs.promises.unlink(getPath(storageName));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

module.exports = { ensureStorageDirectory, exists, getPath, remove };