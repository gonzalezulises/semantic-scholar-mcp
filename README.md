# Semantic Scholar MCP Server

MCP server que expone la API de Semantic Scholar como tools para Claude Code y Claude Chat. Permite respaldar cualquier artefacto generado (blogs, propuestas, investigaciones) con referencias académicas reales.

## Tools disponibles

| Tool | Descripción |
|---|---|
| `search_papers` | Búsqueda por relevancia con filtros (año, venue, campo, tipo) |
| `bulk_search` | Búsqueda masiva con booleanos y sorting (hasta 1000/página) |
| `get_paper` | Detalle de un paper por ID, DOI, ArXiv, PubMed |
| `get_citations` | Papers que citan un paper dado |
| `get_references` | Papers referenciados por un paper |
| `recommend_papers` | Recomendaciones basadas en papers ejemplo |
| `search_authors` | Búsqueda de autores académicos |
| `batch_papers` | Detalles de hasta 500 papers en una llamada |

## Instalación

```bash
git clone https://github.com/gonzalezulises/semantic-scholar-mcp.git
cd semantic-scholar-mcp
npm install && npm run build
```

Registrarlo en Claude Code (desde la carpeta del repo):

```bash
claude mcp add semantic-scholar --scope user -- node "$PWD/dist/index.js"
```

Con API key propia (opcional, mejora el límite de peticiones):

```bash
claude mcp add semantic-scholar --scope user \
  -e SEMANTIC_SCHOLAR_API_KEY=tu-key -- node "$PWD/dist/index.js"
```

## Rate limits

- Sin API key: ~1 req/s compartido (puede dar 429)
- Con API key (gratis): 1 req/s dedicado — solicitar en semanticscholar.org/product/api

## Uso en Claude Desktop

Agrega el servidor en `claude_desktop_config.json` con la ruta absoluta a `dist/index.js`:

```json
{
  "mcpServers": {
    "semantic-scholar": {
      "command": "node",
      "args": ["/ruta/a/semantic-scholar-mcp/dist/index.js"],
      "env": { "SEMANTIC_SCHOLAR_API_KEY": "tu-key" }
    }
  }
}
```

## Atribución

Este proyecto usa la [Semantic Scholar Academic Graph API](https://www.semanticscholar.org/product/api). Datos académicos proporcionados por Semantic Scholar.

> Kinney, R. et al. "The Semantic Scholar Open Data Platform." ArXiv, abs/2301.10140, 2023.

## Licencia

[MIT](LICENSE)
