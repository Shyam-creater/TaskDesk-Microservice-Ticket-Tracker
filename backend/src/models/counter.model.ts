import mongoose, { Schema } from 'mongoose';

export interface ICounter {
  _id: string;
  seq: number;
}

const CounterSchema = new Schema<ICounter>(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 1000 },
  },
  { versionKey: false, collection: 'counters' }
);

export const Counter = mongoose.model<ICounter>('Counter', CounterSchema);
