// Library
import { prop, Ref, pre, arrayProp  } from "../../libs/typegoose/typegoose";
import * as mongoose from 'mongoose';
// Models
import { Basic } from "../basic";
import { User } from "../user";

import { Room } from "./room";
import { Transactions } from "./transaction";
import { Job } from "./job";
import { Order } from "./order";
import { payDepositList } from "./payDepositList";


export class Notification extends Basic {
  @prop()
  title: string;

  @prop()
  content: string;

  @prop({ ref: User })
  user: Ref<User>;

  @prop()
  isRead: boolean;

  @prop()
  url: string;

  @prop()
  type: string;

  @prop({ /*required: true, */enum: ['Transactions', 'Job', 'Order', 'payDepositList', null] })
  tag: string;

  @prop()
  contentTag!: Ref<Transactions | Job | Order | payDepositList | null>;

  // Virtual field for conditional population
  public get conditionalContentTag() {
    if (this.tag === 'Job') {
      return { ref: 'Job', localField: 'contentTag', foreignField: '_id', justOne: true };
    } else if (this.tag === 'Transactions') {
      return { ref: 'Transactions', localField: 'contentTag', foreignField: '_id', justOne: true };
    } else if (this.tag === 'Order') {
      return { ref: 'Order', localField: 'contentTag', foreignField: '_id', justOne: true };
    } else if (this.tag === 'payDepositList') {
      return { ref: 'payDepositList', localField: 'contentTag', foreignField: '_id', justOne: true };
    }
    return null;
  }

}

export const NotificationModel = (connection: mongoose.Connection) => {
  const schema = new Notification().getModelForClass(Notification, {
    existingConnection: connection,
    schemaOptions: {
      collection: "notifications",
      timestamps: true,
    },
  }).schema;

  // Add the virtual field to the schema
  schema.virtual('conditionalContentTag', {
    ref: (doc) => {
      switch (doc.tag) {
        case 'Transactions':
          return 'Transactions';
        case 'Job':
          return 'Job';
        case 'Order':
          return 'Order';
        case 'payDepositList':
          return 'payDepositList';
        default:
          return null;
      }
    },
    localField: 'contentTag',
    foreignField: '_id',
    justOne: true,
  });

  return connection.model('Notification', schema);
};

// export const NotificationModel = (connection) => {
//   return new Notification().getModelForClass(Notification, {
//     existingConnection: connection,
//     schemaOptions: {
//       collection: "notifications",
//       timestamps: true,
//     },
//   });
// };
