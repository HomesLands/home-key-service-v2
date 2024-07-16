// Libraries
import * as _ from 'underscore';
import { validate } from 'class-validator';
import * as mongoose from 'mongoose';
// Models
import { Typegoose, ModelType, staticMethod, prop } from '../libs/typegoose/typegoose';

import { helpers } from '../utils';

export class Basic extends Typegoose {
  @prop({ default: false })
  isDeleted: boolean;

  @staticMethod
  static async validateData(this: ModelType<Basic> & typeof Basic, groups: any, data: any): Promise<any> {
    try {
      // Init basic class
      let basicData = new Basic();

      // Assign value
      helpers.assignObjectValueFromOtherObject(basicData, data);

      // Validate input data first
      return await validate(basicData, {
        groups: groups,
        validationError: { target: false },
      });
    } catch (error) {
      throw new Error(error);
    }
  }

  @staticMethod
  static async paginate(
    this: ModelType<Basic> & typeof Basic,
    size: number,
    page: number,
    aggregation?: object[],
    conditions?: object,
    filter?: object,
  ): Promise<any> {
    try {
      let pipeLine = [];

      // Add condition pipeline
      if (_.isObject(conditions)) {
        pipeLine.push({
          $match: conditions,
        });
      }

      // Add filter pipeline
      if (_.isObject(filter)) {
        pipeLine.push({
          $project: filter,
        });
      }

      // Add custom aggregation, using custom aggregation will ignore condition and filter
      if (_.isObject(aggregation)) {
        pipeLine = pipeLine.concat(aggregation);
      }

      // Limit item
      if (size && +size > 0) {
        // Limit page with size
        if (page && +page > 0) {
          pipeLine.push({
            $skip: +page * +size,
          });
          pipeLine.push({
            $limit: +size,
          });
        } else {
          // Limit page with default
          pipeLine.push({
            $limit: +size,
          });
        }
      } else {
        if (page && +page > 0) {
          return {
            currentPage: +page,
            totalPage: 1,
            data: [],
          };
        }
      }

      let data = await this.aggregate(pipeLine).exec();

      let totalPage = 1;

      let totalRow = 0;

      // Get sum of documents
      if (_.isObject(aggregation)) {
        aggregation.push({
          $count: 'number',
        });

        // Get total documents base on aggregation
        let totalDocs = await this.aggregate(aggregation).exec();

        if (totalDocs.length > 0) {
          totalRow = totalDocs[0].number;
        }

        // Calculate total page
        totalPage = +size > 0 ? (totalDocs.length > 0 ? Math.ceil(totalDocs[0].number / +size) : 1) : 1;
      } else {
        // I
        let totalDocumentCount = await this.find(conditions ? conditions : {})
          .count()
          .lean()
          .exec();

        // Calculate total page
        totalPage = +size > 0 ? Math.ceil(totalDocumentCount / +size) : 1;
      }

      return {
        currentPage: +page ? +page : 0,
        totalRow,
        totalPage,
        data,
      };
    } catch (error) {
      throw new Error(error);
    }
  }
}
