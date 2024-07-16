// Libraries
import * as bcrypt from "bcryptjs";
// Models
import {
  arrayProp,
  pre,
  prop,
  Ref,
  staticMethod,
} from "../libs/typegoose/typegoose";
import { Basic } from "./basic";
import { Image } from "./image";
import { Room } from "./homeKey/room";
import { Job } from "./homeKey/job";

import { helpers } from "../utils";

enum Role {
  customer = "customer", // Normal user
  master = "master", // An admin user who manage all things
  content = "content", // An content user who manage limit things
  host = "host", // host of motel room
}

enum Gender {
  male = "male",
  female = "female",
  na = "n/a",
}

/**
 * @swagger
 * definitions:
 *   PhoneNumber:
 *     properties:
 *       types:
 *         type: array
 *         items:
 *           type: string
 *           description: types
 *       longName:
 *          type: string
 *          description: longName
 *       shortName:
 *         type: string
 *         description: shortName
 */
interface IPhoneNumber {
  countryCode: string;
  number: string;
}

// Before save hook
@pre<User>("save", async function(next) {
  // Only crypt password for non-social login
  if (
    this.provider !== "facebook" &&
    this.provider !== "twitter" &&
    this.provider !== "instagram" &&
    this.provider !== "google"
  ) {
    if (this.password) {
      // Replace raw password by the hashed one
      this.password = await helpers.generateHashPassword(this.password);

      //Complete this sign up process
      this.signUpCompleted = true;
    }
  }

  next();
})
export class User extends Basic {
  @prop()
  email?: string;

  @prop()
  password?: string;

  @prop()
  provider?: string;

  @prop()
  firstName: string;

  @prop()
  lastName: string;

  @prop({ ref: Image })
  avatar?: Ref<Image>;

  @prop({ ref: Image })
  frontId?: Ref<Image>;

  @prop({ ref: Image })
  backId?: Ref<Image>;

  @arrayProp({ itemsRef: Image, default: [] })
  identityCards: Ref<Image>[];

  @prop({ enum: Gender })
  gender?: Gender;

  @prop()
  dob?: Date;

  @prop({ default: "" })
  dobString?: string;

  @prop({ default: "" })
  nationalId?: string;

  @prop()
  phoneNumber: IPhoneNumber;

  @prop({ default: "" })
  phoneNumberFull?: string;

  @prop({ enum: Role })
  role: Role[];

  @prop()
  token?: string;

  @prop({ default: "" })
  tokenForgotPassword?: string;

  @prop({ default: "" })
  address?: string;

  @prop({ default: "" })
  tokenActive?: string;

  @prop({ default: false })
  isVerified?: boolean;

  @prop({ default: false })
  signUpCompleted: boolean;

  @prop({ default: false })
  active?: boolean;

  @prop({ ref: User })
  createdBy?: Ref<User>;

  @prop()
  notifications: string[];

  @prop({ ref: Room })
  room: Ref<Room>;

  @prop({ ref: Job })
  currentJob: Ref<Job>;

  @arrayProp({ itemsRef: Job, default: [] })
  jobs: Ref<Job>;

  @prop({ default: 0 })
  wallet: number;

  @prop({ default: null })
  idDevice: number;

  @prop()
  isCensorHost?: boolean;

  @staticMethod
  static async validatePassword(
    inputPassword: string,
    userPassword: string
  ): Promise<any> {
    try {
      return await bcrypt.compare(inputPassword, userPassword);
    } catch (error) {
      throw new Error(error);
    }
  }
}

export const UserModel = (connection: any) => {
  return new User().setModelForClass(User, {
    existingConnection: connection,
    schemaOptions: {
      collection: "users",
      timestamps: true,
    },
  });
};
