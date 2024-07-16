import { Request, Response, NextFunction } from "express";
import HttpResponse from "../../services/response";

import * as lodash from "lodash";
import * as moment from "moment";

import { helpers } from "../../utils";

import JobController from "./job.controller";
import NotificationController from "./notification";

// Services
import ImageService from "../../services/image";

export default class PaymentController {
  /**
   * @swagger
   * tags:
   *   - name: Payment
   *     description: Payment APIs
   */

  /**
   * @swagger
   * /v1/payment/order/pay:
   *   put:
   *     description: Pay for monthly order
   *     tags: [Payment]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: orderId
   *         in: formData
   *         type: string
   *         description: orderId
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
   *       - auth: []
   */

  static async payOrder(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init models
      const {
        order: orderModel,
        user: userModel,
        job: jobModel,
        room: roomModel,
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
      console.log("data", data);

      const orderData = await orderModel
        .findOne({ _id: data.orderId })
        .lean()
        .exec();

      if (!orderData) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Không tìm thấy hóa đơn!"
        );
      }

      if (orderData.isCompleted) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Hóa đơn đã được thanh toán!"
        );
      }
      /// Payment Cash
      if (data.type === "cash") {
        return HttpResponse.returnSuccessResponse(res, orderData);
      }

      if (req["userProfile"].wallet < orderData.amount) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Tài khoản của bạn không đủ, vui lòng nạp thêm!"
        );
      }

      await userModel
        .findOneAndUpdate(
          { _id: req["userId"] },
          { $inc: { wallet: -orderData.amount } }
        )
        .exec();

      if (orderData.type === "monthly") {
        const JobData = await jobModel
          .findOne({ _id: orderData.job })
          .populate("room")
          .lean()
          .exec();
        const RoomData = await roomModel
          .findOne({ _id: JobData.room._id })
          .lean()
          .exec();
        await jobModel
          .findOneAndUpdate(
            { _id: orderData.job },
            {
              isCompleted: true,
              roomPassword: RoomData.roomPassword,
              // roomPassword: helpers.generateVerifyCode(),
              status: "monthlyPaymentCompleted",
            }
          )
          .exec();
      }
      // dặt cọc
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
            availableRoom: lodash.sumBy(motelRoomData.floors, "availableRoom"),
            rentedRoom: lodash.sumBy(motelRoomData.floors, "rentedRoom"),
            depositedRoom: lodash.sumBy(motelRoomData.floors, "depositedRoom"),
          };

          await motelRoomModel
            .findOneAndUpdate({ _id: motelRoomData._id }, updateData)
            .exec();

          const jobRes = await jobModel
            .findOneAndUpdate(
              { _id: orderData.job },
              {
                isCompleted: true,
                status: "pendingActivated",
              },
              { new: true }
            )
            .exec();
        }
      }

      if (orderData.type === "afterCheckInCost") {
        const JobData = await jobModel
          .findOne({ _id: orderData.job })
          .populate("room")
          .lean()
          .exec();
        const RoomData = await roomModel
          .findOne({ _id: JobData.room._id })
          .lean()
          .exec();
        await jobModel
          .findOneAndUpdate(
            { _id: orderData.job },
            {
              roomPassword: RoomData.roomPassword,
              // roomPassword: helpers.generateVerifyCode(),
              status: "pendingMonthlyPayment",
            }
          )
          .exec();

        const jobData = await JobController.getJob(orderData.job);

        await NotificationController.createNotification({
          title: "Thông báo đóng tiền phòng",
          content: "Vui lòng thanh toán tiền phòng trong vòng 5 ngày.",
          user: jobData.user,
          isRead: false,
        });

        console.log("jobData", jobData.checkInTime);
        const dayGet = new Date(jobData.checkInTime);
        dayGet.setHours(7, 0, 0, 0);

        // SỬA: chỗ này cần tạo 1 job để tạo bill tháng đó vào cuối tháng, để có thể bao gồm tiền phòng
        // await global.agendaInstance.agenda.schedule(
        //   moment()
        //     .startOf("month")
        //     .add("1", "months")
        //     .toDate(),
        //   "CreateFirstMonthOrder",
        //   { jobId: jobData._id }
        // );

        await global.agendaInstance.agenda.schedule(
          moment()
            .add("2", "minutes")
            .toDate(),
          "CreateFirstMonthOrder",
          { jobId: jobData._id }
        );

        // const newOrderData = await orderModel.create({
        //   user: jobData.user,
        //   job: jobData._id,
        //   isCompleted: false,
        //   // description: `Tiền phòng tháng ${moment().month() + 1}/${moment().year()} `,
        //   description: `Tiền phòng tháng ${dayGet.getMonth() + 1}/${dayGet.getFullYear()} `,
        //   amount: Math.floor(
        //     (jobData.room.price / moment(jobData.checkInTime).daysInMonth()) *
        //       moment(jobData.checkInTime)
        //         .endOf("month")
        //         .diff(moment(jobData.checkInTime), "days")
        //   ),
        //   type: "monthly",
        // });

        // await jobModel
        //   .findOneAndUpdate(
        //     { _id: jobData._id },
        //     {
        //       $addToSet: { orders: newOrderData._id },
        //       currentOrder: newOrderData._id,
        //       status: "pendingMonthlyPayment",
        //     }
        //   )
        //   .exec();
      }

      return HttpResponse.returnSuccessResponse(
        res,
        await orderModel
          .findOneAndUpdate(
            { _id: data.orderId },
            {
              isCompleted: true,
              paymentMethod: "internal",
            },
            { new: true }
          )
          .lean()
          .exec()
      );
    } catch (e) {
      // Pass error to the next middleware
      next(e);
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                            START HELPER FUNCTION                           */
  /* -------------------------------------------------------------------------- */

  /* -------------------------------------------------------------------------- */
  /*                             END HELPER FUNCTION                            */
  /* -------------------------------------------------------------------------- */
}
