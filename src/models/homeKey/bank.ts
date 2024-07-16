// Library
import {
  prop,
  Ref,
  Typegoose,
  arrayProp,
} from "../../libs/typegoose/typegoose";

// Models
import { Basic } from "../basic";
import { User } from "../user";
import { Image } from "../image";

export class Banking extends Basic {
  @prop({ ref: User })
  user: Ref<User>;

  @prop({ default: "Add" })
  id: string;

  @prop()
  bank?: string;

  @prop()
  branch?: string;

  @prop()
  nameTk?: string;

  @prop()
  stk?: string;

  @prop()
  nameTkLable?: string;

  @arrayProp({ itemsRef: Image, default: [] })
  images: Ref<Image>[];
}

export const BankingModel = (connection) => {
  return new Banking().getModelForClass(Banking, {
    existingConnection: connection,
    schemaOptions: {
      collection: "banking",
      timestamps: true,
    },
  });
};
