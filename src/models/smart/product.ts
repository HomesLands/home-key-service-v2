// Library
import { prop, Typegoose } from '../../libs/typegoose/typegoose';

export class Product extends Typegoose {
  @prop()
  name: string;

  @prop()
  type: string;

  @prop()
  measure: string;

  @prop()
  description?: string;
}

/**
 * @swagger
 * definitions:
 *   Product:
 *     properties:
 *       name:
 *          type: string
 *          description: name
 *       type:
 *          type: string
 *          description: type
 *       measure:
 *          type: string
 *          description: measure
 *       description:
 *          type: string
 *          description: description
 */

export const ProductModel = connection => {
  return new Product().getModelForClass(Product, {
    existingConnection: connection,
    schemaOptions: { collection: 'products', timestamps: true },
  });
};
