// Library
import { prop, Typegoose, Ref } from '../libs/typegoose/typegoose';

import { User } from './user';

enum CodeType {
  resetPassword = 'resetPassword',
  setupPassword = 'setupPassword',
  verify = 'verify'
}

export class Code extends Typegoose {
  @prop({ ref: User, required: true })
  userId: Ref<User>;

  @prop()
  code: string;

  @prop()
  type: CodeType;

  @prop()
  verifyData: object;

  @prop()
  expiredAt: Date;
}

export const CodeModel = connection => {
  return new Code().getModelForClass(Code, {
    existingConnection: connection,
    schemaOptions: { timestamps: true },
  });
};
