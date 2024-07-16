// Library
import { prop, Ref, Typegoose } from '../libs/typegoose/typegoose';

// Models
import { Basic } from './basic';
import { User } from './user';
import { Job } from './homeKey/job';

enum Status {
  unpaid = 'Chưa thanh tóan',
  paid = 'Đã thanh toán',
  paidError = 'Thanh toán lỗi'
}

export class Transaction extends Basic {
  @prop({ ref: User })
  user: Ref<User>

  @prop({ ref: Job })
  job: Ref<Job>;

  @prop()
  description: string;

  @prop()
  amount: number;

  @prop({ default: 'Chưa thanh toán' })
  status: Status;

  @prop({ default: false })
  isCompleted: boolean;
}

export const TransactionModel = connection => {
  return new Transaction().getModelForClass(Transaction, {
    existingConnection: connection,
    schemaOptions: {
      collection: 'transactions',
      timestamps: true,
    },
  });
};
