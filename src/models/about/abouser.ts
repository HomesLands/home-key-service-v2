// // Library
// import { prop, Typegoose } from '../../libs/typegoose/typegoose';

// export class AboutUser extends Typegoose {
//   @prop()
//   lastName: string;
// }

// /**
//  * @swagger
//  * definitions:
//  *   AboutUser:
//  *     properties:
//  *       name:
//  *          type: string
//  *          description: name
//  *       type:
//  *          type: string
//  *          description: type
//  *       measure:
//  *          type: string
//  *          description: measure
//  *       description:
//  *          type: string
//  *          description: description
//  */

// export const AboutUserModel = connection => {
//   return new AboutUser().getModelForClass(AboutUser, {
//     existingConnection: connection,
//     schemaOptions: { collection: 'AboutUsers', timestamps: true },
//   });
// };
