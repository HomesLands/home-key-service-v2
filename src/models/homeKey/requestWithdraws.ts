// Library
import { prop, Ref, Typegoose } from "../../libs/typegoose/typegoose";

// Models
import { Basic } from "../basic";
import { User } from "../user";
import { Image } from "../image";
enum WithdrawMethod {
  cash = "cash",
  banking = "banking",
  momo = "momo",
  vnpay = "vnpay",
  internal = "internal",
}

enum StatusWithdraws {
  waiting = "waiting",
  success = "success",
  faild = "faild",
  cancel = "cancel",
}

export class RequestWithdraws extends Basic {
  @prop({ ref: User })
  user: Ref<User>;

  @prop({ default: "Mã thanh toán" })
  keyPayment: string;

  @prop()
  description?: string;

  @prop({ default: 0 })
  amount: number;

  @prop()
  status: StatusWithdraws;

  @prop()
  stk: number;

  @prop()
  nameTk: string;

  @prop()
  nameTkLable: string;

  @prop()
  branch: string;

  @prop()
  phoneNumberFull: string;

  @prop({ default: "none" })
  paymentMethod: WithdrawMethod;

  @prop({ ref: Image })
  file?: Ref<Image>;
}

export const RequestWithdrawsModel = (connection) => {
  return new RequestWithdraws().getModelForClass(RequestWithdraws, {
    existingConnection: connection,
    schemaOptions: {
      collection: "requestWithdraws",
      timestamps: true,
    },
  });
};

