# Especificação - Document Management System

> Especificação funcional e técnica do MVP, usada como referência para o desenvolvimento guiado por especificação.

## 1. Objetivo

Oferecer a usuários identificados uma aplicação web simples para enviar, listar e baixar seus documentos, mantendo os arquivos no filesystem local e os metadados em memória.

## 2. Escopo

### Dentro do escopo

- Envio de um arquivo por requisição.
- Listagem dos metadados dos documentos pertencentes ao usuário da requisição.
- Download de um documento do próprio usuário por identificador.
- Identificação simples do proprietário para separar documentos entre usuários no MVP.
- Interface React para upload, listagem e download, integrada ao backend por `fetch`.
- Armazenamento dos arquivos em `backend/storage` e dos metadados em memória.

### Fora do escopo

- Autenticação, cadastro de contas, autorização baseada em papéis ou recuperação de identidade confiável.
- Armazenamento externo, em nuvem ou em banco de dados.
- Persistência dos metadados entre reinicializações do processo.
- Versionamento, edição, exclusão, compartilhamento ou busca avançada de documentos.
- Upload múltiplo, paginação e processamento assíncrono.

## 3. Requisitos funcionais

| ID | Requisito | Critério de aceite |
| --- | --- | --- |
| RF-01 | O usuário pode enviar um documento por vez usando `multipart/form-data`. | Com um arquivo válido e usuário identificado, a API responde `201` com os metadados públicos do documento criado. |
| RF-02 | O sistema valida a presença do arquivo e aplica um limite de tamanho configurável. | Requisição sem arquivo recebe `400`; arquivo acima do limite recebe `413`; nenhuma entrada inválida fica disponível na listagem. |
| RF-03 | O sistema atribui ao documento um identificador único e registra proprietário, nome original, tamanho e data/hora de upload. | O identificador não colide com documentos existentes durante a execução e a data é retornada em ISO 8601. |
| RF-04 | O usuário pode listar seus documentos. | `GET /documents` retorna somente documentos do proprietário identificado; lista vazia é válida e ordenada dos mais recentes para os mais antigos. |
| RF-05 | O usuário pode baixar um documento próprio pelo identificador. | O conteúdo é retornado como anexo; identificador inexistente ou pertencente a outro usuário resulta em `404`. |
| RF-06 | O sistema não expõe o caminho ou nome interno do arquivo armazenado nas respostas públicas. | Respostas de upload e listagem contêm apenas o modelo público definido nesta especificação. |
| RF-07 | A interface apresenta os documentos do usuário e permite enviar e baixar documentos, informando erros retornados pela API. | As ações usam os contratos definidos abaixo e estados de carregamento/erro não impedem novas tentativas. |

## 4. Requisitos não funcionais

| ID | Requisito | Critério/observação |
| --- | --- | --- |
| RNF-01 | Os arquivos são gravados exclusivamente no filesystem local por Multer com `diskStorage`. | O diretório padrão é `backend/storage`; não usar serviços ou provedores externos. |
| RNF-02 | Os metadados são mantidos em memória nesta fase. | Reiniciar o processo remove os metadados; arquivos já gravados podem permanecer órfãos e não são considerados documentos listáveis. |
| RNF-03 | Configurações operacionais são obtidas por variáveis de ambiente. | No mínimo: `PORT`, `STORAGE_DIR` (padrão `backend/storage`) e `MAX_FILE_SIZE_BYTES` (padrão de 10 MiB). Valores inválidos devem impedir inicialização ou ser tratados com erro explícito, sem fallback silencioso inesperado. |
| RNF-04 | O backend segue Clean Architecture simples. | Dependências fluem de `routes` para `controllers`, `services` e `repositories`; regras de negócio não dependem de Express ou Multer. |
| RNF-05 | O download trata o arquivo como anexo e reduz interpretação ativa pelo navegador. | Usar `Content-Disposition: attachment`, tipo de conteúdo conhecido ou `application/octet-stream` e `X-Content-Type-Options: nosniff`. |
| RNF-06 | Erros da API têm formato previsível e não revelam caminhos locais nem detalhes internos. | Mensagens públicas são seguras; detalhes técnicos ficam nos logs do servidor. |
| RNF-07 | A implementação é compatível com a stack existente. | Backend CommonJS com Express e Multer; testes backend com `node:test`; frontend React/Vite e JavaScript sem TypeScript nesta fase. |

