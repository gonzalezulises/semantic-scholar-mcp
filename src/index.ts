import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { request } from "./client.js";

const server = new McpServer({
  name: "semantic-scholar",
  version: "1.0.0",
});

// --- Tool: search_papers ---
server.tool(
  "search_papers",
  "Search for academic papers by query. Returns titles, abstracts, authors, citation counts, and more. Use for literature review and discovering relevant research.",
  {
    query: z.string().describe("Search query (plain text)"),
    fields: z
      .string()
      .optional()
      .describe(
        "Comma-separated fields: title,abstract,year,citationCount,authors,venue,openAccessPdf,tldr,fieldsOfStudy,publicationTypes,externalIds,publicationDate"
      ),
    year: z
      .string()
      .optional()
      .describe("Year filter: '2023' or '2020-2024'"),
    venue: z
      .string()
      .optional()
      .describe("Venue filter: 'Nature,Science,NeurIPS'"),
    fieldsOfStudy: z
      .string()
      .optional()
      .describe("e.g. 'Computer Science,Medicine'"),
    publicationTypes: z
      .string()
      .optional()
      .describe(
        "e.g. 'Review,JournalArticle,Conference,MetaAnalysis,ClinicalTrial'"
      ),
    minCitationCount: z
      .number()
      .optional()
      .describe("Minimum citation count filter"),
    openAccessPdf: z
      .boolean()
      .optional()
      .describe("Only return papers with open access PDF"),
    limit: z.number().optional().describe("Max results (1-100, default 20)"),
    offset: z.number().optional().describe("Pagination offset"),
  },
  async (params) => {
    const fields =
      params.fields ??
      "title,abstract,year,citationCount,authors,venue,tldr,externalIds";
    const queryParams: Record<string, string | number | undefined> = {
      query: params.query,
      fields,
      limit: params.limit ?? 20,
      offset: params.offset,
      year: params.year,
      venue: params.venue,
      fieldsOfStudy: params.fieldsOfStudy,
      publicationTypes: params.publicationTypes,
      minCitationCount: params.minCitationCount,
    };
    if (params.openAccessPdf) queryParams["openAccessPdf"] = "";

    const data = await request<{
      total: number;
      offset: number;
      next?: number;
      data: unknown[];
    }>({
      path: "/graph/v1/paper/search",
      params: queryParams,
    });

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            { total: data.total, offset: data.offset, next: data.next, count: data.data.length, papers: data.data },
            null,
            2
          ),
        },
      ],
    };
  }
);

// --- Tool: get_paper ---
server.tool(
  "get_paper",
  "Get detailed information about a specific paper by its ID (S2 ID, DOI, ArXiv, PubMed, etc). Use formats like 'DOI:10.xxx', 'ARXIV:2106.xxx', 'PMID:123'.",
  {
    paper_id: z
      .string()
      .describe(
        "Paper ID: S2 ID, DOI:10.xxx, ARXIV:xxx, PMID:xxx, CorpusId:xxx"
      ),
    fields: z.string().optional().describe("Comma-separated fields to return"),
  },
  async (params) => {
    const fields =
      params.fields ??
      "title,abstract,year,citationCount,influentialCitationCount,authors,venue,openAccessPdf,tldr,fieldsOfStudy,publicationTypes,externalIds,referenceCount,publicationDate,journal,citationStyles";
    const data = await request<unknown>({
      path: `/graph/v1/paper/${encodeURIComponent(params.paper_id)}`,
      params: { fields },
    });

    return {
      content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    };
  }
);

// --- Tool: get_citations ---
server.tool(
  "get_citations",
  "Get papers that cite a given paper. Useful for understanding a paper's impact and finding follow-up research.",
  {
    paper_id: z.string().describe("Paper ID"),
    fields: z.string().optional(),
    limit: z.number().optional().describe("Max results (1-1000, default 50)"),
    offset: z.number().optional(),
  },
  async (params) => {
    const data = await request<{ offset: number; next?: number; data: unknown[] }>({
      path: `/graph/v1/paper/${encodeURIComponent(params.paper_id)}/citations`,
      params: {
        fields: params.fields ?? "title,year,citationCount,authors,abstract,venue",
        limit: params.limit ?? 50,
        offset: params.offset,
      },
    });

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ count: data.data.length, next: data.next, citations: data.data }, null, 2),
        },
      ],
    };
  }
);

// --- Tool: get_references ---
server.tool(
  "get_references",
  "Get papers referenced by a given paper. Useful for tracing the intellectual foundations of research.",
  {
    paper_id: z.string().describe("Paper ID"),
    fields: z.string().optional(),
    limit: z.number().optional().describe("Max results (1-1000, default 50)"),
    offset: z.number().optional(),
  },
  async (params) => {
    const data = await request<{ offset: number; next?: number; data: unknown[] }>({
      path: `/graph/v1/paper/${encodeURIComponent(params.paper_id)}/references`,
      params: {
        fields: params.fields ?? "title,year,citationCount,authors,abstract,venue",
        limit: params.limit ?? 50,
        offset: params.offset,
      },
    });

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ count: data.data.length, next: data.next, references: data.data }, null, 2),
        },
      ],
    };
  }
);

