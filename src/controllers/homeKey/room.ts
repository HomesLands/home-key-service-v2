import { NextFunction, Request, Response } from "express";
import * as lodash from "lodash";
import * as moment from "moment";

import { helpers } from "../../utils";

import ImageService from "../../services/image";
import HttpResponse from "../../services/response";
import NotificationController from "./notification";
import FloorController from "./floor.controller";

export default class RoomController {
  /**
   * @swagger
   * tags:
   *   - name: Room
   *     description: Room Control
   */

  /**
   * @swagger
   * /v1/homeKey/room:
   *   post:
   *     description: Create room
   *     tags: [Room]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: floorId
   *         in: formData
   *         required: true
   *         type: string
   *         description: floor id
   *       - name: name
   *         in: formData
   *         type: string
   *         description: room name
   *       - name: acreage
   *         in: formData
   *         type: string
   *         description: room acreage
   *       - name: availableDate
   *         in: formData
   *         type: string
   *         description: availableDate
   *       - name: unavailableDate
   *         in: formData
   *         type: string
   *         description: unavailableDate
   *       - name: status
   *         in: formData
   *         type: string
   *         enum:
   *          - available
   *          - rented
   *          - deposited
   *         description: status
   *       - name: price
   *         in: formData
   *         type: string
   *         description: price
   *       - name: electricityPrice
   *         in: formData
   *         type: string
   *         description: electricityPrice
   *       - name: waterPrice
   *         in: formData
   *         type: string
   *         description: waterPrice
   *       - name: utilities
   *         in: formData
   *         type: string
   *         description: uti1,uti2,uti3....
   *       - name: description
   *         in: formData
   *         type: string
   *         description: description
   *       - name: file
   *         in: formData
   *         type: file
   *         description: room images
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

  static async createRoom(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init models
      const {
        floor: floorModel,
        room: roomModel,
        motelRoom: motelRoomModel,
        image: imageModel,
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

      const floorData = await floorModel
        .findOne({ _id: data.idFloors })
        .lean()
        .exec();

      if (!floorData) {
        return HttpResponse.returnBadRequestResponse(res, "floor.not.exist");
      }

      let initRoomData = {
        name: data.name,
        idElectricMetter: data.idElectricMetter,
        status: data.status,
        price: parseInt(data.price),
        electricityPrice: parseInt(data.electricityPrice),
        waterPrice: parseInt(data.waterPrice),
        acreage: parseInt(data.acreage),
        minimumMonths: parseInt(data.minimumMonths),
        key: `${floorData.key}-R${floorData.rooms.length + 1}`,
        isCompleted: true,
        utilities: data.utilities,
        roomPassword: data.roomPassword,
        depositPrice: data.depositPrice,
        wifiPrice: req.body.wifiPrice,
        garbagePrice: req.body.garbagePrice,
      };
      if (data.availableDate) {
        initRoomData["availableDate"] = new Date(data.availableDate);
      }

      if (data.unavailableDate) {
        initRoomData["unavailableDate"] = new Date(data.unavailableDate);
      }

      let roomData = await roomModel.create(initRoomData);

      const dataRes = await floorModel.findOneAndUpdate(
        { _id: data.idFloors },
        {
          $addToSet: {
            rooms: roomData._id,
          },
        }
      );
      if (dataRes) {
        if (data.status === "available") {
          await floorModel.findOneAndUpdate(
            { _id: floorData._id },
            {
              totalRoom: dataRes.rooms.length + 1,
              availableRoom: dataRes.availableRoom + 1,
            }
          );
        } else if (data.status === "rented") {
          await floorModel.findOneAndUpdate(
            { _id: floorData._id },
            {
              totalRoom: dataRes.rooms.length + 1,
              rentedRoom: dataRes.rentedRoom + 1,
            }
          );
        } else if (data.status === "deposited") {
          await floorModel.findOneAndUpdate(
            { _id: floorData._id },
            {
              totalRoom: dataRes.rooms.length + 1,
              depositedRoom: dataRes.depositedRoom + 1,
            }
          );
        } else {
          await floorModel.findOneAndUpdate(
            { _id: floorData._id },
            {
              totalRoom: dataRes.rooms.length + 1,
            }
          );
        }
      }

      const motelroomData = await motelRoomModel
        .findOne({ floors: dataRes._id })
        .populate("floors")
        .lean()
        .exec();
      let totalRoom = 0;
      for (let i = 0; i < motelroomData.floors.length; i++) {
        totalRoom += motelroomData.floors[i].rooms.length;
      }

      await motelRoomModel.findOneAndUpdate(
        { _id: motelroomData._id },
        { totalRoom: totalRoom }
      );
      // return HttpResponse.returnSuccessResponse(res, await RoomController.getRoomById(roomData._id));
      return HttpResponse.returnSuccessResponse(
        res,
        await motelRoomModel.find({ floors: dataRes._id })
      );
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /v1/homeKey/room/{id}:
   *   get:
   *     description: Return room by id
   *     tags: [Room]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         type: string
   *         description: room id
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

  static async getRoomDetail(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const {
        floor: floorModel,
        motelRoom: motelRoomModel,
      } = global.mongoModel;
      let resData = await RoomController.getRoomById(req.params.id);

      if (resData && resData.error) {
        return HttpResponse.returnBadRequestResponse(
          res,
          resData.errors[0].errorMessage
        );
      } else {
        let floorData = await floorModel
          .findOne({ rooms: resData._id })
          .lean()
          .exec();
        if (floorData) {
          let motelRoomData = await motelRoomModel
            .findOne({ floors: floorData._id })
            .lean()
            .exec();
          if (motelRoomData) {
            resData.motelRoomDataDetail = motelRoomData;
          }
        }
      }

      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /v1/homeKey/room/{id}:
   *   put:
   *     description: Edit room by id
   *     tags: [Room]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         type: string
   *         description: room id
   *       - name: name
   *         in: formData
   *         type: string
   *         description: room name
   *       - name: acreage
   *         in: formData
   *         type: string
   *         description: room acreage
   *       - name: availableDate
   *         in: formData
   *         type: string
   *         description: availableDate
   *       - name: unavailableDate
   *         in: formData
   *         type: string
   *         description: unavailableDate
   *       - name: status
   *         in: formData
   *         type: string
   *         enum:
   *          - available
   *          - rented
   *          - deposited
   *         description: status
   *       - name: price
   *         in: formData
   *         type: string
   *         description: price
   *       - name: depositPrice
   *         in: formData
   *         type: string
   *         description: depositPrice
   *       - name: minimumMonths
   *         in: formData
   *         type: string
   *         description: minimumMonths
   *       - name: electricityPrice
   *         in: formData
   *         type: string
   *         description: electricityPrice
   *       - name: waterPrice
   *         in: formData
   *         type: string
   *         description: waterPrice
   *       - name: utilities
   *         in: formData
   *         type: string
   *         description: uti1,uti2,uti3....
   *       - name: description
   *         in: formData
   *         type: string
   *         description: description
   *       - name: roomPassword
   *         in: formData
   *         type: string
   *         description: roomPassword
   *       - name: previousElectricityNumber
   *         in: formData
   *         type: number
   *         description: previousElectricityNumber
   *       - name: currentElectricityNumber
   *         in: formData
   *         type: number
   *         description: currentElectricityNumber
   *       - name: previousWaterNumber
   *         in: formData
   *         type: number
   *         description: previousWaterNumber
   *       - name: currentWaterNumber
   *         in: formData
   *         type: number
   *         description: currentWaterNumber
   *       - name: arrImageId
   *         in: formData
   *         type: string
   *         description: id1,id2,... to delete
   *       - name: file
   *         in: formData
   *         type: file
   *         description: room images
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
  static async editRoomByIdStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    //Xóa job
    //xóa order liên quan
    //xóa rentedBy ở từng phòng
    let resData = await RoomController.getRoomById(req.params.id);
    const roomId = req.params.id;
    let status = req.body.data;
    const {
      room: roomModel,
      floor: floorModel,
      job: jobModel,
      order: orderModel,
      motelRoom: motelRoomModel,
    } = global.mongoModel;

    const dataFloor = await floorModel
      .findOne({ rooms: resData })
      .lean()
      .exec();
    console.log("resData.status", resData.status);
    console.log("status.status", status);

    if (status === "deposited") {
      //cọc --> trống
      //deposited --> available
      if (resData.status === "available") {
        await floorModel
          .findOneAndUpdate(
            { _id: dataFloor._id },
            {
              availableRoom: dataFloor.availableRoom - 1,
              depositedRoom: dataFloor.depositedRoom + 1,
            },
            { new: true }
          )
          .exec();
        let motelRoomData = await motelRoomModel
          .findOne({ floors: dataFloor._id })
          .populate("floors")
          .lean()
          .exec();

        await motelRoomModel
          .findOneAndUpdate(
            { _id: motelRoomData._id },
            {
              $inc: {
                availableRoom: -1,
                depositedRoom: 1,
              },
            }
          )
          .exec();

        await jobModel
          .findOneAndUpdate(
            { room: roomId },
            {
              isCompleted: true,
              status: "pendingActivated",
            },
            { new: true }
          )
          .exec();

        const JobData = await jobModel
          .findOne({ room: roomId })
          .populate("room currentOrder")
          .lean()
          .exec();
        if (JobData) {
          await orderModel
            .findOneAndUpdate(
              { _id: JobData.currentOrder._id },
              {
                isCompleted: true,
                paymentMethod: "cash",
              },
              { new: true }
            )
            .lean()
            .exec();
        }
        //cọc --> cọc
        //deposited --> deposited
      } else if (resData.status === "deposited") {
        await floorModel
          .findOneAndUpdate(
            { _id: dataFloor._id },
            {
              depositedRoom: dataFloor.depositedRoom,
            },
            { new: true }
          )
          .exec();
        // cập nhật
        await jobModel
          .findOneAndUpdate(
            { room: roomId },
            {
              isCompleted: false,
              status: "pendingDepositPayment",
            },
            { new: true }
          )
          .exec();
      } else if (resData.status === "rented") {
        await floorModel
          .findOneAndUpdate(
            { _id: dataFloor._id },
            {
              rentedRoom: dataFloor.rentedRoom - 1,
              depositedRoom: dataFloor.depositedRoom + 1,
            },
            { new: true }
          )
          .exec();
      } else {
        await floorModel
          .findOneAndUpdate(
            { _id: dataFloor._id },
            {
              depositedRoom: dataFloor.depositedRoom + 1,
            },
            { new: true }
          )
          .exec();
      }
    } else if (status === "rented") {
      if (resData.status === "available") {
        await floorModel
          .findOneAndUpdate(
            { _id: dataFloor._id },
            {
              availableRoom: dataFloor.availableRoom - 1,
              rentedRoom: dataFloor.rentedRoom + 1,
            },
            { new: true }
          )
          .exec();
        let motelRoomData = await motelRoomModel
          .findOne({ floors: dataFloor._id })
          .populate("floors")
          .lean()
          .exec();
        if (motelRoomData) {
          console.log(123123);
          await motelRoomModel
            .findOneAndUpdate(
              { _id: motelRoomData._id },
              {
                $inc: {
                  availableRoom: -1,
                  rentedRoom: 1,
                },
              }
            )
            .exec();
        }

        // update đã thuê trạng thái phòng đang còn trống.
        const JobData = await jobModel
          .findOne({ room: roomId })
          .populate("room")
          .lean()
          .exec();
        if (JobData && JobData.room) {
          const RoomData = await roomModel
            .findOne({ _id: JobData.room._id })
            .lean()
            .exec();
          await jobModel
            .findOneAndUpdate(
              { room: roomId },
              {
                isCompleted: true,
                isActived: true,
                roomPassword: RoomData.roomPassword,
                // roomPassword: helpers.generateVerifyCode(),
                status: "monthlyPaymentCompleted",
              }
            )
            .exec();
        }
      } else if (resData.status === "deposited") {
        await floorModel
          .findOneAndUpdate(
            { _id: dataFloor._id },
            {
              depositedRoom: dataFloor.depositedRoom - 1,
              rentedRoom: dataFloor.rentedRoom + 1,
            },
            { new: true }
          )
          .exec();
        // đã thanh toán tiền phòng đợt tiền thuê của 1 tháng.
      } else if (resData.status === "rented") {
        await floorModel
          .findOneAndUpdate(
            { _id: dataFloor._id },
            {
              rentedRoom: dataFloor.rentedRoom,
            },
            { new: true }
          )
          .exec();
      } else {
        await floorModel
          .findOneAndUpdate(
            { _id: dataFloor._id },
            {
              rentedRoom: dataFloor.rentedRoom + 1,
            },
            { new: true }
          )
          .exec();
      }
    } else if (status === "available") {
      if (resData.status === "available") {
        await floorModel
          .findOneAndUpdate(
            { _id: dataFloor._id },
            {
              availableRoom: dataFloor.availableRoom,
            },
            { new: true }
          )
          .exec();
      } else if (resData.status === "deposited") {
        await floorModel
          .findOneAndUpdate(
            { _id: dataFloor._id },
            {
              depositedRoom: dataFloor.depositedRoom - 1,
              availableRoom: dataFloor.availableRoom + 1,
            },
            { new: true }
          )
          .exec();
      } else if (resData.status === "rented") {
        await floorModel
          .findOneAndUpdate(
            { _id: dataFloor._id },
            {
              rentedRoom: dataFloor.rentedRoom - 1,
              availableRoom: dataFloor.availableRoom + 1,
            },
            { new: true }
          )
          .exec();
      } else {
        await floorModel
          .findOneAndUpdate(
            { _id: dataFloor._id },
            {
              availableRoom: dataFloor.availableRoom + 1,
            },
            { new: true }
          )
          .exec();
      }
    } else if (status === "monthlyPayment") {
      await floorModel
        .findOneAndUpdate(
          { _id: dataFloor._id },
          {
            rentedRoom: dataFloor.rentedRoom + 1,
          },
          { new: true }
        )
        .exec();
      const JobData = await jobModel
        .findOne({ room: roomId })
        .populate("room")
        .lean()
        .exec();
      if (JobData) {
        await orderModel
          .findOneAndUpdate(
            { _id: JobData.currentOrder._id },
            {
              isCompleted: true,
              paymentMethod: "cash",
            },
            { new: true }
          )
          .lean()
          .exec();
        const RoomData = await roomModel
          .findOne({ _id: JobData.room._id })
          .lean()
          .exec();
        if (RoomData) {
          await jobModel
            .findOneAndUpdate(
              { room: roomId },
              {
                isCompleted: true,
                roomPassword: RoomData.roomPassword,
                status: "monthlyPaymentCompleted",
              }
            )
            .exec();
        }
      }
    } else if (status === "roomedPayment") {
      status = "rented";
      if (resData.status === "rented") {
        await floorModel
          .findOneAndUpdate(
            { _id: dataFloor._id },
            {
              rentedRoom: dataFloor.rentedRoom,
            },
            { new: true }
          )
          .exec();
        // đã đặt cọc giờ muốn thánh toán tiền mặt tiền nhận phòng.
        const JobData = await jobModel
          .findOne({ room: roomId })
          .populate("room currentOrder")
          .lean()
          .exec();
        if (JobData) {
          const RoomData = await roomModel
            .findOne({ _id: JobData.room._id })
            .lean()
            .exec();
          if (RoomData) {
            await jobModel
              .findOneAndUpdate(
                { room: roomId },
                {
                  roomPassword: RoomData.roomPassword,
                  status: "pendingMonthlyPayment",
                }
              )
              .exec();
          }
          /// update thanh toán order cũ
          await orderModel
            .findOneAndUpdate(
              { _id: JobData.currentOrder._id },
              {
                isCompleted: true,
                paymentMethod: "cash",
              },
              { new: true }
            )
            .lean()
            .exec();
          await NotificationController.createNotification({
            title: "Thông báo đóng tiền phòng",
            content: "Vui lòng thanh toán tiền phòng trong vòng 5 ngày.",
            user: JobData.user,
            isRead: false,
          });
          const newOrderData = await orderModel.create({
            user: JobData.user,
            job: JobData._id,
            isCompleted: false,
            description: `Tiền phòng tháng ${moment().month() +
              1}/${moment().year()}`,
            amount: Math.floor(
              (JobData.room.price / moment(JobData.checkInTime).daysInMonth()) *
                moment(JobData.checkInTime)
                  .endOf("month")
                  .diff(moment(JobData.checkInTime), "days")
            ),
            type: "monthly",
          });
          if (newOrderData) {
            await jobModel
              .findOneAndUpdate(
                { _id: JobData._id },
                {
                  $addToSet: { orders: newOrderData._id },
                  currentOrder: newOrderData._id,
                  status: "pendingMonthlyPayment",
                }
              )
              .exec();
          }
          await global.agendaInstance.agenda.schedule(
            moment()
              .endOf("month")
              .toDate(),
            "CheckOrderStatus",
            { orderId: JobData.currentOrder._id }
          );
          await global.agendaInstance.agenda.schedule(
            moment()
              .startOf("month")
              .add(1, "months")
              .toDate(),
            "CreateOrder",
            { jobId: JobData._id }
          );
        }
      }
    } else {
      if (resData.status === "available") {
        await floorModel
          .findOneAndUpdate(
            { _id: dataFloor._id },
            {
              availableRoom: dataFloor.availableRoom - 1,
            },
            { new: true }
          )
          .exec();
      } else if (resData.status === "deposited") {
        await floorModel
          .findOneAndUpdate(
            { _id: dataFloor._id },
            {
              depositedRoom: dataFloor.depositedRoom - 1,
            },
            { new: true }
          )
          .exec();
      } else if (resData.status === "rented") {
        await floorModel
          .findOneAndUpdate(
            { _id: dataFloor._id },
            {
              rentedRoom: dataFloor.rentedRoom - 1,
            },
            { new: true }
          )
          .exec();
      } else {
        // Không Cập Nhập Tầng
      }
    }

    resData["status"] = status;
    resData["isCompleted"] = true;
    if (status === "rented") {
      resData["updatedAt"] = resData["createdAt"];
    }
    if (resData.status == "monthlyPayment") {
      resData.status = "rented";
    }

    // Update room data
    return HttpResponse.returnSuccessResponse(
      res,
      await roomModel
        .findOneAndUpdate(
          { _id: roomId },
          {
            status: resData.status,
            isCompleted: resData.isCompleted,
            updatedAt: resData.updatedAt,
          }
        )
        .lean()
        .exec()
    );
  }

  static async editRoomById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init models
      const {
        room: roomModel,
        floor: floorModel,
        motelRoom: motelRoomModel,
      } = global.mongoModel;

      let { id: roomId } = req.params;

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

      // Upload image
      if (req["files"]) {
        data.images = [];
        const uploadResults = await imageService.uploads(req["files"]);
        if (uploadResults.error) {
          return HttpResponse.returnInternalServerResponseWithMessage(
            res,
            uploadResults.message
          );
        }

        for (let i = 0; i < uploadResults.length; i++) {
          data.images.push(uploadResults[i].imageId);
        }
      }

      const roomData = await roomModel
        .findOne({ _id: roomId })
        .lean()
        .exec();

      if (!roomData) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Phòng không tồn tại"
        );
      }

      if (data.name) {
        const floorData = await floorModel
          .findOne({ rooms: roomData._id })
          .populate("rooms")
          .lean()
          .exec();

        for (let i = 0; i < floorData.rooms.length; i++) {
          if (
            floorData.rooms[i].name === data.name &&
            floorData.rooms[i]._id.toString() !== roomData._id.toString()
          ) {
            return HttpResponse.returnBadRequestResponse(
              res,
              "Tên phòng không hợp lệ"
            );
          }
        }
      }

      if (data.roomPassword && isNaN(data.roomPassword)) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Mật khẩu phòng không tồn tại"
        );
      }

      let initRoomData = lodash.omitBy(
        {
          name: data.name,
          status: data.status,
          price:
            data.price && !isNaN(data.price) ? parseInt(data.price) : undefined,
          depositPrice:
            data.depositPrice && !isNaN(data.depositPrice)
              ? parseInt(data.depositPrice)
              : undefined,
          minimumMonths:
            data.minimumMonths && !isNaN(data.minimumMonths)
              ? parseInt(data.minimumMonths)
              : undefined,
          electricityPrice:
            data.electricityPrice && !isNaN(data.electricityPrice)
              ? parseInt(data.electricityPrice)
              : undefined,
          waterPrice:
            data.waterPrice && !isNaN(data.waterPrice)
              ? parseInt(data.waterPrice)
              : undefined,
          acreage:
            data.acreage && !isNaN(data.acreage)
              ? parseInt(data.acreage)
              : undefined,
          images: data.images,
          roomPassword: data.roomPassword,
          isCompleted: true,
          previousElectricityNumber:
            data.previousElectricityNumber &&
            !isNaN(data.previousElectricityNumber)
              ? parseInt(data.previousElectricityNumber)
              : undefined,
          currentElectricityNumber:
            data.currentElectricityNumber &&
            !isNaN(data.currentElectricityNumber)
              ? parseInt(data.currentElectricityNumber)
              : undefined,
          previousWaterNumber:
            data.previousWaterNumber && !isNaN(data.previousWaterNumber)
              ? parseInt(data.previousWaterNumber)
              : undefined,
          currentWaterNumber:
            data.currentWaterNumber && !isNaN(data.currentWaterNumber)
              ? parseInt(data.currentWaterNumber)
              : undefined,
        },
        lodash.isUndefined
      );

      if (data.utilities) {
        initRoomData["utilities"] = data.utilities.split(",");
      }

      if (data.availableDate) {
        initRoomData["availableDate"] = new Date(data.availableDate);
      }

      if (data.unavailableDate) {
        initRoomData["unavailableDate"] = new Date(data.unavailableDate);
      }

      // Update room data
      await roomModel
        .findOneAndUpdate({ _id: roomId }, initRoomData)
        .lean()
        .exec();

      let floorUpdateData = {};
      if (data.status === "available") {
        floorUpdateData["$inc"] = { availableRoom: 1 };
      } else if (data.status === "deposited") {
        floorUpdateData["$inc"] = { depositedRoom: 1 };
      } else {
        floorUpdateData["$inc"] = { rentedRoom: 1 };
      }

      if (roomData.status === "available") {
        floorUpdateData["$inc"] = { availableRoom: -1 };
      } else if (roomData.status === "deposited") {
        floorUpdateData["$inc"] = { depositedRoom: -1 };
      } else {
        floorUpdateData["$inc"] = { rentedRoom: -1 };
      }

      if (roomData.status === data.status) {
        floorUpdateData = {};
      }

      let floorData = await floorModel
        .findOne({ rooms: roomId })
        .populate("rooms")
        .lean()
        .exec();

      const isFloorCompleted = !lodash.some(floorData.rooms, {
        isCompleted: false,
      });

      const floorDataGroupByStatus = lodash.groupBy(floorData.rooms, (room) => {
        return room.status;
      });

      floorData = await floorModel
        .findOneAndUpdate(
          { _id: floorData._id },
          { ...floorUpdateData, isCompleted: isFloorCompleted },
          { new: true }
        )
        .exec();

      await floorModel
        .findOneAndUpdate(
          { _id: floorData._id },
          {
            availableRoom: floorDataGroupByStatus.available
              ? floorDataGroupByStatus.available.length
              : 0,
            depositedRoom: floorDataGroupByStatus.deposited
              ? floorDataGroupByStatus.deposited.length
              : 0,
            rentedRoom: floorDataGroupByStatus.rented
              ? floorDataGroupByStatus.rented.length
              : 0,
          },
          { new: true }
        )
        .exec();

      if (floorData.availableRoom > floorData.totalRoom) {
        await floorModel
          .findOneAndUpdate(
            { _id: floorData._id },
            {
              availableRoom: floorData.totalRoom,
              depositedRoom: 0,
              rentedRoom: 0,
            }
          )
          .exec();
      }

      if (floorData.depositedRoom > floorData.totalRoom) {
        await floorModel
          .findOneAndUpdate(
            { _id: floorData._id },
            {
              availableRoom: 0,
              depositedRoom: floorData.totalRoom,
              rentedRoom: 0,
            }
          )
          .exec();
      }

      if (floorData.rentedRoom > floorData.totalRoom) {
        await floorModel
          .findOneAndUpdate(
            { _id: floorData._id },
            {
              availableRoom: 0,
              depositedRoom: 0,
              rentedRoom: floorData.totalRoom,
            }
          )
          .exec();
      }

      const motelRoomData = await motelRoomModel
        .findOne({ floors: floorData._id })
        .populate("floors")
        .lean()
        .exec();

      const isMotelRoomCompleted = !lodash.some(motelRoomData.floors, {
        isCompleted: false,
      });

      if (isMotelRoomCompleted) {
        let motelRoomUpdateData = {
          availableRoom: 0,
          depositedRoom: 0,
          rentedRoom: 0,
          isCompleted: true,
        };

        for (let i = 0; i < motelRoomData.floors.length; i++) {
          motelRoomUpdateData.availableRoom +=
            motelRoomData.floors[i].availableRoom;
          motelRoomUpdateData.depositedRoom +=
            motelRoomData.floors[i].depositedRoom;
          motelRoomUpdateData.rentedRoom += motelRoomData.floors[i].rentedRoom;
        }

        await motelRoomModel
          .findOneAndUpdate({ _id: motelRoomData }, motelRoomUpdateData)
          .exec();
      }

      return HttpResponse.returnSuccessResponse(
        res,
        await RoomController.getRoomById(roomId)
      );
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /v1/homeKey/room/{id}:
   *   delete:
   *     description: Return room by id
   *     tags: [Room]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         type: string
   *         description: room id
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

  static async deleteRoom(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      //Init model
      const {
        room: roomModel,
        floor: floorModel,
        job: jobModel,
        motelRoom: motelRoomModel,
        image: imageModel,
      } = global.mongoModel;

      let { id: roomId } = req.params;

      const roomData = await roomModel
        .findOne({ _id: roomId })
        .lean()
        .exec();

      if (!roomData) {
        return HttpResponse.returnBadRequestResponse(res, "room.not.exist");
      }

      const jobData = await jobModel
        .find({ room: roomId })
        .lean()
        .exec();

      if (jobData && jobData.length > 0) {
        return HttpResponse.returnBadRequestResponse(res, "room.is.rented");
      }

      const floorData = await floorModel
        .findOne({ rooms: roomId })
        .lean()
        .exec();

      let updateData = {
        totalRoom: floorData.totalRoom - 1,
      };
      if (
        floorData.availableRoom < 0 ||
        floorData.rentedRoom < 0 ||
        floorData.depositedRoom < 0
      ) {
        updateData[`${roomData.status}Room`] = 0;
      } else {
        updateData[`${roomData.status}Room`] =
          floorData[`${roomData.status}Room`] - 1;
      }

      updateData["$pull"] = { rooms: roomId };

      await floorModel
        .findOneAndUpdate({ _id: floorData._id }, updateData)
        .lean()
        .exec();

      for (let i = 0; i < roomData.images.length; i++) {
        await imageModel
          .remove({ _id: roomData.images[i] })
          .lean()
          .exec();
      }
      await roomModel
        .remove({ _id: roomId })
        .lean()
        .exec();

      return HttpResponse.returnSuccessResponse(
        res,
        await motelRoomModel
          .findOne({ floors: floorData })
          .lean()
          .exec()
      );
    } catch (e) {
      next(e);
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                            START HELPER FUNCTION                           */
  /* -------------------------------------------------------------------------- */

