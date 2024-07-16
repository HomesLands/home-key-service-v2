import { prop, Ref, Typegoose, arrayProp } from '../../libs/typegoose/typegoose';

import { Basic } from '../basic';

export class HistoryEnergy extends Basic {
    @prop() 
    IdDevice: number;

    @prop()
    TotalKWh: number;

    @prop({ default: 0 })
    Water: number;

    @prop({ default: null })
    FromTime: Date;

    @prop({ default: null })
    ToTime: Date;
}

export const HistoryEnergyModel = (connection) => {
    return new HistoryEnergy().getModelForClass(HistoryEnergy, {
        existingConnection: connection,
        schemaOptions: {
            collection: "historyEnergy",
            timestamps: true,
        }
    })
}