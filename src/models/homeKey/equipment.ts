// Library
import { prop, Ref, Typegoose } from '../../libs/typegoose/typegoose';

// Models
import { Basic } from '../basic';
import { Image } from '../image';

export class Equipment extends Basic {
  @prop()
  name: string;

  @prop()
  key: string;

  @prop({ ref: Image })
  images: Ref<Image>[];

  @prop({ ref: Image })
  icon: Ref<Image>;

  @prop()
  description?: string;
}

export const EquipmentModel = connection => {
  return new Equipment().getModelForClass(Equipment, {
    existingConnection: connection,
    schemaOptions: {
      collection: 'equipments',
      timestamps: true,
    },
  });
};