### Premissas e limites

- Para o MVP, o identificador do usuário é recebido no cabeçalho `X-User-Id`, obrigatório e não vazio. Esse valor é uma convenção de desenvolvimento, não uma autenticação: a API não deve ser exposta a usuários não confiáveis sem uma camada de autenticação e autorização real.
- Nenhuma allowlist de extensões ou tipos MIME foi definida pelo produto. O MVP não deve inventar uma restrição incompatível; deve impor o limite de tamanho, guardar o nome original apenas como metadado e servir downloads como anexo. Uma política de tipos permitidos é uma decisão futura explícita.
- O limite padrão de 10 MiB é uma decisão inicial configurável; a configuração deve ser validada como inteiro positivo.
- A aplicação atende ao armazenamento local de uma única instância. Não há garantia de consistência entre múltiplos processos ou instâncias.

## 5. Modelo de dados (metadados do documento)

### Metadados públicos

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | string | Identificador único e opaco do documento. |
| `originalName` | string | Nome original fornecido no upload; nunca deve ser usado como caminho no filesystem. |
| `size` | number | Tamanho do arquivo em bytes. |
| `uploadedAt` | string | Data/hora do upload em ISO 8601. |
| `owner` | string | Identificador do usuário recebido em `X-User-Id`. |

### Dados internos de armazenamento

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `storageName` | string | Nome interno gerado pelo sistema, independente do nome enviado; usado para localizar o arquivo no diretório configurado. Não é retornado pela API. |
| `mimeType` | string | Tipo de mídia recebido/detectado para definir o cabeçalho de download; usar `application/octet-stream` quando ausente ou não confiável. |

Os dados internos podem compor o registro em memória junto aos metadados públicos, mas não fazem parte do contrato de resposta. O caminho absoluto deve ser resolvido a partir da configuração do diretório de armazenamento, nunca a partir de entrada do usuário. O diretório deve existir ou ser criado pela aplicação no início do serviço de armazenamento.

## 6. Contratos de API

Os caminhos abaixo são relativos ao backend. Durante o desenvolvimento, o Vite encaminha chamadas iniciadas por `/api` ao backend e remove esse prefixo; portanto, o frontend chama `/api/upload`, `/api/documents` e `/api/documents/:id/download`.

### Convenções comuns

- Todas as rotas de documentos exigem `X-User-Id` não vazio. Ausente ou inválido: `400 Bad Request`.
- Respostas de erro usam o formato `{ "error": { "code": "...", "message": "..." } }`.
- Não revelar se um documento existe quando ele não pertence ao usuário da requisição: responder `404 Not Found` tanto para inexistente quanto para não pertencente.
- `owner`, identificadores e nomes são tratados como dados; não são interpolados em caminhos locais.

### `POST /upload`

- Entrada: `multipart/form-data`, exatamente um arquivo no campo `file`; cabeçalho `X-User-Id` obrigatório.
- Limite: `MAX_FILE_SIZE_BYTES`, incluindo o limite padrão definido em RNF-03.
- Sucesso: `201 Created`, corpo JSON:

```json
{
  "document": {
    "id": "identificador-opaco",
    "originalName": "relatorio.pdf",
    "size": 2048,
    "uploadedAt": "2026-10-28T12:00:00.000Z",
    "owner": "usuario-123"
  }
}
```

- Erros: `400` (`FILE_REQUIRED`, `USER_ID_REQUIRED`, `INVALID_MULTIPART`); `413` (`FILE_TOO_LARGE`); `500` (`UPLOAD_FAILED`).
- Se ocorrer falha após a gravação no disco e antes do registro dos metadados, remover o arquivo parcial para não deixar artefato órfão decorrente de falha na própria requisição.

### `GET /documents`

