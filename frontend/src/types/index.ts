export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
}

export type TicketStatus = 'open' | 'in_review' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high';

export interface StatusHistoryItem {
  from: TicketStatus;
  to: TicketStatus;
  changedBy: string;
  changedAt: string;
}

export interface Ticket {
  _id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdBy: string;
  reviewedBy?: string;
  reviewedAt?: string;
  statusHistory?: StatusHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  _id: string;
  ticketId: string;
  senderId: string;
  senderRole: UserRole;
  body: string;
  createdAt: string;
}

export interface TicketStats {
  open: number;
  in_review: number;
  in_progress: number;
  resolved: number;
  closed: number;
  total: number;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedTicketsResponse {
  tickets: Ticket[];
  pagination: Pagination;
}

export interface ApiResponse<T> {
  data: T;
  correlationId?: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
  correlationId?: string;
}
