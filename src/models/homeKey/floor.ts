// Library
import { prop, Ref, Typegoose, arrayProp } from '../../libs/typegoose/typegoose';

// Models
import { Basic } from '../basic';
import { Room } from './room';

export class Floor extends Basic {
  @prop()
  name: string;

  @prop()
  key: string;

  @prop({ default: 0 })
  totalRoom: number;

  @prop({ default: 0 })
  availableRoom: number;

  @prop({ default: 0 })
  rentedRoom: number;

  @prop({ default: 0 })
  depositedRoom: number;

  @prop({ default: 0 })
  soonExpireContractRoom: number;

  @prop()
  description?: string;

  @arrayProp({ itemsRef: Room, default: [] })
  rooms: Ref<Room>[];

  @prop({ default: false })
  isCompleted: boolean;
}

export const FloorModel = connection => {
  return new Floor().getModelForClass(Floor, {
    existingConnection: connection,
    schemaOptions: {
      collection: 'floors',
      timestamps: true,
    },
  });
};
