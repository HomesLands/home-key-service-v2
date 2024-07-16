// Library
import { prop, Ref, pre, arrayProp } from '../../libs/typegoose/typegoose';

// Models
import { Basic } from '../basic';
import { User } from '../user';
import { Order } from './order';
import { Room } from '../homeKey/room';
import { Image } from '../image';

export class Job extends Basic {
	@prop()
	checkInTime: Date;

	@prop()
	fullName: string;

	@prop()
	phoneNumber: string;

	@prop()
	price: number;

	@prop()
	bail: number;

	@prop()
	total: number;

	@prop()
	deposit: number;

	@prop()
	afterCheckInCost: number;

	@prop({ ref: Room })
	room: Ref<Room>;

	@prop({ ref: User })
	user: Ref<User>;

	@arrayProp({ itemsRef: Order })
	orders: Ref<Order>[];

	@arrayProp({ itemsRef: Image })
	images: Ref<Image>;

	@prop()
	roomPassword: number;

	@prop({ ref: Order })
	currentOrder: Ref<Order>;

	@prop({ default: false })
	isCompleted: boolean;

	@prop({ default: false })
	isActived: boolean;

	@prop({ default: false })
	isUpdatedReturnRoomDate: boolean;

	@prop()
	returnRoomDate: Date;

	@prop({ default: 1 })
	rentalPeriod: number;

	@prop({ default: 'pendingDepositPayment' })
	status: string;
}

export const JobModel = connection => {
	return new Job().getModelForClass(Job, {
		existingConnection: connection,
		schemaOptions: {
			collection: 'jobs',
			timestamps: true,
		},
	});
};
