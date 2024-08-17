import { prop, Ref } from "../../libs/typegoose/typegoose";
import { Basic } from "../basic";
import { User } from "../user";
import { MotelRoom } from "./motelRoom";
import { Banking } from "./bank";
import { Bill } from "./bill";

enum changeType {
    recharge = "recharge", // +
    withdraw = "withdraw", // -
}
export class RevenueLog extends Basic {
    @prop({ ref: User })
    motelOwner: Ref<User>; // ===userTransfer with withdraw

    @prop({ ref: MotelRoom })
    motel: Ref<MotelRoom>; // null with withdraw

    @prop({ ref: User })
    userTransfer: Ref<User>;

    @prop({ ref: Banking })
    bankInCome: Ref<Banking>;

    @prop({ ref: Bill })
    bill: Ref<Bill>; // null with withdraw

    @prop()
    currentAmount: number;

    @prop()
    amountChange: number;

    @prop()
    type: changeType;

    @prop({default: 0})
    roomAmount: number; // roomPrice // null with withdraw

    @prop({default: 0})
    depositAmount: number; // include: deposit and afterCheckInCost
    // null with withdraw

    @prop({default: 0})
    electricAmount: number; // 0 with withdraw

    @prop({default: 0})
    waterAmount: number; // 0 with withdraw

    @prop({default: 0})
    serviceAmount: number; // 0 with withdraw

    @prop({default: 0})
    vehicleAmount: number; // 0 with withdraw

    @prop({default: 0})
    wifiAmount: number; // 0 with withdraw

    @prop({default: 0})
    otherAmount: number; // 0 with withdraw

    @prop()
    time: Date; // createdAt in transaction
}

export const RevenueLogModel = (connection) => {
    return new RevenueLog().getModelForClass(RevenueLog, {
        existingConnection: connection,
        schemaOptions: {
            timestamps: true,
            collection: "revenueLog",
        },
    });
};
