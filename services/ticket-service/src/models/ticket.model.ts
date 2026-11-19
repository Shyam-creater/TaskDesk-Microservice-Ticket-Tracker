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
  customId: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdBy: string;
  createdByName?: string;
  createdByEmail?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  statusHistory: IStatusHistoryItem[];
  createdAt: Date;
  updatedAt: Date;
}

const TicketSchema = new Schema<ITicket>(
  {
    customId: { type: String, unique: true, sparse: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: ['open', 'in_review', 'in_progress', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
      index: true,
    },
    createdBy: { type: String, required: true, index: true },
    createdByName: { type: String },
    createdByEmail: { type: String },
    reviewedBy: { type: String },
    reviewedAt: { type: Date },
    statusHistory: [
      {
        from: { type: String, required: true },
        to: { type: String, required: true },
        changedBy: { type: String, required: true },
        changedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
    collection: 'tickets',
  }
);

export const Ticket = mongoose.model<ITicket>('Ticket', TicketSchema);
