import DownloadButton from './DownloadButton.jsx';
import formatFileSize from '../utils/formatFileSize.js';

function formatUploadDate(value) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getFileExtension(fileName) {
  const extension = fileName.split('.').pop();
  return extension && extension !== fileName ? extension.slice(0, 4).toUpperCase() : 'ARQ';
}

export default function DocumentList({ documents, isLoading, onError, onRefresh, userId }) {
  return (
    <section className="library-panel" aria-labelledby="library-heading">
      <div className="library-heading-row">
        <div>
          <div className="section-kicker">
            <span className="kicker-dot kicker-dot-coral" />
            BIBLIOTECA
          </div>
          <h2 id="library-heading">Seus documentos</h2>
        </div>
        <button className="quiet-button" type="button" onClick={onRefresh} disabled={isLoading}>
          {isLoading ? 'Atualizando...' : 'Atualizar lista'}
        </button>
      </div>

      <div className="list-summary" aria-live="polite">
        <span>{documents.length} {documents.length === 1 ? 'documento' : 'documentos'}</span>
        <span className="summary-divider" />
        <span>Mais recentes primeiro</span>
      </div>

      {isLoading ? (
        <div className="list-state" role="status">Carregando documentos...</div>
      ) : documents.length === 0 ? (
        <div className="list-state empty-state">
          <span className="empty-mark" aria-hidden="true">—</span>
          <strong>A biblioteca está vazia</strong>
          <span>Os documentos enviados aparecerão aqui.</span>
        </div>
      ) : (
        <ul className="document-list">
          {documents.map((document) => (
            <li className="document-row" key={document.id}>
              <span className="document-file-mark" aria-hidden="true">
                {getFileExtension(document.originalName)}
              </span>
              <span className="document-details">
                <span className="document-name" title={document.originalName}>{document.originalName}</span>
                <span className="document-meta">
                  {formatFileSize(document.size)}
                  <span className="meta-separator">·</span>
                  {formatUploadDate(document.uploadedAt)}
                </span>
              </span>
              <DownloadButton document={document} userId={userId} onError={onError} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}