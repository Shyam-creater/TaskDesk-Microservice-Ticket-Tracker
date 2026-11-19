import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  _id: mongoose.Types.ObjectId;
  ticketId: mongoose.Types.ObjectId;
  senderId: string;
  senderRole: 'user' | 'admin';
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    ticketId: { type: Schema.Types.ObjectId, ref: 'Ticket', required: true, index: true },
    senderId: { type: String, required: true },
    senderRole: { type: String, enum: ['user', 'admin'], required: true },
    body: { type: String, required: true, trim: true },
  },
  {
    timestamps: true,
    collection: 'messages',
  }
);

MessageSchema.index({ ticketId: 1, createdAt: 1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