  // Get user by id
  static async getRoomById(roomId: any): Promise<any> {
    const {
      room: roomModel,
      floor: floorModel,
      motelRoom: motelRoomModel,
    } = global.mongoModel;

    let resData = await roomModel
      .findOne({ _id: roomId })
      .populate("images")
      .lean()
      .exec();

    if (!resData) {
      return HttpResponse.returnErrorWithMessage("Phòng không tồn tại");
    }

    const floorData = await floorModel
      .findOne({ rooms: roomId })
      .lean()
      .exec();
    resData.idFloors = "";
    resData.idMotel = "";
    if (floorData) {
      resData.idFloors = floorData._id;
      const motelroomData = await motelRoomModel
        .findOne({ floors: floorData._id })
        .lean()
        .exec();
      if (motelroomData) {
        resData.idMotel = motelroomData._id;
      }
    }

    if (resData.images) {
      resData.images = helpers.getImageUrl(resData.images, true);
    }

    resData = helpers.changeTimeZone(resData);

    return resData;
  }

  // Get valid data for create room
  static async getValidDataForRoomByRawData(
    rawData: any,
    lang?: string
  ): Promise<any> {
    const floorData = await FloorController.getFloorById(rawData.floorId);

    if (floorData && floorData.error) {
      return HttpResponse.returnErrorWithMessage(
        floorData.errors[0].errorMessage,
        lang
      );
    }

    const numberFieldsAndInvalidMessages = [
      { fieldName: "price", errorMessage: "motelRoom.room.price.invalid" },
      {
        fieldName: "electricityPrice",
        errorMessage: "motelRoom.room.electricityPrice.invalid",
      },
      {
        fieldName: "waterPrice",
        errorMessage: "motelRoom.room.waterPrice.invalid",
      },
      { fieldName: "acreage", errorMessage: "motelRoom.room.acreage.invalid" },
    ];

    for (let i = 0; i < numberFieldsAndInvalidMessages.length; i++) {}

    let validData = {
      name: rawData.name,
      status: rawData.status,
      price: parseInt(rawData.price),
      electricityPrice: parseInt(rawData.electricityPrice),
      waterPrice: parseInt(rawData.waterPrice),
      acreage: parseInt(rawData.acreage),
      images: rawData.images,
      key: `${floorData.key}-R${floorData.rooms.length + 1}`,
      isCompleted: true,
    };
  }

