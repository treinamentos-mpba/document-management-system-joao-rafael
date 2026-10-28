const API_PREFIX = '/api';
const USER_ID_STORAGE_KEY = 'dms.user-id';
let inMemoryUserId;

function readStoredUserId(storageName) {
  try {
    return window[storageName].getItem(USER_ID_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getOrCreateUserId() {
  if (inMemoryUserId) {
    return inMemoryUserId;
  }

  for (const storageName of ['localStorage', 'sessionStorage']) {
    const savedUserId = readStoredUserId(storageName);
    if (savedUserId) {
      inMemoryUserId = savedUserId;
      return savedUserId;
    }
  }

  const userId = window.crypto.randomUUID();
  for (const storageName of ['localStorage', 'sessionStorage']) {
    try {
      window[storageName].setItem(USER_ID_STORAGE_KEY, userId);
      inMemoryUserId = userId;
      return userId;
    } catch {
      // Tenta o próximo mecanismo de persistência disponível.
    }
  }

  inMemoryUserId = userId;
  return inMemoryUserId;
}

async function request(path, userId, options = {}) {
  const response = await fetch(`${API_PREFIX}${path}`, {
    ...options,
    headers: {
      'X-User-Id': userId,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error?.message || 'Não foi possível concluir a solicitação.');
  }

  return response;
}

export async function listDocuments(userId) {
  const response = await request('/documents', userId);
  const payload = await response.json();
  return payload.documents;
}

export async function uploadDocument(userId, file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await request('/upload', userId, {
    method: 'POST',
    body: formData,
  });
  const payload = await response.json();
  return payload.document;
}

export async function downloadDocument(userId, documentId) {
  const response = await request(
    `/documents/${encodeURIComponent(documentId)}/download`,
    userId,
  );
  return response.blob();
}