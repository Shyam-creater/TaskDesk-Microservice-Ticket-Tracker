import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from './user.model.js';

export interface IMessage extends Document {
  _id: mongoose.Types.ObjectId;
  ticketId: mongoose.Types.ObjectId;
  senderId: string;
  senderRole: UserRole;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    ticketId: {
      type: Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true,
      index: true,
    },
    senderId: {
      type: String,
      required: true,
    },
    senderRole: {
      type: String,
      enum: ['user', 'admin'],
      required: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
    collection: 'messages',
    toJSON: {
      transform(_doc, ret) {
        delete (ret as Record<string, unknown>).__v;
        return ret;
      },
    },
  }
);

MessageSchema.index({ ticketId: 1, createdAt: 1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