- Entrada: cabeçalho `X-User-Id` obrigatório; sem parâmetros de consulta no MVP.
- Sucesso: `200 OK`, corpo JSON com documentos do usuário, sem dados internos de armazenamento:

```json
{
  "documents": [
    {
      "id": "identificador-opaco",
      "originalName": "relatorio.pdf",
      "size": 2048,
      "uploadedAt": "2026-10-28T12:00:00.000Z",
      "owner": "usuario-123"
    }
  ]
}
```

- Lista sem documentos: `200 OK` com `"documents": []`.
- Erros: `400` (`USER_ID_REQUIRED`); `500` (`DOCUMENT_LIST_FAILED`).

### `GET /documents/:id/download`

- Entrada: identificador no caminho e cabeçalho `X-User-Id` obrigatório.
- Sucesso: `200 OK`, corpo binário do arquivo; cabeçalhos `Content-Disposition: attachment` com nome original devidamente sanitizado, `Content-Type` seguro e `X-Content-Type-Options: nosniff`.
- Erros: `400` (`USER_ID_REQUIRED` ou `INVALID_DOCUMENT_ID`); `404` (`DOCUMENT_NOT_FOUND`) se inexistente, de outro usuário ou se o arquivo não estiver disponível; `500` (`DOWNLOAD_FAILED`) em falha de leitura não equivalente a arquivo ausente.

## 7. Decisões arquiteturais

- **Rotas (`routes/`):** declaram caminhos, métodos e middleware de transporte, incluindo a integração com Multer para receber o campo `file`; delegam ao controller.
- **Controllers (`controllers/`):** traduzem parâmetros, cabeçalhos e respostas HTTP; fazem validação básica de entrada e mapeiam erros para status e formato da API.
- **Services (`services/`):** aplicam regras de negócio, como associação ao proprietário, criação dos metadados, autorização por propriedade e coordenação entre persistência do arquivo e registro em memória. Não dependem de Express ou Multer.
- **Repositories (`repositories/`):** encapsulam o registro de metadados em memória e o acesso ao filesystem local. Podem separar repositório de metadados e repositório de arquivos, sem introduzir banco ou serviço externo.
- **Aplicação:** backend Node.js/Express em CommonJS; frontend React com componentes funcionais e serviços `fetch`; proxy Vite `/api` aponta para o backend local.
- **Armazenamento:** Multer `diskStorage` grava em diretório configurável, por padrão `backend/storage`; o nome interno é gerado pela aplicação. Metadados ficam em memória e são perdidos ao reiniciar.
- **Testabilidade:** serviços recebem dependências por parâmetros ou composição da aplicação, permitindo testes com filesystem temporário e sem depender de chamadas externas.

## 8. Plano de execução

Etapas futuras de implementação, descritas por capacidade e resultado verificável. Este plano não prescreve a criação ou edição de arquivos específicos de backend ou frontend.

1. **Estabelecer contratos e configuração:** validar variáveis de ambiente, cabeçalho de usuário, formato de erros e limite de upload; confirmar os casos de validação por testes de API.
2. **Habilitar upload local:** aceitar um arquivo por requisição com Multer `diskStorage`, gerar identificador/nome interno, registrar metadados em memória e limpar gravações quando a operação falhar; verificar tamanho, proprietário e ausência de caminhos internos na resposta.
3. **Habilitar listagem por usuário:** retornar metadados públicos ordenados por data, isolados por proprietário; verificar lista vazia e ausência de vazamento entre usuários.
4. **Habilitar download autorizado:** localizar por identificador, conferir propriedade e transmitir como anexo; verificar sucesso, documento inexistente, documento de outro usuário e arquivo ausente.
5. **Integrar a experiência web:** permitir envio, atualização da lista e download usando o proxy `/api`; apresentar estados de carregamento, vazio e erro.
6. **Validar o MVP de ponta a ponta:** executar testes automatizados para sucesso e falhas dos contratos, build do frontend e uma verificação manual do fluxo upload-listagem-download; confirmar que arquivos ficam apenas no armazenamento local e documentar a limitação de metadados em memória.