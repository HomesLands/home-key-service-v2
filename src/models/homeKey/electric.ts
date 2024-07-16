// Library
import { prop, Ref, Typegoose } from "../../libs/typegoose/typegoose";

// Models
import { Basic } from "../basic";

export class Electrics extends Basic {
    @prop()
    IdDevice: number;

    @prop()
    NameRoom: string;

    @prop()
    Time: Date;    

    @prop()
    Total_kWh: number;

    @prop()
    Export_kWh: number;

    @prop()
    Import_kWh: number;

    @prop()
    Voltage: number;

    @prop()
    Current: number;

    @prop()
    Active_Power: number;

    @prop()
    Reactive_Power: number;

    @prop()
    Power_Factor: number;

    @prop()
    Frequency: number;
}

export const ElectricsModel = (connection) => {
  return new Electrics().getModelForClass(Electrics, {
    existingConnection: connection,
    schemaOptions: {
      collection: "electrics",
      timestamps: true,
    },
  });
};
