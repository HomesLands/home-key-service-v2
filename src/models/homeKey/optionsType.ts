// Library
import {
  prop
} from "../../libs/typegoose/typegoose";

// Models
import { Basic } from "../basic";

export class OptionsType extends Basic {
  @prop()
  expense?: string;

  @prop()
  type?: string;

  @prop()
  unitPrice?: string;

  @prop()
  total?: string;

}

export const OptionsTypeModel = (connection) => {
  return new OptionsType().getModelForClass(OptionsType, {
    existingConnection: connection,
    schemaOptions: {
      collection: "optionsTypes",
      timestamps: true,
    },
  });
};
