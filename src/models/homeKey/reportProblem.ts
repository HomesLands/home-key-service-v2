// Library
import { prop, Ref, pre, arrayProp } from "../../libs/typegoose/typegoose";

// Models
import { Basic } from "../basic";
import { User } from "../user";

import { Room } from "./room";
import { MotelRoom } from "./motelRoom";
import { Image } from "../image";

enum ReportProblemStatus {
  waiting = "waiting",
  processing = "processing",
  success = "success",
  unknown = "unknown",
}

export class ReportProblem extends Basic {
  @prop()
  idReportProblem: string;

  @prop({ ref: MotelRoom })
  motelRoom?: Ref<MotelRoom>;

  @prop({ ref: User })
  user: Ref<User>;

  @prop({ ref: Room })
  room: Ref<Room>;

  @prop({ default: "unknown" })
  status: ReportProblemStatus;

  @prop()
  description?: string;

  @prop({ ref: Image })
  image?: Ref<Image>;
}

export const ReportProblemModel = (connection) => {
  return new ReportProblem().getModelForClass(ReportProblem, {
    existingConnection: connection,
    schemaOptions: {
      collection: "reportProblems",
      timestamps: true,
    },
  });
};
