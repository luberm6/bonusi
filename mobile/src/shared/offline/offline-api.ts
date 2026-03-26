export type SendMessageRequest = {
  conversationId: string;
  clientMessageId: string;
  text: string;
};

export type SendMessageResponse = {
  messageId: string;
  deduped: boolean;
  createdAt: string;
};

export interface OfflineApi {
  sendMessage(input: SendMessageRequest): Promise<SendMessageResponse>;
  fetchBranches(): Promise<Array<{ id: string; [k: string]: unknown }>>;
  fetchVisits(clientId: string): Promise<Array<{ id: string; visitDate: string; [k: string]: unknown }>>;
  fetchBonusBalance(clientId: string): Promise<{ clientId: string; balance: number }>;
  fetchBonusHistory(clientId: string): Promise<Array<{ id: string; createdAt: string; [k: string]: unknown }>>;
}
