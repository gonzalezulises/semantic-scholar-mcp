# Semantic Scholar MCP Server

## Estado del proyecto

- **Estado**: Funcional, pendiente API key
- **Última sesión**: 2026-03-31
- **Repo**: github.com/gonzalezulises/semantic-scholar-mcp
- **Local**: ~/Documents/GitHub/semantic-scholar-mcp

## Pendiente: configurar API key

El API key fue solicitado a Semantic Scholar (2026-03-31). Cuando el usuario proporcione la key:

1. Agregar a `~/.claude.json` en `mcpServers.semantic-scholar.env`:
   ```json
   "env": {
     "SEMANTIC_SCHOLAR_API_KEY": "la-key-aquí"
   }
   ```
2. Reiniciar Claude Code para que el MCP server cargue con la key
3. Verificar que funciona ejecutando una búsqueda de prueba con `search_papers`
4. Actualizar este archivo: cambiar estado a "Completo"

## Arquitectura

```
src/
├── client.ts    → HTTP client con throttle (1req/s), retry exponencial, auth por env var
└── index.ts     → MCP server con 8 tools registradas
```

- **Runtime**: Node.js, TypeScript compilado a `dist/`
- **Dependencias**: @modelcontextprotocol/sdk, zod
- **Auth**: `process.env.SEMANTIC_SCHOLAR_API_KEY` → header `x-api-key`
- **Rate limit**: 1000ms con key, 1100ms sin key, retry 3x con backoff ante 429

## Tools expuestas

| Tool | Endpoint API | Uso principal |
|---|---|---|
| `search_papers` | `/graph/v1/paper/search` | Búsqueda por relevancia, filtros de año/venue/campo |
| `bulk_search` | `/graph/v1/paper/search/bulk` | Surveys masivos, booleanos, sorting |
| `get_paper` | `/graph/v1/paper/{id}` | Detalle completo (DOI, ArXiv, PubMed) |
| `get_citations` | `/graph/v1/paper/{id}/citations` | Impacto y evolución |
| `get_references` | `/graph/v1/paper/{id}/references` | Fundamentos teóricos |
| `recommend_papers` | `/recommendations/v1/papers/` | Descubrimiento de papers relacionados |
| `search_authors` | `/graph/v1/author/search` | Buscar investigadores |
| `batch_papers` | `/graph/v1/paper/batch` | Bibliografías (hasta 500 papers) |

## Integración con Claude

- **Registrado en**: `~/.claude.json` → `mcpServers.semantic-scholar` (scope: user)
- **Instrucción en**: `~/.claude/CLAUDE.md` → sección "Respaldo con fuentes (Semantic Scholar)"
- **Comportamiento**: Claude usa automáticamente las tools al generar blogs, propuestas, investigaciones
- **No requiere** slash command — es transparente al fluir del trabajo

## Convenciones

- Commits: inglés, conventional commits
- Build: `npm run build` (tsc)
- No hay tests aún — el server es thin wrapper sobre la API
