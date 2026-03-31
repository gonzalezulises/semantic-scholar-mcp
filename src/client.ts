const BASE_URL = "https://api.semanticscholar.org";

interface RequestOptions {
  path: string;
  params?: Record<string, string | number | undefined>;
  method?: "GET" | "POST";
  body?: unknown;
}

const API_KEY = process.env.SEMANTIC_SCHOLAR_API_KEY;

let lastRequestTime = 0;
const MIN_INTERVAL_MS = API_KEY ? 1000 : 1100;

async function throttle(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

export async function request<T>(options: RequestOptions): Promise<T> {
  await throttle();

  const url = new URL(options.path, BASE_URL);
  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (API_KEY) headers["x-api-key"] = API_KEY;

  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch(url.toString(), {
      method: options.method ?? "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (res.status === 429) {
      const wait = Math.pow(2, attempt + 1) * 1000;
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Semantic Scholar API ${res.status}: ${text}`);
    }

    return (await res.json()) as T;
  }

  throw new Error("Rate limit exceeded after retries");
}
