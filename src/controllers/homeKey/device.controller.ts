import { Request, Response, NextFunction } from "express";
import * as mongoose from "mongoose";

import ImageService from "../../services/image";
import HttpResponse from "../../services/response";

export default class DeviceController {
  /**
   * @swagger
   * tags:
   *   - name: Device
   *     description: Device Control
   */

  /**
   * @swagger
   * /v1/homeKey/device:
   *   post:
   *     description: Add device
   *     tags: [Device]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: name
   *         in: formData
   *         type: name
   *         description: device name
   *       - name: mac
   *         in: formData
   *         required: true
   *         type: string
   *         description: device mac
   *       - name: type
   *         in: formData
   *         required: true
   *         type: string
   *         enum:
   *           - gateway
   *           - lock
   *         description: device type
   *       - name: parent
   *         in: formData
   *         type: string
   *         description: device parent
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
  static async createDevice(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init models
      const { device: deviceModel } = global.mongoModel;

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

      const deviceData = await deviceModel.create(data);

      return HttpResponse.returnSuccessResponse(
        res,
        await DeviceController.getDeviceById(deviceData._id)
      );
    } catch (e) {
      next(e);
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                            START HELPER FUNCTION                           */
  /* -------------------------------------------------------------------------- */

  // Get device by id
  static async getDeviceById(deviceId: any, lang?: string): Promise<any> {
    const { device: deviceModel } = global.mongoModel;

    if (!mongoose.Types.ObjectId.isValid(deviceId)) {
      return HttpResponse.returnErrorWithMessage("Phòng không tồn tại", lang);
    }

    let resData = await deviceModel
      .findOne({ _id: deviceId })
      .populate("children")
      .lean()
      .exec();

    if (!resData) {
      return HttpResponse.returnErrorWithMessage("Phòng không tồn tại", lang);
    }

    // Return floor data
    return resData;
  }

  /* -------------------------------------------------------------------------- */
  /*                             END HELPER FUNCTION                            */
  /* -------------------------------------------------------------------------- */
}
