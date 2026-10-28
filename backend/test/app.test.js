const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-backend-test-'));
const previousStorageDir = process.env.STORAGE_DIR;
const previousMaxFileSize = process.env.MAX_FILE_SIZE_BYTES;
const previousMaxStorage = process.env.MAX_STORAGE_BYTES;
process.env.STORAGE_DIR = storageDir;
process.env.MAX_FILE_SIZE_BYTES = '64';
process.env.MAX_STORAGE_BYTES = '32';
const app = require('../src/app');
if (previousStorageDir === undefined) {
  delete process.env.STORAGE_DIR;
} else {
  process.env.STORAGE_DIR = previousStorageDir;
}
if (previousMaxFileSize === undefined) {
  delete process.env.MAX_FILE_SIZE_BYTES;
} else {
  process.env.MAX_FILE_SIZE_BYTES = previousMaxFileSize;
}
if (previousMaxStorage === undefined) {
  delete process.env.MAX_STORAGE_BYTES;
} else {
  process.env.MAX_STORAGE_BYTES = previousMaxStorage;
}

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  fs.rmSync(storageDir, { recursive: true, force: true });
});

test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('upload, listagem e download respeitam o proprietário do documento', async () => {
  const form = new FormData();
  form.append(
    'file',
    new Blob(['conteudo de teste'], { type: 'text/plain' }),
    '../../teste.txt',
  );

  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'usuario-1' },
    body: form,
  });
  assert.equal(uploadResponse.status, 201);
  const { document } = await uploadResponse.json();
  assert.deepEqual(Object.keys(document).sort(), [
    'id',
    'originalName',
    'owner',
    'size',
    'uploadedAt',
  ]);
  assert.equal(document.owner, 'usuario-1');
  assert.equal(document.originalName, 'teste.txt');

  const listResponse = await fetch(`${baseUrl}/documents`, {
    headers: { 'X-User-Id': 'usuario-1' },
  });
  assert.equal(listResponse.status, 200);
  assert.deepEqual((await listResponse.json()).documents, [document]);

  const otherUserResponse = await fetch(`${baseUrl}/documents`, {
    headers: { 'X-User-Id': 'usuario-2' },
  });
  assert.deepEqual((await otherUserResponse.json()).documents, []);

  const downloadResponse = await fetch(
    `${baseUrl}/documents/${document.id}/download`,
    { headers: { 'X-User-Id': 'usuario-1' } },
  );
  assert.equal(downloadResponse.status, 200);
  assert.equal(downloadResponse.headers.get('content-type'), 'application/octet-stream');
  assert.match(downloadResponse.headers.get('content-disposition'), /attachment/);
  assert.equal(await downloadResponse.text(), 'conteudo de teste');

  const forbiddenDownload = await fetch(
    `${baseUrl}/documents/${document.id}/download`,
    { headers: { 'X-User-Id': 'usuario-2' } },
  );
  assert.equal(forbiddenDownload.status, 404);
  assert.deepEqual(await forbiddenDownload.json(), {
    error: { code: 'DOCUMENT_NOT_FOUND', message: 'Documento não encontrado.' },
  });
});

test('upload rejeita ausência de arquivo, campos extras e arquivos acima do limite', async () => {
  const missingFileResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'usuario-sem-arquivo' },
    body: new FormData(),
  });
  assert.equal(missingFileResponse.status, 400);
  assert.equal((await missingFileResponse.json()).error.code, 'FILE_REQUIRED');

  const extraFieldForm = new FormData();
  extraFieldForm.append('unexpected', 'value');
  const extraFieldResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'usuario-campo-extra' },
    body: extraFieldForm,
  });
  assert.equal(extraFieldResponse.status, 400);

  const oversizedForm = new FormData();
  oversizedForm.append('file', new Blob(['x'.repeat(65)]), 'grande.txt');
  const oversizedResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'usuario-arquivo-grande' },
    body: oversizedForm,
  });
  assert.equal(oversizedResponse.status, 413);
  assert.equal((await oversizedResponse.json()).error.code, 'FILE_TOO_LARGE');
});

test('upload aplica o limite total de armazenamento e remove o arquivo recusado', async () => {
  const form = new FormData();
  form.append('file', new Blob(['arquivo excede a cota']), 'cota.txt');

  const response = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'usuario-cota' },
    body: form,
  });

  assert.equal(response.status, 507);
  assert.equal((await response.json()).error.code, 'STORAGE_LIMIT_REACHED');
  assert.equal(fs.readdirSync(storageDir).length, 1);
});

test('rotas de documentos exigem o identificador do usuário', async () => {
  const response = await fetch(`${baseUrl}/documents`);

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: {
      code: 'USER_ID_REQUIRED',
      message: 'O cabeçalho X-User-Id é obrigatório.',
    },
  });
});

test('o backend recusa iniciar em produção enquanto não houver autenticação', () => {
  const result = spawnSync(process.execPath, ['-e', "require('./src/config')"], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, NODE_ENV: 'production' },
    encoding: 'utf8',
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /ainda não possui autenticação/);
});
