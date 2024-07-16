// Library
import { prop, Ref, pre, arrayProp } from '../../libs/typegoose/typegoose';

// Models
import { Basic } from '../basic';
import { Order } from './order';

type totalKwhData = {
	time: string,
	value: number,
}

export class TotalKwh extends Basic {
@prop({ ref: Order })
  order: Ref<Order>;

  @prop({default: [Number] })
  kWhData: number[];

  @prop({default: [String] })
  labelTime: string[];
}

export const TotalKwhModel = (connection) => {
	return new TotalKwh().getModelForClass(TotalKwh, {
		existingConnection: connection,
		schemaOptions: {
			collection: 'totalKwhs',
			timestamps: true,
		},
	});
};
