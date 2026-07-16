export type ApiClientOptions = {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
};

export class EduFermaApiClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl || "";
    this.fetchImpl = options.fetchImpl || fetch;
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "GET" });
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: "PATCH", body: body === undefined ? undefined : JSON.stringify(body) });
  }

  async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...init.headers
      }
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.error?.message || `API request failed: ${response.status}`);
    }
    return payload as T;
  }
}
