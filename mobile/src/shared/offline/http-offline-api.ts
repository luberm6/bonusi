import type { OfflineApi, SendMessageRequest, SendMessageResponse } from "./offline-api";

type HttpClient = (url: string, init?: RequestInit) => Promise<Response>;

type ConstructorInput = {
  apiBaseUrl: string;
  getAccessToken: () => string;
  http?: HttpClient;
};

function authHeaders(token: string): HeadersInit {
  return {
    authorization: `Bearer ${token}`,
    "content-type": "application/json"
  };
}

export class HttpOfflineApi implements OfflineApi {
  private readonly http: HttpClient;

  constructor(private readonly input: ConstructorInput) {
    this.http = input.http ?? fetch;
  }

  private token(): string {
    return this.input.getAccessToken();
  }

  async sendMessage(payload: SendMessageRequest): Promise<SendMessageResponse> {
    const res = await this.http(`${this.input.apiBaseUrl}/chat/conversations/${payload.conversationId}/messages`, {
      method: "POST",
      headers: authHeaders(this.token()),
      body: JSON.stringify({
        clientMessageId: payload.clientMessageId,
        text: payload.text
      })
    });
    if (!res.ok) throw new Error(`sendMessage failed: ${res.status}`);
    const json = (await res.json()) as { message: { id: string; createdAt: string }; deduped: boolean };
    return {
      messageId: json.message.id,
      deduped: Boolean(json.deduped),
      createdAt: json.message.createdAt
    };
  }

  async fetchBranches(): Promise<Array<{ id: string; [k: string]: unknown }>> {
    const res = await this.http(`${this.input.apiBaseUrl}/branches`, {
      method: "GET",
      headers: authHeaders(this.token())
    });
    if (!res.ok) throw new Error(`fetchBranches failed: ${res.status}`);
    return (await res.json()) as Array<{ id: string; [k: string]: unknown }>;
  }

  async fetchVisits(clientId: string): Promise<Array<{ id: string; visitDate: string; [k: string]: unknown }>> {
    const res = await this.http(`${this.input.apiBaseUrl}/visits?clientId=${encodeURIComponent(clientId)}`, {
      method: "GET",
      headers: authHeaders(this.token())
    });
    if (!res.ok) throw new Error(`fetchVisits failed: ${res.status}`);
    return (await res.json()) as Array<{ id: string; visitDate: string; [k: string]: unknown }>;
  }

  async fetchBonusBalance(clientId: string): Promise<{ clientId: string; balance: number }> {
    const res = await this.http(`${this.input.apiBaseUrl}/bonuses/balance?client_id=${encodeURIComponent(clientId)}`, {
      method: "GET",
      headers: authHeaders(this.token())
    });
    if (!res.ok) throw new Error(`fetchBonusBalance failed: ${res.status}`);
    const json = (await res.json()) as { clientId?: string; client_id?: string; balance: number };
    return {
      clientId: String(json.clientId ?? json.client_id ?? clientId),
      balance: Number(json.balance ?? 0)
    };
  }

  async fetchBonusHistory(clientId: string): Promise<Array<{ id: string; createdAt: string; [k: string]: unknown }>> {
    const res = await this.http(`${this.input.apiBaseUrl}/bonuses/history?client_id=${encodeURIComponent(clientId)}`, {
      method: "GET",
      headers: authHeaders(this.token())
    });
    if (!res.ok) throw new Error(`fetchBonusHistory failed: ${res.status}`);
    return (await res.json()) as Array<{ id: string; createdAt: string; [k: string]: unknown }>;
  }
}
