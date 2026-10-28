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
    return (await fs.promises.lstat(getPath(storageName))).isFile();
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function getTotalBytes() {
  const entries = await fs.promises.readdir(config.storageDir, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile());
  const sizes = await Promise.all(
    files.map(async (file) => {
      const stats = await fs.promises.lstat(path.join(config.storageDir, file.name));
      return stats.size;
    }),
  );

  return sizes.reduce((total, size) => total + size, 0);
}

function createReadStream(storageName) {
  const noFollow = fs.constants.O_NOFOLLOW || 0;
  return fs.createReadStream(getPath(storageName), {
    flags: fs.constants.O_RDONLY | noFollow,
  });
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

module.exports = {
  createReadStream,
  ensureStorageDirectory,
  exists,
  getPath,
  getTotalBytes,
  remove,
};