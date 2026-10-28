import { useRef, useState } from 'react';
import formatFileSize from '../utils/formatFileSize.js';

export default function UploadComponent({ isUploading, onUpload }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  function selectFile(file) {
    if (file) {
      setSelectedFile(file);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!selectedFile || isUploading) {
      return;
    }

    const uploaded = await onUpload(selectedFile);
    if (uploaded) {
      setSelectedFile(null);
      inputRef.current.value = '';
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    selectFile(event.dataTransfer.files[0]);
  }

  function clearFile() {
    setSelectedFile(null);
    inputRef.current.value = '';
  }

  return (
    <section className="upload-panel" aria-labelledby="upload-heading">
      <div className="section-kicker">
        <span className="kicker-dot" />
        ADICIONAR
      </div>
      <h2 id="upload-heading">Novo documento</h2>
      <p className="panel-description">Escolha um arquivo para guardar na sua biblioteca.</p>

      <form onSubmit={handleSubmit}>
        <label
          className={`drop-zone${isDragging ? ' is-dragging' : ''}${selectedFile ? ' has-file' : ''}`}
          htmlFor="document-file"
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setIsDragging(false);
            }
          }}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            className="visually-hidden"
            id="document-file"
            type="file"
            onChange={(event) => selectFile(event.target.files[0])}
            disabled={isUploading}
          />
          <span className="upload-mark" aria-hidden="true">↑</span>
          <span className="drop-title">
            {selectedFile ? 'Arquivo selecionado' : 'Solte seu arquivo aqui'}
          </span>
          <span className="drop-hint">
            {selectedFile ? 'ou escolha outro arquivo' : 'ou escolha no seu dispositivo'}
          </span>
        </label>

        {selectedFile && (
          <div className="selected-file">
            <span className="file-type-mark" aria-hidden="true">{selectedFile.name.split('.').pop().slice(0, 4).toUpperCase()}</span>
            <span className="selected-file-details">
              <span className="selected-file-name">{selectedFile.name}</span>
              <span className="selected-file-size">{formatFileSize(selectedFile.size)}</span>
            </span>
            <button
              className="text-button"
              type="button"
              onClick={clearFile}
              disabled={isUploading}
            >
              Remover
            </button>
          </div>
        )}

        <button className="primary-button upload-submit" type="submit" disabled={!selectedFile || isUploading}>
          {isUploading ? 'Enviando...' : 'Enviar documento'}
        </button>
      </form>

      <div className="local-storage-note">
        <span className="lock-mark" aria-hidden="true">●</span>
        Arquivos armazenados neste servidor
      </div>
    </section>
  );
}