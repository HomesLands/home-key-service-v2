// Library
import { prop, Ref, Typegoose } from "../../libs/typegoose/typegoose";

// Models
import { Basic } from "../basic";
import { User } from "../user";
import { Job } from "./job";
import { Image } from "../image";

enum VnpayStatus {
  unpaid = "Chưa thanh tóan",
  paid = "Đã thanh toán",
  paidError = "Thanh toán lỗi",
}

enum PaymentType {
  deposit = "deposit",
  afterCheckInCost = "afterCheckInCost",
  monthly = "monthly",
  recharge = "recharge",
}

enum PaymentMethod {
  cash = "cash",
  vnpay = "vnpay",
  internal = "internal",
}

const getRandomInt = (min, max) =>
  Math.floor(Math.random() * (max - min)) + min;
const getRandomString = (length, base) => {
  let result = "";
  const baseLength = base.length;

  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < length; i++) {
    const randomIndex = getRandomInt(0, baseLength);
    result += base[randomIndex];
  }

  return result;
};

const getRandomHex2 = () => {
  const baseString =
    "0123456789QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm";
  const ma = `${getRandomString(6, baseString)}`;
  return ma;
};

export class Order extends Basic {
  @prop({ default: getRandomHex2 })
  keyOrder: string;

  @prop({ ref: User })
  user: Ref<User>;

  @prop({ ref: Job })
  job?: Ref<Job>;

  @prop({ default: false })
  isCompleted: boolean;

  @prop()
  description?: string;

  @prop({ default: 0 })
  amount: number; // tổng tất cả

  @prop({ default: 0 })
  numberDayStay: number;

  @prop({ default: 0 })
  roomPrice: number;

  @prop({ default: 0 })
  electricNumber: number; // số kí điện sử dụng

  @prop({ default: 0 })
  electricPrice: number; // tổng tiền điện

  @prop({ default: 0 })
  waterPrice: number;  // (price x person)

  @prop({ default: 0 })
  servicePrice: number; // (price)

  @prop({ default: 0 })
  vehiclePrice: number; // (price x vihicle)

  @prop({ default: 0 })
  wifiPrice: number; // (price x person)

  @prop()
  type: PaymentType;

  @prop({ default: "Chưa thanh toán" })
  vnpayStatus: VnpayStatus;

  @prop({ default: "none" })
  paymentMethod: PaymentMethod;

  @prop({ ref: Image })
  UNC?: Ref<Image>;

  @prop()
  startTime?: Date //order monthly

  @prop()
  endTime?: Date // order monthly

  @prop()
  expireTime?: Date // order monthly
}

export const OrderModel = (connection) => {
  return new Order().getModelForClass(Order, {
    existingConnection: connection,
    schemaOptions: {
      collection: "orders",
      timestamps: true,
    },
  });
};

