import mongoose, { Schema, Document } from 'mongoose';

export type NotificationType =
  | 'ticket_created'
  | 'status_updated'
  | 'priority_updated'
  | 'ticket_reviewed'
  | 'message_received';

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  recipientId?: string;
  recipientRole?: 'user' | 'admin';
  ticketId?: mongoose.Types.ObjectId;
  customId?: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientId: { type: String, required: false, index: true },
    recipientRole: { type: String, enum: ['user', 'admin'], index: true },
    ticketId: { type: Schema.Types.ObjectId, ref: 'Ticket' },
    customId: { type: String },
    type: {
      type: String,
      enum: [
        'ticket_created',
        'status_updated',
        'priority_updated',
        'ticket_reviewed',
        'message_received',
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
    collection: 'notifications',
  }
);

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
