// Library
import { prop, Ref, pre, arrayProp } from "../../libs/typegoose/typegoose";

// Models
import { Basic } from "../basic";
import { Image } from "../image";
import { User } from "../user";

enum RoomStatus {
  available = "available",
  rented = "rented",
  deposited = "deposited",
  soonExpireContract = "soonExpireContract",
  unknown = "unknown",
}

// Before save hook
@pre<Room>("save", async function(next) {
  const { floor: floorModel } = global.mongoModel;

  const floorData = await floorModel
    .findOne({ rooms: this._id })
    .populate("rooms")
    .lean()
    .exec();

  if (floorData) {
    let isCompleted = true;
    for (let i = 0; i < floorData.length; i++) {
      if (floorData.rooms[i].isCompleted === false) {
        isCompleted = false;
      }
    }

    await floorModel.findOneAndUpdate({ rooms: this._id }, { isCompleted });
  }

  next();
})
export class Room extends Basic {
  @prop()
  name: string;

  @prop({ default: "0" })
  idElectricMetter: string;

  @prop({ default: 0 })
  acreage: number;

  @prop()
  key: string;

  @prop()
  availableDate?: Date;

  @prop()
  unavailableDate?: Date;

  @prop({ default: "unknown" })
  status: RoomStatus;

  @prop({ default: 0 })
  price: number;

  @prop({ default: 0 })
  depositPrice: number;

  @prop({ default: 1 })
  minimumMonths: number;

  @prop({ default: 0 })
  electricityPrice: number;

  @prop({ default: 0 })
  waterPrice: number;

  @prop({ default: 0 })
  garbagePrice: number;

  @prop({ default: 0 }) // giá xe
  wifiPrice: number;

  @prop({ default: 0 }) // giá wifi
  wifiPriceN: number;

  @prop({ default: [] })
  utilities: string[];

  @prop()
  description?: string;

  @arrayProp({ itemsRef: Image, default: [] })
  images: Ref<Image>[];

  @prop({ default: false })
  isCompleted: boolean;

  @prop({ ref: User })
  rentedBy: Ref<User>;

  @prop()
  roomPassword: string;

  @prop({ default: 0 })
  previousElectricityNumber: number;

  @prop({ default: 0 })
  currentElectricityNumber: number;

  @prop({ default: 0 })
  previousWaterNumber: number;

  @prop({ default: 0 })
  currentWaterNumber: number;

  @prop({ default: 0 })
  person: number;

  @prop({ default: 0 })
  vihicle: number;

  @prop({default: []})
  listIdElectricMetter: [];

  @prop({default: ''})
  linkVideo: string;
}

export const RoomModel = (connection) => {
  return new Room().getModelForClass(Room, {
    existingConnection: connection,
    schemaOptions: {
      collection: "rooms",
      timestamps: true,
    },
  });
};
