// Library
import { prop, Ref, pre, arrayProp } from '../../libs/typegoose/typegoose';

// Models
import { Basic } from '../basic';
import { User } from '../user';
import { Order } from './order';
import { Job } from './job';
import { Room } from '../homeKey/room';
import { Image } from '../image';

enum typePay {
    payDeposit = "payDeposit",
    noPayDeposit = "noPayDeposit",
}
enum reasonNoPay {
    noActive = "noActive",
    noPayAterCheckInCost = "noPayAterCheckInCost",
    noPayMonthly = "noPayMonthly", 
    unknown = "unknown", //typePay = payDeposit
}
enum statusPay {
    pendingPay = "pendingPay",
    paid = "paid",
}

export class payDepositList extends Basic {
	@prop({ ref: Room })
	room: Ref<Room>;

	@prop({ ref: User })
	user: Ref<User>;

	@prop({ ref: Job })
	job: Ref<Job>;

	@arrayProp({ itemsRef: Order })
	ordersNoPay: Ref<Order>[];

    @prop()
    type: typePay;

    @prop()
    reasonNoPay: reasonNoPay;

    @prop({default: "pendingPay"})
    status: statusPay;

    @prop()
    expiredTimePay: Date;

    @prop({default: 0})
    amount: number;

    @prop({ ref: Image })
    file?: Ref<Image>;
}

export const PayDepositListModel = connection => {
	return new payDepositList().getModelForClass(payDepositList, {
		existingConnection: connection,
		schemaOptions: {
			collection: 'payDepositList',
			timestamps: true,
		},
	});
};
