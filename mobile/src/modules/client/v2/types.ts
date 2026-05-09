export type ScreenKey = "home" | "booking" | "visits" | "visit-details" | "bonus-history" | "cashback" | "chat";

export type UserMe = {
  id: string;
  email: string;
  fullName?: string | null;
  role: string;
};

export type BonusBalance = {
  balance: number;
};

export type VisitRow = {
  id: string;
  visitDate: string;
  finalAmount?: number;
  totalAmount?: number;
  discountAmount?: number;
  comment?: string | null;
  branchName?: string | null;
  bonusAccrualAmount?: number;
  serviceNames?: string[];
  servicesCount?: number;
};

export type VisitServiceRow = {
  id: string;
  serviceNameSnapshot?: string;
  price: number;
  quantity: number;
  total: number;
};

export type VisitDetail = {
  id: string;
  visitDate: string;
  branchName?: string | null;
  adminName?: string | null;
  comment?: string | null;
  totalAmount?: number;
  discountAmount?: number;
  finalAmount?: number;
  bonusAccrualAmount?: number;
  visitServices?: VisitServiceRow[];
};

export type BonusHistoryRow = {
  id: string;
  type: "accrual" | "writeoff";
  amount: number;
  comment?: string | null;
  createdAt: string;
};

export type BranchRow = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string | null;
  workHours?: { text?: string } | Record<string, unknown>;
  description?: string | null;
  isActive: boolean;
};

export type ConversationRow = {
  id: string;
  clientId: string;
  adminId: string;
  unreadCount: number;
  updatedAt: string;
  lastMessage: { id: string; text: string | null; createdAt: string } | null;
};

export type MessageAttachment = {
  id: string;
  fileUrl: string;
  fileType: 'image' | 'pdf';
  fileName: string;
  size: number;
};

export type RepairDocumentRow = {
  id: string;
  text: string | null;
  createdAt: string;
  senderEmail: string;
  attachments: MessageAttachment[];
};

export type MessageRow = {
  id: string;
  senderId: string;
  receiverId: string;
  text: string | null;
  createdAt: string;
  readAt?: string | null;
  attachments?: MessageAttachment[];
};