  // Get List Room
  static async ListRoom(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    const {
      room: roomModel,
      motelRoom: motelRoomModel,
      floor: floorModel,
      job: jobModel,
      user: userModel,
    } = global.mongoModel;

    const userID = req["userProfile"] || "";
    const motelRoomData = await motelRoomModel
      .find({ owner: userID })
      .populate("floors")
      .lean()
      .exec();

    const ArrayIdRoomRented = [];
    const ArrayIdRoom = [];
    const ArrayListJob = [];
    for (let i = 0; i < motelRoomData.length; i++) {
      for (let j = 0; j < motelRoomData[i].floors.length; j++) {
        for (let k = 0; k < motelRoomData[i].floors[j].rooms.length; k++) {
          const roomData = await roomModel
            .find({ _id: motelRoomData[i].floors[j].rooms[k] })
            .lean()
            .exec();
          // ArrayListRoom.push(roomData);
          roomData.map((room) => {
            if (room.status === "rented" || room.status === "deposited") {
              const item = {
                idMotel: motelRoomData[i]._id,
                idRoom: room._id,
              };
              ArrayIdRoomRented.push(item);
            }
            ArrayIdRoom.push(room._id);
          });
        }
      }
    }

    // for (let i = 0; i < ArrayIdRoomRented.length; i++) {
    // 	const DataRoom = await roomModel.findOne({ _id: ArrayIdRoomRented[i] }).lean().exec();
    // 	ArrayListRoom.push(DataRoom);
    // }
    for (let i = 0; i < ArrayIdRoomRented.length; i++) {
      const DataJob = await jobModel
        .findOne({ room: ArrayIdRoomRented[i].idRoom })
        .populate("room orders images")
        .lean()
        .exec();
      if (DataJob) {
        DataJob.idMotel = ArrayIdRoomRented[i].idMotel;
        DataJob.frontIdUser = "";
        DataJob.backIdUser = "";
        DataJob.avataIdUser = "";
        if (DataJob.images && DataJob.images.length > 0) {
          if (DataJob.images[0]) {
            DataJob.frontIdUser = await helpers.getImageUrl(DataJob.images[0]);
          }
          if (DataJob.images[1]) {
            DataJob.backIdUser = await helpers.getImageUrl(DataJob.images[1]);
          }
        }
        if (DataJob.user) {
          const userData = await userModel
            .findOne(
              { _id: DataJob.user, isDeleted: false },
              { password: 0, token: 0 }
            )
            .populate("avatar identityCards backId frontId")
            .lean()
            .exec();
          // User avatar
          if (userData.avatar) {
            userData.avatar = await helpers.getImageUrl(userData.avatar);
          }
          // User backId
          if (userData.backId) {
            userData.backId = await helpers.getImageUrl(userData.backId);
          }

          // User frontId
          if (userData.frontId) {
            userData.frontId = await helpers.getImageUrl(userData.frontId);
          }
          DataJob.user = userData;
          DataJob.ownerAndUser = {
            ownerId: userID._id,
            userId: userData._id,
          };
        }
      }
      ArrayListJob.push(DataJob);
    }

    return HttpResponse.returnSuccessResponse(res, ArrayListJob);
  }
  // // edit utilities to room
  static async updateUtilitiesRoom(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const { room: roomModel, image: imageModel } = global.mongoModel;
      const id = req.body.id;
      const utilities = req.body.utilities;
      const name = req.body.name;
      const idElectricMetter = req.body.idElectricMetter;
      const price = req.body.price;
      const electricityPrice = req.body.electricityPrice;
      const waterPrice = req.body.waterPrice;
      const minimumMonths = req.body.minimumMonths;
      const availableDate = req.body.availableDate;
      const acreage = req.body.acreage;
      const roomPassword = req.body.roomPassword;
      const depositPrice = req.body.depositPrice;
      const linkVideo = req.body.linkVideo;
      const wifiPriceN = req.body.wifiPriceN;

      const wifiPrice = req.body.wifiPrice;
      const garbagePrice = req.body.garbagePrice;

      console.log("req.body", req.body);

      const vihicle: number = req.body.vihicle;
      const person: number = req.body.person;

      const arrayRemoveImg = req.body.arrayRemoveImg;
      console.log({arrayRemoveImg});

      if (arrayRemoveImg.length > 0) {
        const RoomData = await roomModel
          .findOne({ _id: id })
          .lean()
          .exec();

        if (RoomData.images.length > 0) {
          for (let i = 0; i < RoomData.images.length; i++) {
            const dataImgRemove = await imageModel.findOne({
              _id: RoomData.images[i],
            });
            const pathLocal = await helpers.getImageUrl(dataImgRemove);
            for (let j = 0; j < arrayRemoveImg.length; j++) {
              if (pathLocal === arrayRemoveImg[j]) {
                RoomData.images.splice(i, 1);
                i--; //lùi lại để kiểm tra được ảnh phòng tiếp theo liền kề với ảnh đã bị xóa, ảnh sau đã dồn vào ảnh bị xóa
                break;
              }
            }
          }
        }
        // update image Remove
        const imageRemove = RoomData.images;
        await roomModel
          .findOneAndUpdate(
            { _id: id },
            {
              images: imageRemove,
            }
          )
          .lean()
          .exec();
      }

      let resData = null;
      if (req.body.arrayUrlImage) {
        resData = await roomModel
          .findOneAndUpdate(
            { _id: id },
            {
              utilities: utilities,
              name: name,
              idElectricMetter: idElectricMetter,
              price: price,
              electricityPrice: electricityPrice,
              waterPrice: waterPrice,
              wifiPrice: wifiPrice,
              garbagePrice: garbagePrice,
              minimumMonths: minimumMonths,
              availableDate: moment(availableDate),
              acreage: acreage,
              roomPassword: roomPassword,
              depositPrice: depositPrice,
              vihicle: vihicle,
              person: person,
              linkVideo: linkVideo,
              wifiPriceN: wifiPriceN,
            }
          )
          .lean()
          .exec();

        if (!resData) {
          return HttpResponse.returnErrorWithMessage("Phòng không tồn tại");
        }
      } else {
        resData = await roomModel
          .findOneAndUpdate(
            { _id: id },
            {
              utilities: utilities,
              name: name,
              idElectricMetter: idElectricMetter,
              price: price,
              electricityPrice: electricityPrice,
              waterPrice: waterPrice,
              wifiPrice: wifiPrice,
              garbagePrice: garbagePrice,
              minimumMonths: minimumMonths,
              availableDate: moment(availableDate),
              acreage: acreage,
              roomPassword: roomPassword,
              depositPrice: depositPrice,
              vihicle: vihicle,
              person: person,
              linkVideo: linkVideo,
              wifiPriceN: wifiPriceN,
            }
          )
          .lean()
          .exec();

        if (!resData) {
          return HttpResponse.returnErrorWithMessage("Phòng không tồn tại");
        }
      }

      return HttpResponse.returnSuccessResponse(
        res,
        await RoomController.getRoomById(id)
      );
    } catch (e) {
      next(e);
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                             END HELPER FUNCTION                            */
  /* -------------------------------------------------------------------------- */
}
