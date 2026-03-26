# Server — AGENTS.md

Contexto específico do backend NestJS. Leia também o `AGENTS.md` da raiz.

## Módulos registrados (app.module.ts)

`ConfigModule`, `ModelConfigModule`, `FilesystemModule`, `TranslateModule`, `PdfModule`, `ChatModule`, `RagModule`

## Paths hardcoded

| Dado | Path |
|------|------|
| Banco PGLite (produção) | `docs/chat/chat.db` (relativo a `process.cwd()`) |
| Documentos do RAG | `docs/files/Estudos` (relativo a `process.cwd()`) |
| `.env` | `../.env` relativo ao diretório `server/` |
| Migrations | `server/prisma/migrations/` |

## Banco de dados (Prisma + PGLite)

- Schema: `server/prisma/schema.prisma`
- Migrations: `server/prisma/migrations/`
- Script CLI para gerar migrations: `server/prisma/migrate.sh`

**Nomenclatura:**

| Camada | Convenção | Exemplo |
|--------|-----------|---------|
| Modelo Prisma | PascalCase singular | `Session`, `Message` |
| Tabela no banco | snake_case plural (via `@@map`) | `sessions`, `messages` |
| Campos | camelCase no Prisma, camelCase na coluna | `sessionId`, `createdAt` |

**Ambientes:**

- Desenvolvimento (`NODE_ENV != 'production'`): Postgres real via `DATABASE_URL` do `.env`
- Produção: PGLite embarcado em `docs/chat/chat.db`; migrations aplicadas automaticamente pelo `PrismaService.applyMigrations()` no startup

## ModelConfig — providers e modelos padrão

| Serviço | Provider padrão | Modelo padrão |
|---------|----------------|---------------|
| Chat | Ollama | `qwen3.5:4b` |
| Translate | Ollama | `llama3.2:1b` |

Providers disponíveis: `openrouter`, `google`, `ollama`. A validação lança erro se o provider não for Ollama e a API key estiver ausente.

## RAG (LocalRagService)

- Embedding model: `qwen3-embedding:4b` via Ollama
- Chunking: `chunkSize: 1000`, `chunkOverlap: 200`
- Vector store: `MemoryVectorStore` (in-memory, **não persistente** — recarrega a cada `POST /api/rag/load`)
- Busca: retorna exatamente **2 documentos** por query (`similaritySearch(query, 2)`)
- Formatos suportados: `.pdf` (PDFLoader) e `.md` (TextLoader)

## Chat agent (LangChain)

- Tool `retrieve` usa `responseFormat: "content_and_artifact"` — deve retornar tupla `[string, Document[]]`
- O `MemorySaver` checkpointer é instanciado mas a persistência entre sessões depende do `thread_id` passado no config (`{ configurable: { thread_id: sessionId } }`)
- Um novo agente é criado por request em `streamMessage()` — não há instância compartilhada
- System prompt atual: `'You are a helpful assistant. Be concise'`
