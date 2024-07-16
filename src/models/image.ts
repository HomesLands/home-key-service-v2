// Library
import { prop, post, pre, Typegoose } from "../libs/typegoose/typegoose";
enum Type {
  local = "local",
  s3 = "s3",
}

// Before save hook
@pre<Image>("findOne", function() {
  this["url"] = "123";
  // console.log("Pre: ", this["url"]);
  // console.log("Pre: ", this);
})
export class Image extends Typegoose {
  @prop()
  type: Type;

  @prop()
  fileName: string;

  @prop()
  path: string;

  @prop()
  description?: string;
}

export const ImageModel = (connection) => {
  return new Image().getModelForClass(Image, {
    existingConnection: connection,
    schemaOptions: { collection: "images", timestamps: true },
  });
};
