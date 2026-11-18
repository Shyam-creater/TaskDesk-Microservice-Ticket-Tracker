import mongoose, { Schema, Document } from 'mongoose';

export type TicketStatus = 'open' | 'in_review' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high';

export interface IStatusHistoryItem {
  from: TicketStatus;
  to: TicketStatus;
  changedBy: string;
  changedAt: Date;
}

export interface ITicket extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdBy: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  statusHistory: IStatusHistoryItem[];
  createdAt: Date;
  updatedAt: Date;
}

const StatusHistorySchema = new Schema<IStatusHistoryItem>(
  {
    from: {
      type: String,
      enum: ['open', 'in_review', 'in_progress', 'resolved', 'closed'],
      required: true,
    },
    to: {
      type: String,
      enum: ['open', 'in_review', 'in_progress', 'resolved', 'closed'],
      required: true,
    },
    changedBy: {
      type: String,
      required: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const TicketSchema = new Schema<ITicket>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    status: {
      type: String,
      enum: ['open', 'in_review', 'in_progress', 'resolved', 'closed'],
      default: 'open',
      required: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
      required: true,
    },
    createdBy: {
      type: String,
      required: true,
      index: true,
    },
    reviewedBy: {
      type: String,
      default: undefined,
    },
    reviewedAt: {
      type: Date,
      default: undefined,
    },
    statusHistory: {
      type: [StatusHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete (ret as Record<string, unknown>).__v;
        return ret;
      },
    },
  }
);

// Compound index for user queries with status filter
TicketSchema.index({ createdBy: 1, status: 1 });

// Compound index for admin filters by status and priority
TicketSchema.index({ status: 1, priority: 1 });

// Index for chronological ordering
TicketSchema.index({ createdAt: -1 });

export const Ticket = mongoose.model<ITicket>('Ticket', TicketSchema);
