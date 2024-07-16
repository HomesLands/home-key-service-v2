// Library
import { prop, arrayProp, Ref, Typegoose } from '../../libs/typegoose/typegoose';

// Models
import { Basic } from '../basic';

enum DeviceType {
  gateway = 'gateway',
  lock = 'lock'
}

export class Device extends Basic {
  @prop()
  name?: string;

  @prop({ required: true })
  mac: string;

  @prop({ required: true })
  type: DeviceType;

  @prop({ ref: Device })
  parent?: Ref<Device>;

  @arrayProp({ itemsRef: Device, default: [] })
  children: Ref<Device>[];

  @prop()
  data: object;

  @prop()
  description?: string;
}

export const DeviceModel = connection => {
  return new Device().getModelForClass(Device, {
    existingConnection: connection,
    schemaOptions: {
      collection: 'devices',
      timestamps: true,
    },
  });
};
