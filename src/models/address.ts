// Library
import { prop, arrayProp, Typegoose, Ref, staticMethod, ModelType } from '../libs/typegoose/typegoose';
import { Length, validate, IsNotEmpty } from 'class-validator';
import * as _ from 'lodash';

// Model
import { Basic } from './basic';

// Utils
import { helpers } from '../utils';

/**
 * @swagger
 * definitions:
 *   Component:
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
interface IComponent {
  longName: string;
  shortName: string;
  types: string[];
}

/**
 * @swagger
 * definitions:
 *   Coordinate:
 *     properties:
 *       lat:
 *          type: number
 *          description: latitude
 *       lng:
 *         type: number
 *         description: longitude
 */

interface ICoordinate {
  lat: number;
  lng: number;
}

/**
 * @swagger
 * definitions:
 *   Viewport:
 *     properties:
 *       northeast:
 *          type: object
 *          $ref: '#definitions/Coordinate'
 *          description: northeast
 *       southwest:
 *          type: object
 *          $ref: '#definitions/Coordinate'
 *          description: southwest
 */

interface IViewport {
  northeast: ICoordinate;
  southwest: ICoordinate;
}

/**
 * @swagger
 * definitions:
 *   Geometry:
 *     properties:
 *       location:
 *          type: object
 *          $ref: '#definitions/Coordinate'
 *          description: location
 *       locationType:
 *          type: string
 *          description: locationType
 *       viewport:
 *          type: object
 *          $ref: '#definitions/Viewport'
 *          description: viewport
 */

interface IGeometry {
  location: ICoordinate;
  locationType: string;
  viewport: IViewport;
}

/**
 * @swagger
 * definitions:
 *   PlusCode:
 *     properties:
 *       compoundCode:
 *          type: string
 *          description: compoundCode
 *       globalCode:
 *         type: string
 *         description: globalCode
 */

interface IPlusCode {
  compoundCode: string;
  globalCode: string;
}

export class Address extends Basic {
  @prop()
  address: string;

  @prop()
  components: IComponent[];

  @prop()
  geometry: IGeometry;

  @prop()
  placeId: string;

  @prop()
  plusCode: IPlusCode;

  @prop()
  types: string[];
}

/**
 * @swagger
 * definitions:
 *   Address:
 *     properties:
 *       address:
 *         type: string
 *         description: fomated address
 *       components:
 *         type: array
 *         items:
 *           type: object
 *           $ref: '#definitions/Component'
 *           description: Address Component
 *       geometry:
 *         type: object
 *         $ref: '#definitions/Geometry'
 *         description: Address Geometry
 *       placeId:
 *         type: string
 *         description: placeId
 *       plusCode:
 *         type: object
 *         $ref: '#definitions/PlusCode'
 *         description: plus Code
 *       types:
 *         type: array
 *         items:
 *           type: string
 *           description: Address Types
 */

export const AddressModel = connection => {
  return new Address().getModelForClass(Address, {
    existingConnection: connection,
    schemaOptions: { timestamps: true },
  });
};
