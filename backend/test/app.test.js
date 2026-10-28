const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-backend-test-'));
const previousStorageDir = process.env.STORAGE_DIR;
process.env.STORAGE_DIR = storageDir;
const app = require('../src/app');
if (previousStorageDir === undefined) {
  delete process.env.STORAGE_DIR;
} else {
  process.env.STORAGE_DIR = previousStorageDir;
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
  form.append('file', new Blob(['conteudo de teste'], { type: 'text/plain' }), 'teste.txt');

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
