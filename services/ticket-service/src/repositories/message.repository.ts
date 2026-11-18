import mongoose from 'mongoose';
import { Message, IMessage, MessageSenderRole } from '../models/message.model';

export interface CreateMessageData {
  ticketId: string;
  senderId: string;
  senderRole: MessageSenderRole;
  body: string;
}

export class MessageRepository {
  async create(data: CreateMessageData): Promise<IMessage> {
    const message = new Message({
      ticketId: new mongoose.Types.ObjectId(data.ticketId),
      senderId: data.senderId,
      senderRole: data.senderRole,
      body: data.body,
    });
    return await message.save();
  }

  async findByTicketId(ticketId: string): Promise<IMessage[]> {
    return await Message.find({ ticketId: new mongoose.Types.ObjectId(ticketId) })
      .sort({ createdAt: 1 })
      .exec();
  }

  async deleteByTicketId(ticketId: string): Promise<void> {
    await Message.deleteMany({ ticketId: new mongoose.Types.ObjectId(ticketId) }).exec();
  }
}

export const messageRepository = new MessageRepository();
