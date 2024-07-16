import { Request, Response, NextFunction } from "express";
import HttpResponse from "../services/response";

import { helpers } from "../utils";

import NotificationController from "./homeKey/notification";

import * as lodash from "lodash";

// Services
import VnpayService from "../services/vnpay";
import ImageService from "../services/image";

export default class VnpayController {
  /**
   * @swagger
   * tags:
   *   - name: VNPAY
   *     description: VNPAY APIs
   */

  /**
   * @swagger
   * /v1/payment/vnpay/createPaymentUrl:
   *   post:
   *     description: Create vnpay payment url
   *     tags: [VNPAY]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: orderId
   *         in: formData
   *         type: string
   *         description: orderId
   *       - name: bankCode
   *         in: formData
   *         type: string
   *         description: bankCode
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

  static async createPaymentUrl(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init models
      const { order: orderModel, job: jobModel } = global.mongoModel;

      // Init image service
      const imageService = new ImageService("local", true);

      // Process form data
      const processDataInfo = await imageService.processFormData(req, res);
      if (processDataInfo && processDataInfo.error) {
        return HttpResponse.returnBadRequestResponse(
          res,
          processDataInfo.error
        );
      }

      // Get data
      let { body: data } = req;

      const orderData = await orderModel
        .findOne({ _id: data.orderId })
        .lean()
        .exec();

      if (!orderData) {
        return HttpResponse.returnBadRequestResponse(res, "order.not.exist");
      }

      if (orderData.isCompleted) {
        return HttpResponse.returnBadRequestResponse(res, "order.completed");
      }

      const jobData = await jobModel
        .findOne({ _id: orderData.job })
        .populate("room")
        .lean()
        .exec();

      if (orderData.type === "deposit" && jobData.room.status !== "available") {
        return HttpResponse.returnBadRequestResponse(res, "room.not.available");
      }

      data.amount = orderData.amount;

      // Get ip
      data["ipAddr"] =
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.socket.remoteAddress;

      // Init vnpay service
      const vnpayService = new VnpayService();

      return HttpResponse.returnSuccessResponse(
        res,
        await vnpayService.getRedirectUrl(data)
      );
    } catch (e) {
      // Pass error to the next middleware
      next(e);
    }
  }

  /**
   * @swagger
   * /v1/payment/vnpay/callBack:
   *   get:
   *     description: Create vnpay payment url
   *     tags: [VNPAY]
   *     produces:
   *       - application/json
   *       - multipart/form-data
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

  static async callBack(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const {
        room: roomModel,
        floor: floorModel,
        motelRoom: motelRoomModel,
        job: jobModel,
        user: userModel,
        order: orderModel,
      } = global.mongoModel;

      // Init vnpay service
      const vnpayService = new VnpayService();

      const isValidData = await vnpayService.checkSumData(req.query);

      if (!isValidData) {
        res.status(200).json({ RspCode: "97", Message: "Invalid Checksum" });
      }

      const orderId = req.query["vnp_TxnRef"];
      const rspCode = req.query["vnp_ResponseCode"];
      const vnpAmount = parseInt(req.query["vnp_Amount"].toString()) / 100;

      let orderData = await orderModel
        .findOne({ _id: orderId })
        .lean()
        .exec();

      if (!orderData) {
        return res
          .status(200)
          .json({ RspCode: "01", Message: "Order not Found" });
      }

      if (orderData.amount != vnpAmount) {
        return res
          .status(200)
          .json({ RspCode: "04", Message: "Invalid Amount" });
      }

      if (orderData.isCompleted) {
        return res
          .status(200)
          .json({ RspCode: "02", Message: "Order already confirmed" });
      }

      if (rspCode === "00") {
        // orderData = await orderModel.findOneAndUpdate(
        //   { _id: orderId },
        //   { isCompleted: true, vnpayStatus: 'Đã thanh toán', paymentMethod: 'VNPAY' },
        //   { new: true }
        // ).exec();
        // if (orderData.type === 'recharge') {
        //   let userData = await userModel.findOne({ _id: orderData.user }).lean().exec();
        //   userData.wallet = userData.wallet ? userData.wallet : 0;
        //   userData.wallet += orderData.amount;
        //   await userModel.findOneAndUpdate({ _id: orderData.user }, { wallet: userData.wallet }).lean().exec();
        // }
      } else {
        return res
          .status(200)
          .json({ RspCode: rspCode.toString(), Message: "Order Failed" });
      }

      return res
        .status(200)
        .json({ RspCode: "00", Message: "Confirm Success" });
    } catch (e) {
      return res.status(200).json({ RspCode: "99", Message: "Unknown error" });
    }
  }

  /**
   * @swagger
   * /v1/payment/vnpay/ipn:
   *   get:
   *     description: Vnpay payment ipn url
   *     tags: [VNPAY]
   *     produces:
   *       - application/json
   *       - multipart/form-data
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

  static async ipn(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const {
        room: roomModel,
        floor: floorModel,
        motelRoom: motelRoomModel,
        job: jobModel,
        user: userModel,
        order: orderModel,
      } = global.mongoModel;

      // Init vnpay service
      const vnpayService = new VnpayService();

      const isValidData = await vnpayService.checkSumData(req.query);

      if (!isValidData) {
        res.status(200).json({ RspCode: "97", Message: "Invalid Checksum" });
      }

      const orderId = req.query["vnp_TxnRef"];
      const rspCode = req.query["vnp_ResponseCode"];
      const vnpAmount = parseInt(req.query["vnp_Amount"].toString()) / 100;

      let orderData = await orderModel
        .findOne({ _id: orderId })
        .lean()
        .exec();

      if (!orderData) {
        return res
          .status(200)
          .json({ RspCode: "01", Message: "Order not Found" });
      }

      if (orderData.amount != vnpAmount) {
        return res
          .status(200)
          .json({ RspCode: "04", Message: "Invalid Amount" });
      }

      if (orderData.isCompleted) {
        return res
          .status(200)
          .json({ RspCode: "02", Message: "Order already confirmed" });
      }

      if (rspCode === "00") {
        orderData = await orderModel
          .findOneAndUpdate(
            { _id: orderId },
            {
              isCompleted: true,
              vnpayStatus: "Đã thanh toán",
              paymentMethod: "VNPAY",
            },
            { new: true }
          )
          .exec();

        if (orderData.type === "monthly") {
          await jobModel
            .findOneAndUpdate(
              { _id: orderData.job },
              {
                isCompleted: true,
                roomPassword: helpers.generateVerifyCode(),
                status: "monthlyPaymentCompleted",
              }
            )
            .exec();
        }

        if (orderData.type === "deposit") {
          const jobData = await jobModel
            .findOne({ _id: orderData.job })
            .populate("room")
            .lean()
            .exec();
          if (jobData.room.status === "available") {
            await roomModel
              .findOneAndUpdate(
                { _id: jobData.room._id },
                { status: "deposited", rentedBy: jobData.user },
                { new: true }
              )
              .exec();
            let floorData = await floorModel
              .findOne({ rooms: jobData.room._id })
              .populate("rooms")
              .lean()
              .exec();
            const roomGroup = lodash.groupBy(floorData.rooms, (room) => {
              return room.status;
            });

            await floorModel
              .findOneAndUpdate(
                { _id: floorData._id },
                {
                  availableRoom: roomGroup["available"]
                    ? roomGroup["available"].length
                    : 0,
                  rentedRoom: roomGroup["rented"]
                    ? roomGroup["rented"].length
                    : 0,
                  depositedRoom: roomGroup["deposited"]
                    ? roomGroup["deposited"].length
                    : 0,
                }
              )
              .exec();

            let motelRoomData = await motelRoomModel
              .findOne({ floors: floorData._id })
              .populate("floors")
              .lean()
              .exec();

            let updateData = {
              availableRoom: lodash.sumBy(
                motelRoomData.floors,
                "availableRoom"
              ),
              rentedRoom: lodash.sumBy(motelRoomData.floors, "rentedRoom"),
              depositedRoom: lodash.sumBy(
                motelRoomData.floors,
                "depositedRoom"
              ),
            };

            await motelRoomModel
              .findOneAndUpdate({ _id: motelRoomData._id }, updateData)
              .exec();

            await jobModel
              .findOneAndUpdate(
                { _id: orderData.job },
                {
                  isCompleted: true,
                  roomPassword: helpers.generateVerifyCode(),
                  status: "pendingActivated",
                },
                { new: true }
              )
              .exec();
          }
        }

        if (orderData.type === "recharge") {
          let userData = await userModel
            .findOne({ _id: orderData.user })
            .lean()
            .exec();

          userData.wallet = userData.wallet ? userData.wallet : 0;

          userData.wallet += orderData.amount;

          await userModel
            .findOneAndUpdate(
              { _id: orderData.user },
              { wallet: userData.wallet }
            )
            .lean()
            .exec();
        }
      } else {
        await orderModel
          .findOneAndUpdate(
            { _id: orderId },
            { isCompleted: true, vnpayStatus: "Thanh toán lỗi" },
            { new: true }
          )
          .exec();
      }

      return res
        .status(200)
        .json({ RspCode: "00", Message: "Confirm Success" });
    } catch (e) {
      return res.status(200).json({ RspCode: "99", Message: "Unknown error" });
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                            START HELPER FUNCTION                           */
  /* -------------------------------------------------------------------------- */

  /* -------------------------------------------------------------------------- */
  /*                             END HELPER FUNCTION                            */
}
