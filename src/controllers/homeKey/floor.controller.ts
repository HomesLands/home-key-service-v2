import { NextFunction, Request, Response } from "express";
import * as mongoose from "mongoose";

import ImageService from "../../services/image";
import HttpResponse from "../../services/response";

export default class FloorController {
  /**
   * @swagger
   * tags:
   *   - name: Floor
   *     description: Floor Control
   */

  /**
   * @swagger
   * /v1/homeKey/floor:
   *   post:
   *     description: Create floor
   *     tags: [Floor]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: motelRoomId
   *         in: formData
   *         required: true
   *         type: string
   *         description: motelRoom Id
   *       - name: name
   *         in: formData
   *         required: true
   *         type: string
   *         description: floor name
   *       - name: description
   *         in: formData
   *         required: true
   *         type: string
   *         description: floor description
   *     responses:
   *       200:
   *         description: Success
   *       400:
   *         description: Invalid request params
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Resource not found
   *     security:
   *          - auth: []
   */

  static async createFloor(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init models
      const {
        floor: floorModel,
        motelRoom: motelRoomModel,
      } = global.mongoModel;

      const imageService = new ImageService("local", true);

      // Process form data
      const processDataInfo = await imageService.processFormData(req, res);
      if (processDataInfo && processDataInfo.error) {
        return HttpResponse.returnBadRequestResponse(
          res,
          processDataInfo.error
        );
      }

      let { body: data } = req;

      const motelRoomData = await motelRoomModel
        .findOne({ _id: data.motelRoomId })
        .lean()
        .exec();

      if (!motelRoomData) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Phòng không tồn tại"
        );
      }

      let initData = {
        name: data.name,
        key: `F${motelRoomData.floors.length + 1}`,
        totalRoom: 0,
        availableRoom: 0,
        rentedRoom: 0,
        depositedRoom: 0,
        description: data.description,
      };

      // Create floor
      let resData = await floorModel.create(initData);

      // Update total floor
      await motelRoomModel
        .findOneAndUpdate(
          { _id: data.motelRoomId },
          {
            $inc: { totalFloor: 1 },
            $addToSet: { floors: resData._id },
          }
        )
        .exec();

      return HttpResponse.returnSuccessResponse(
        res,
        await FloorController.getFloorById(resData._id)
      );
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /v1/homeKey/floor/{id}:
   *   get:
   *     description: Return floor by id
   *     tags: [Floor]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         type: string
   *         description: floor id
   *     responses:
   *       200:
   *         description: Success
   *       400:
   *         description: Invalid request params
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Resource not found
   */

  static async getFloorDetail(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      let { id: floorId } = req.params;

      return HttpResponse.returnSuccessResponse(
        res,
        await FloorController.getFloorById(floorId)
      );
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /v1/homeKey/floor/{id}:
   *   delete:
   *     description: Return floor by id
   *     tags: [Floor]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         type: string
   *         description: floor id
   *     responses:
   *       200:
   *         description: Success
   *       400:
   *         description: Invalid request params
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Resource not found
   *     security:
   *          - auth: []
   */

  static async deleteFloor(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init models
      const {
        floor: floorModel,
        motelRoom: motelRoomModel,
        room: roomModel,
        job: jobModel,
      } = global.mongoModel;

      let { id: floorId } = req.params;

      const floorData = await floorModel.findOne({ _id: floorId }).exec();

      if (!floorData) {
        return HttpResponse.returnBadRequestResponse(res, "tầng không tồn tại");
      }

      for (let i = 0; i < floorData.rooms; i++) {
        if (["rented", "deposited"].includes(floorData.rooms[i].status)) {
          return HttpResponse.returnBadRequestResponse(
            res,
            "phòng tầng đã được thuê"
          );
        }
      }

      await motelRoomModel
        .findOneAndUpdate(
          { floors: floorId },
          {
            $pull: { floors: floorId },
            $inc: {
              totalFloor: -1,
              totalRoom: -floorData.totalRoom,
              availableRoom: -floorData.availableRoom,
              rentedRoom: -floorData.rentedRoom,
              depositedRoom: -floorData.depositedRoom,
            },
          }
        )
        .exec();

      await roomModel.remove({ _id: { $in: floorData.rooms } }).exec();

      return HttpResponse.returnSuccessResponse(
        res,
        await floorModel.remove({ _id: floorId }).exec()
      );
    } catch (e) {
      next(e);
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                            START HELPER FUNCTION                           */
  /* -------------------------------------------------------------------------- */

  // Get user by id
  static async getFloorById(floorId: any, lang?: string): Promise<any> {
    const { floor: floorModel, job: jobModel } = global.mongoModel;

    if (!mongoose.Types.ObjectId.isValid(floorId)) {
      return HttpResponse.returnErrorWithMessage(
        "Phòng Tầng Không Tồn Tại",
        lang
      );
    }

    let resData = await floorModel
      .findOne({ _id: floorId })
      .populate("rooms")
      .lean()
      .exec();

    if (!resData) {
      return HttpResponse.returnErrorWithMessage(
        "Phòng Tầng Không Tồn Tại",
        lang
      );
    }

    for (let i = 0; i < resData.rooms.length; i++) {
      if (["rented", "deposited"].includes(resData.rooms[i].status)) {
        const jobData = await jobModel
          .findOne({ room: resData.rooms[i]._id, isCompleted: true })
          .lean()
          .exec();

        if (jobData) {
          resData.rooms[i]["job"] = jobData._id;
        }
      }
    }

    // Return floor data
    return resData;
  }

  /* -------------------------------------------------------------------------- */
  /*                             END HELPER FUNCTION                            */
  /* -------------------------------------------------------------------------- */
}
