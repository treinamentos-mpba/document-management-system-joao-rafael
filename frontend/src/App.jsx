import { useEffect, useState } from 'react';
import DocumentList from './components/DocumentList.jsx';
import UploadComponent from './components/UploadComponent.jsx';
import { getOrCreateUserId, listDocuments, uploadDocument } from './services/documentApi.js';
import './App.css';

export default function App() {
  const [userId] = useState(getOrCreateUserId);
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    let isCurrent = true;

    async function loadDocuments() {
      setIsLoading(true);
      try {
        const result = await listDocuments(userId);
        if (isCurrent) {
          setDocuments(result);
          setErrorMessage('');
        }
      } catch (error) {
        if (isCurrent) {
          setErrorMessage(error.message);
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    loadDocuments();
    return () => {
      isCurrent = false;
    };
  }, [userId, refreshVersion]);

  async function handleUpload(file) {
    setIsUploading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await uploadDocument(userId, file);
      setSuccessMessage('Documento enviado.');
      setRefreshVersion((version) => version + 1);
      return true;
    } catch (error) {
      setErrorMessage(error.message);
      return false;
    } finally {
      setIsUploading(false);
    }
  }

  function handleError(message) {
    setErrorMessage(message);
    setSuccessMessage('');
  }

  return (
    <>
      <header className="topbar">
        <a className="brand" href="/" aria-label="DMS, início">
          <span className="brand-mark" aria-hidden="true">D/</span>
          <span>Arquivo</span>
        </a>
        <span className="topbar-status">
          <span className="status-indicator" />
          Espaço local
        </span>
      </header>

      <main className="workspace">
        <div className="page-heading">
          <div>
            <div className="eyebrow">SEU ESPAÇO DE TRABALHO</div>
            <h1>Documentos</h1>
            <p>Guarde e encontre seus arquivos em um só lugar.</p>
          </div>
          <div className="document-count" aria-label={`${documents.length} documentos`}>
            <strong>{documents.length.toString().padStart(2, '0')}</strong>
            <span>no arquivo</span>
          </div>
        </div>

        {errorMessage && (
          <div className="alert" role="alert">
            <span>{errorMessage}</span>
            <button type="button" onClick={() => setErrorMessage('')}>Fechar</button>
          </div>
        )}
        {successMessage && !errorMessage && (
          <div className="alert alert-success" role="status">
            <span>{successMessage}</span>
            <button type="button" onClick={() => setSuccessMessage('')}>Fechar</button>
          </div>
        )}

        <div className="workspace-grid">
          <UploadComponent isUploading={isUploading} onUpload={handleUpload} />
          <DocumentList
            documents={documents}
            isLoading={isLoading}
            onError={handleError}
            onRefresh={() => setRefreshVersion((version) => version + 1)}
            userId={userId}
          />
        </div>
      </main>
    </>
  );
}
