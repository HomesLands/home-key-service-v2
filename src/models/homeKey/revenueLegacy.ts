import { prop, Ref } from "../../libs/typegoose/typegoose";
import { Basic } from "../basic";
import { User } from "../user";

class Withdrawal {
    @prop()
    withdrawalId: string;

    @prop()
    amount: number;

    @prop()
    remainingRevenue: number;

    @prop()
    date: Date;
}

class MotelRevenue {
    @prop()
    motelId: string;

    @prop()
    motelName: string;

    @prop()
    revenue: number;

    @prop()
    withdrawals: Withdrawal[]; // Thêm mảng lịch sử rút tiền
}

export class Revenue extends Basic {
    @prop({ ref: () => User })
    hostId: Ref<User>;

    @prop()
    hostName: string;

    @prop()
    motels: MotelRevenue[];

    @prop()
    timePeriod: string;

    @prop()
    date: Date;
}

export const RevenueModel = (connection) => {
    return new Revenue().getModelForClass(Revenue, {
        existingConnection: connection,
        schemaOptions: {
            timestamps: true,
            collection: "revenue",
        },
    });
};
