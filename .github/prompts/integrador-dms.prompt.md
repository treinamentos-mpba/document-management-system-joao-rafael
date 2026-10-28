---
description: "Gera testes de integração para os fluxos do DMS, cobrindo contratos HTTP, upload, listagem, download e isolamento por usuário."
name: integrador-dms
argument-hint: fluxo ou recurso a testar (ex.: upload, documentos, download)
agent: tdd
---

# Testes de integração do DMS

Gere testes de integração para o fluxo `${input:escopo:fluxo ou recurso}` do Document Management System. Os testes devem exercitar o comportamento pela interface HTTP e seguir os contratos e convenções atuais do projeto.

## Antes de escrever

1. Inspecione `docs/specs/dms-spec.md`, as rotas e controllers correspondentes, `backend/test/` e `backend/package.json`.
2. Confirme os caminhos, cabeçalhos, formatos de resposta e códigos de status realmente implementados.
3. Identifique o padrão de isolamento e limpeza usado pelos testes existentes.
4. Se a especificação e a implementação divergirem, escreva os testes conforme o comportamento acordado na especificação e relate a divergência. Não altere código de produção.

## Requisitos dos testes

- Use o runner nativo `node:test` e asserções de `node:assert/strict`.
- Para o backend, faça requisições HTTP reais ao app Express iniciado em uma porta efêmera.
- Prefira APIs nativas do Node, como `fetch`, `FormData` e `Blob`; não adicione dependências de teste.
- Use um diretório temporário para `STORAGE_DIR` e remova-o ao final dos testes.
- Gere identificadores de usuário exclusivos por cenário para evitar dependência da ordem de execução.
- Verifique que respostas públicas não exponham nomes internos ou caminhos do filesystem.
- Não teste detalhes privados de implementação quando o comportamento público for suficiente.
- Não modifique arquivos de produção; crie ou atualize apenas os testes necessários.

## Cobertura esperada

Quando aplicável ao fluxo solicitado, cubra:

- Sucesso do upload multipart no campo `file`, com `X-User-Id`.
- Ausência de arquivo, cabeçalho de usuário ou multipart inválido.
- Limite de tamanho do Multer e status de erro correspondente.
- Listagem vazia e listagem restrita ao proprietário.
- Download do arquivo próprio, incluindo conteúdo binário e cabeçalhos de anexo.
- Resposta equivalente para identificador inexistente e documento de outro usuário.
- Arquivo indisponível no disco, sem expor caminhos internos.
- Limpeza de arquivos temporários mesmo quando um teste falhar.

## Frontend

Não introduza um framework de testes novo. Se já houver runner de frontend configurado, cubra o cliente `/api` e os fluxos relevantes. Caso contrário, informe essa lacuna e mantenha os testes no contrato HTTP do backend.

## Validação e saída

1. Execute `npm test --prefix backend`.
2. Corrija somente os testes criados ou atualizados até que passem.
3. Ao concluir, resuma os cenários cobertos, o comando executado e qualquer divergência ou lacuna restante.