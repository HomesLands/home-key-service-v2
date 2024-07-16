// Library
import { prop, Ref } from "../../libs/typegoose/typegoose";

// Models
import { Basic } from "../basic";
import { OptionsType } from "./optionsType";
import { User } from "../user";
import { MotelRoom } from "./motelRoom";
import { Room } from "./room";
import { Order } from "./order";

enum PaymentType {
  deposit = "deposit",
  afterCheckInCost = "afterCheckInCost",
  monthly = "monthly",
  recharge = "recharge",
}

export class Bill extends Basic {
  @prop()
  idBill?: string;

  @prop()
  dateBill?: string;

  @prop()
  nameMotel?: string;

  @prop()
  addressMotel?: string;

  @prop()
  nameRoom?: string;
  //-----------
  @prop()
  nameUser?: string;

  @prop()
  phoneUser?: string;

  @prop()
  emailUser?: string;

  @prop()
  addressUser?: string;
  //----------
  @prop()
  nameOwner?: string;

  @prop()
  phoneOwner?: string;

  @prop()
  emailOwner?: string;

  @prop()
  addressOwner?: string;

  @prop()
  nameBankOwner?: string; // tên ngân hàng

  @prop()
  nameOwnerBankOwner?: string; // tên chủ tài khoản

  @prop()
  numberBankOwner?: string;
  //-----------

  @prop()
  imgRoom?: string;

  @prop()
  totalAll?: string;

  @prop()
  totalAndTaxAll?: string;

  @prop()
  totalTaxAll?: string;

  @prop()
  typeTaxAll?: string;

  @prop()
  description?: string;

  @prop({ ref: OptionsType })
  electricity?: Ref<OptionsType>;

  @prop({ ref: OptionsType })
  garbage?: Ref<OptionsType>;

  @prop({ ref: OptionsType })
  water?: Ref<OptionsType>;

  @prop({ ref: OptionsType })
  wifi?: Ref<OptionsType>;

  @prop({ ref: OptionsType })
  vehicle?: Ref<OptionsType>;

  @prop({ ref: OptionsType })
  other?: Ref<OptionsType>;

  @prop({ ref: OptionsType })
  room: Ref<OptionsType>;

  @prop({ ref: User })
  user: Ref<User>;

  @prop({ ref: MotelRoom })
  motel: Ref<MotelRoom>;

  @prop({ ref: Room })
  roomRented: Ref<Room>;

  @prop({ ref: Order })
  order: Ref<Order>;

  @prop()
  startTime?: Date //order monthly

  @prop()
  endTime?: Date // order monthly

  @prop()
  type: PaymentType;
}

export const BillModel = (connection) => {
  return new Bill().getModelForClass(Bill, {
    existingConnection: connection,
    schemaOptions: {
      collection: "bills",
      timestamps: true,
    },
  });
};
