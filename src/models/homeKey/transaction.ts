// Library
import { prop, Ref, Typegoose } from "../../libs/typegoose/typegoose";

// Models
import { Basic } from "../basic";
import { User } from "../user";
import { Image } from "../image";
import { Order } from "./order";
import { MotelRoom } from "./motelRoom";
import { Banking } from "./bank";
import { Room } from "./room";
enum PaymentMethod {
  cash = "cash",
  banking = "banking",
  momo = "momo",
  vnpay = "vnpay",
  internal = "internal",
  wallet = "wallet"
}

enum PaymentType {
  deposit = "deposit",
  afterCheckInCost = "afterCheckInCost",
  monthly = "monthly",
  recharge = "recharge",
  withdraw = "withdraw",
}

enum StatusTransactions {
  waiting = "waiting",
  success = "success",
  faild = "faild",
  cancel = "cancel",
}

export class Transactions extends Basic {
  @prop({ ref: User })
  user: Ref<User>;

  @prop({ default: "Mã thanh toán" })
  keyPayment: string;

  @prop() // lấy từ order
  keyOrder: string;

  @prop()
  motelName: string;

  @prop()
  description?: string;

  @prop()
  note?: string;

  @prop({ default: 0 })
  amount: number;

  @prop()
  status: StatusTransactions;

  @prop({ default: "none" })
  paymentMethod: PaymentMethod;

  @prop({ ref: Image })
  file?: Ref<Image>;

  @prop({ ref: Order })
  order?: Ref<Order>; //->job->room->floor->motel->

  @prop({ ref: Banking })
  banking?: Ref<Banking>; // tài khoản người nhận

  @prop({ default: "none" })
  type: PaymentType;

  @prop({ ref: MotelRoom })
  motel: Ref<MotelRoom>; // để query theo tòa nhanh

  @prop({ ref: Room })
  room: Ref<Room>; // để query theo tòa nhanh
}

export const TransactionsModel = (connection) => {
  return new Transactions().getModelForClass(Transactions, {
    existingConnection: connection,
    schemaOptions: {
      collection: "transactions",
      timestamps: true,
    },
  });
};
