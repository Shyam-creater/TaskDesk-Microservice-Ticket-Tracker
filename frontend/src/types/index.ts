export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
}

export type TicketStatus = 'open' | 'in_progress' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high';

export interface Ticket {
  _id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
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
