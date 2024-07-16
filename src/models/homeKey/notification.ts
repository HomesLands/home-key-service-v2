// Library
import { prop, Ref, pre, arrayProp } from "../../libs/typegoose/typegoose";

// Models
import { Basic } from "../basic";
import { User } from "../user";

import { Room } from "../homeKey/room";

export class Notification extends Basic {
  @prop()
  title: string;

  @prop()
  content: string;

  @prop({ ref: User })
  user: Ref<User>;

  isRead: boolean;
}

export const NotificationModel = (connection) => {
  return new Notification().getModelForClass(Notification, {
    existingConnection: connection,
    schemaOptions: {
      collection: "notifications",
      timestamps: true,
    },
  });
};