// --- Tool: recommend_papers ---
server.tool(
  "recommend_papers",
  "Get paper recommendations based on positive (and optionally negative) example papers. Great for discovering related work not found by keyword search.",
  {
    positive_paper_ids: z
      .array(z.string())
      .describe("Paper IDs to use as positive examples"),
    negative_paper_ids: z
      .array(z.string())
      .optional()
      .describe("Paper IDs to use as negative examples"),
    fields: z.string().optional(),
    limit: z.number().optional().describe("Max results (1-500, default 20)"),
  },
  async (params) => {
    const fields =
      params.fields ??
      "title,abstract,year,citationCount,authors,venue,tldr,externalIds";

    let data: { recommendedPapers: unknown[] };

    if (params.positive_paper_ids.length === 1 && !params.negative_paper_ids?.length) {
      data = await request<{ recommendedPapers: unknown[] }>({
        path: `/recommendations/v1/papers/forpaper/${encodeURIComponent(params.positive_paper_ids[0])}`,
        params: { fields, limit: params.limit ?? 20 },
      });
    } else {
      data = await request<{ recommendedPapers: unknown[] }>({
        path: "/recommendations/v1/papers/",
        method: "POST",
        params: { fields, limit: params.limit ?? 20 },
        body: {
          positivePaperIds: params.positive_paper_ids,
          negativePaperIds: params.negative_paper_ids ?? [],
        },
      });
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            { count: data.recommendedPapers.length, papers: data.recommendedPapers },
            null,
            2
          ),
        },
      ],
    };
  }
);

// --- Tool: search_authors ---
server.tool(
  "search_authors",
  "Search for academic authors by name. Returns author details including h-index, paper count, and affiliations.",
  {
    query: z.string().describe("Author name to search"),
    fields: z.string().optional(),
    limit: z.number().optional().describe("Max results (1-100, default 10)"),
  },
  async (params) => {
    const data = await request<{ total: number; data: unknown[] }>({
      path: "/graph/v1/author/search",
      params: {
        query: params.query,
        fields:
          params.fields ??
          "name,affiliations,homepage,paperCount,citationCount,hIndex",
        limit: params.limit ?? 10,
      },
    });

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ total: data.total, authors: data.data }, null, 2),
        },
      ],
    };
  }
);

// --- Tool: batch_papers ---
server.tool(
  "batch_papers",
  "Get details for multiple papers in a single request (up to 500). Efficient for building bibliographies. Accepts mixed ID formats.",
  {
    paper_ids: z
      .array(z.string())
      .describe("Array of paper IDs (S2, DOI:xxx, ARXIV:xxx, etc.)"),
    fields: z.string().optional(),
  },
  async (params) => {
    const data = await request<unknown[]>({
      path: "/graph/v1/paper/batch",
      method: "POST",
      params: {
        fields:
          params.fields ??
          "title,authors,year,venue,externalIds,citationCount,citationStyles",
      },
      body: { ids: params.paper_ids },
    });

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ count: data.length, papers: data }, null, 2),
        },
      ],
    };
  }
);

// --- Tool: bulk_search ---
server.tool(
  "bulk_search",
  "Search papers in bulk (up to 1000/page) with sorting. Supports boolean queries (+required -excluded |OR). Use for comprehensive literature surveys and trend analysis.",
  {
    query: z
      .string()
      .describe("Query with optional boolean operators: +term -excluded |OR"),
    sort: z
      .string()
      .optional()
      .describe("Sort: 'citationCount:desc', 'publicationDate:asc'"),
    fields: z.string().optional(),
    year: z.string().optional(),
    fieldsOfStudy: z.string().optional(),
    publicationTypes: z.string().optional(),
    minCitationCount: z.number().optional(),
    token: z.string().optional().describe("Continuation token from previous response"),
  },
  async (params) => {
    const data = await request<{ total: number; token?: string; data: unknown[] }>({
      path: "/graph/v1/paper/search/bulk",
      params: {
        query: params.query,
        sort: params.sort,
        fields: params.fields ?? "title,year,citationCount,authors,venue,tldr",
        year: params.year,
        fieldsOfStudy: params.fieldsOfStudy,
        publicationTypes: params.publicationTypes,
        minCitationCount: params.minCitationCount,
        token: params.token,
      },
    });

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            { total: data.total, token: data.token, count: data.data.length, papers: data.data },
            null,
            2
          ),
        },
      ],
    };
  }
);

// --- Start server ---
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Server error:", err);
  process.exit(1);
});
