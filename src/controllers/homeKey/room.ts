import { NextFunction, Request, Response } from "express";
import * as lodash from "lodash";
import * as moment from "moment";
import * as passport from "passport";

import { helpers, jwtHelper, normalizeError } from "../../utils";

import ImageService from "../../services/image";
import HttpResponse from "../../services/response";
import NotificationController from "./notification";
import FloorController from "./floor.controller";
import EnergyController from "./energy.controller";
import { CANCELLED } from "dns";
import room from "services/agenda/jobs/room";

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
        wifiPriceN: req.body.wifiPriceN,
        garbagePrice: req.body.garbagePrice,
        description: data.description,
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
          // await global.agendaInstance.agenda.schedule(
          //   moment()
          //     .endOf("month")
          //     .toDate(),
          //   "CheckOrderStatus",
          //   { orderId: JobData.currentOrder._id }
          // );
          // await global.agendaInstance.agenda.schedule(
          //   moment()
          //     .startOf("month")
          //     .add(1, "months")
          //     .toDate(),
          //   "CreateOrder",
          //   { jobId: JobData._id }
          // );
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

  /**
   * @swagger
   * definitions:
   *   quickDepositByAdmin:
   *     required:
   *       - phoneNumber
   *       - checkInTime
   *       - bankId
   *       - rentalPeriod
   *       - roomId
   *       - keyPayment
   *     properties:
   *       phoneNumber:
   *         type: string
   *       checkInTime:
   *         type: string
   *       bankId:
   *         type: string
   *       rentalPeriod:
   *         type: string
   *       roomId:
   *         type: string
   *       keyPayment:
   *         type: string
   *       firstName:
   *         type: string
   *       lastName:
   *         type: string
   *       email:
   *         type: string
   *       password:
   *         type: string
   *       confirmPassword:
   *         type: string
   */

  /** 
  * @swagger
  * /v1/homeKey/room/quickDepositByAdmin/:
  *   post:
  *     description: Create job by admin
  *     tags: [Room]
  *     produces:
  *       - application/json
  *     parameters: 
  *       - in: body
  *         name: body
  *         description: Request body
  *         schema:
  *           $ref: '#definitions/quickDepositByAdmin'
  *           type: object
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

  static async quickDepositByAdmin(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const {
        user: userModel,
        room: roomModel,
        transactions: transactionsModel, 
        floor: floorModel,
        motelRoom: motelRoomModel,
        job: jobModel,
        bill: billModel,
        banking: bankingModel,
        order: orderModel,
      } = global.mongoModel;

      const data = req.body;

      const {
        phoneNumber = "",
        checkInTime = "",
        bankId = "",

        rentalPeriod = 1,
        roomId = "",
        keyPayment = "",
      } = data;

      const firstName = data.firstName ? data.firstName : '';
      const lastName = data.firstName ? data.firstName : '';
      const email = data.firstName ? data.firstName : '';
      const password = data.firstName ? data.firstName : '';
      const confirmPassword = data.firstName ? data.firstName : '';


      // let phoneNumber = "0999999993";
      // const checkInTime = "2024-07-19";
      // const bankId = "65828a7fac6d1a57e81be5a2";
      // const price = 83888;
      // const bail = 802382;
      // const total = 829083;
      // const deposit = 82323;
      // const afterCheckInCost = 823982;
      // const rentalPeriod = 2;
      // const roonId = "6684ca384ee179a284e02005";
      // const firstName = "testt";
      // const lastName = "account";
      // const email = "emailTest@gmail.com";
      // const password = "123456";
      // const confirmPassword = "123456";

      

      const phoneNumberObect = {
        countryCode: "+84",
        number: helpers.stripeZeroOut(phoneNumber),
      };

      let userData = await userModel.findOne({phoneNumber: phoneNumberObect})
        .lean()
        .exec();

      if(!userData) {
        if(!(firstName && lastName && email && password && confirmPassword)) {
          return HttpResponse.returnBadRequestResponse(
            res,
            "Tài khoản không tồn tại, vui lòng nhập đủ thông tin để tạo tài khoản"
          );
        }
        let dataSignUp = {
          firstName: firstName,
          lastName: lastName,
          phoneNumber: phoneNumberObect,
          email: email,
          password: password,
          confirmPassword: confirmPassword,
          role: ['customer'],
        }

        // Validate input data for signUp
        const validateResults = await userModel.validateData(["signUp"], dataSignUp);

        // Parse error list form validation results
        const errorList = normalizeError(validateResults);

        // Validation Error
        if (errorList.length > 0) {
          return HttpResponse.returnBadRequestResponse(res, errorList);
        }

         // Check if password and confirm password is matched
        if (dataSignUp.password !== dataSignUp.confirmPassword) {
          return HttpResponse.returnBadRequestResponse(
            res,
            "Mật khẩu không trùng nhau"
          );
        }

        // Check email
        const existingUserEmail = await userModel
          .findOne({
            email: dataSignUp.email,
            isDeleted: false,
          })
          .lean()
          .exec();

        if (existingUserEmail) {
          return HttpResponse.returnBadRequestResponse(res, "Email đã tồn tại");
        }

        // active
        dataSignUp["active"] = true;

        if (!dataSignUp.role.includes("customer")) {
          dataSignUp.role.push("customer");
        }

        userData = new userModel(dataSignUp);
        userData.phoneNumberFull = phoneNumber;

        // Generate jwt token
        userData.token = jwtHelper.signToken(userData._id, "local");

        let resData = await userData.save();
        console.log({ resData, userData });
        resData = resData.toObject();

        // Remove password property
        delete resData.password;
        delete resData.social;
      }

      if(userData.isLocked) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Tài khoản của khách hàng đã bị khóa tạm thời nên không thể tiến hành đặt cọc"
        )
      }

      const roomData = await roomModel.findOne({_id: roomId}).lean().exec();

      if(!roomData) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Phòng không tồn tại"
        );
      }

      if(roomData.status !== "available") {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Phòng đã được đặt, vui lòng chọn phòng khác"
        );
      }

      const transactionsData = await transactionsModel.findOne({
        room: roomData._id,
        status: "waiting",
        type: "deposit",
        isDeleted: false,
      }).lean().exec();

      if(transactionsData) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Đã có giao dịch cọc cho phòng này, vui lòng kiểm tra và phê duyệt"
        );
      }

      let price = roomData.price;
      let bail =  roomData.depositPrice === 0 ? roomData.price : roomData.depositPrice;
      let deposit = Number(price) / 2;
      let afterCheckInCost = Number(price) * 0.5 + Number(bail);
      let total = Number(price) + Number(bail);

      const floorData = await floorModel
        .findOne({ rooms: roomId })
        .populate("rooms")
        .lean()
        .exec();

      if (!floorData) {
        return HttpResponse.returnBadRequestResponse(res, "Tầng không hợp lệ");
      }

      const motelRoomData = await motelRoomModel
        .findOne({ floors: floorData._id })
        .populate("floors owner address")
        .lean()
        .exec();

      if (!motelRoomData) {
        return HttpResponse.returnBadRequestResponse(res, "Tòa nhà không hợp lệ");
      }

      
      let resData = await jobModel.create({
        checkInTime: moment(checkInTime,  "DD/MM/YYYY").startOf("days").toDate(),
        user: userData._id,
        room: roomData._id,
        price: price,
        bail: bail,
        total: total,
        afterCheckInCost: afterCheckInCost,
        deposit: deposit,
        rentalPeriod: rentalPeriod,
        status: "pendingActivated",
        
        fullName: userData.lastName + " " + userData.firstName,
        phoneNumber: userData.phoneNumber.countryCode +  userData.phoneNumber.number,
      });

      let userUpdateData = {
        $addToSet: {
          jobs: resData._id,
        },
      };

      //order, transaction, bill of deposit
      const orderData = await orderModel.create({
        user: userData._id,
        job: resData._id,
        isCompleted: true,
        description: `Tiền cọc phòng tháng ${moment(resData.checkInTime).format("MM/YYYY")}`,
        amount: deposit,
        type: "deposit",
        expireTime: moment(resData.checkInTime).add(2, "days").endOf("day").toDate(),
      });

      resData = await jobModel.findOneAndUpdate(
        { _id: resData._id },
        {
          isCompleted: orderData.isCompleted,
          $addToSet: { orders: orderData._id },
          currentOrder: orderData._id,
        },
        { new: true }
      );

      await transactionsModel.create({
        user: userData._id,
        keyPayment: keyPayment, // note
        keyOrder: orderData.keyOrder,
        description:  `Tiền cọc phòng tháng ${moment(resData.checkInTime).format("MM/YYYY")}`,
        amount: orderData.amount,
        status: "success",
        paymentMethod: "cash",
        order: orderData._id,
        banking: bankId, // note
        type: "deposit",
        motel: motelRoomData._id,
        room: roomData._id,
      });

      const bankData = await bankingModel.findOne({_id: bankId}).lean().exec();

      await billModel.create({
        order: orderData._id,
        idBill: orderData.keyOrder,
        dateBill: moment().format("DD/MM/YYYY"),
        nameMotel: motelRoomData.name,
        addressMotel: motelRoomData.address.address,
        nameRoom: roomData.name,

        nameUser: userData.lastName + " " + userData.firstName,
        phoneUser: userData.phoneNumber.countryCode + userData.phoneNumber.number,
        addressUser: userData.address,
        emailUser: userData.email,

        nameOwner: motelRoomData.owner.lastName + motelRoomData.owner.firstName,
        emailOwner: motelRoomData.owner.email,
        phoneOwner: 
          motelRoomData.owner.phoneNumber.countryCode 
          + motelRoomData.owner.phoneNumber.number,
        addressOwner: motelRoomData.owner.address,
        nameBankOwner: bankData ? bankData.nameTkLable : "Chưa thêm tài khoản",
        numberBankOwner: bankData ? bankData.stk : "Chưa thêm tài khoản",
        nameOwnerBankOwner: bankData ? bankData.nameTk : "Chưa thêm tài khoản",

        totalAll: orderData.amount.toFixed(2),
        totalAndTaxAll: orderData.amount.toFixed(2),
        totalTaxAll: 0,
        typeTaxAll: 0,

        description: orderData.description,

        user: userData._id,
        motel: motelRoomData._id,
        roomRented: roomData._id,

        type: "deposit",
      });

      await userModel
        .findOneAndUpdate({ _id: userData._id }, userUpdateData, { new: true })
        .exec();

      await roomModel
      .findOneAndUpdate(
        { _id: roomData._id },
        { status: "deposited", rentedBy: userData._id },
        { new: true }
      )
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

      let updateData = {
        availableRoom: lodash.sumBy(motelRoomData.floors, "availableRoom"),
        rentedRoom: lodash.sumBy(motelRoomData.floors, "rentedRoom"),
        depositedRoom: lodash.sumBy(motelRoomData.floors, "depositedRoom"),
      };

      await motelRoomModel
        .findOneAndUpdate({ _id: motelRoomData._id }, updateData)
        .exec();

      await jobModel
        .findOneAndUpdate(
          { _id: resData._id },
          {
            isCompleted: true,
            status: "pendingActivated",
          },
          { new: true }
        )
        .exec();

      const activeExpireTime = moment(resData.checkInTime).add(7, "days").endOf("days").format("DD/MM/YYYY");

      await NotificationController.createNotification({
        title: "Thông báo kích hoạt hợp đồng",
        content: `Bạn đã đặt cọc thành công. Vui lòng kích hoạt hợp đồng cho phòng 
        ${ roomData.name} thuộc tòa nhà ${motelRoomData.name}, hạn cuối tới ngày ${activeExpireTime}.`,

        user: resData.user._id,
        isRead: false,
        type: "activeJob",
        url: `${process.env.BASE_PATH_CLINET3}job-detail/${resData._id}/${roomData._id}`,
        tag: "Job",
        contentTag: resData._id,
      });

      await global.agendaInstance.agenda.schedule(
        moment(resData.checkInTime)
          .add(7, "days")
          .endOf("day")
          .toDate(),
        "CheckJobStatus",
        { jobId: resData._id }
      );

      // const userDataRes = await userModel.findOne({_id: resData.user}).lean().exec();
      // if(userDataRes) {
      //   if(userDataRes.email) {
      //     const transporter = nodemailer.createTransport({
      //       service: 'gmail',
      //       auth: {
      //         user: `${process.env.Gmail_USER}`,
      //         pass: `${process.env.Gmail_PASS}`
      //       }
      //     });    

      //     const mailOptions = {
      //       from: `${process.env.Gmail_USER}`,
      //       // to: 'quyetthangmarvel@gmail.com',
      //       to: userDataRes.email,  // thay bằng mail admin
      //       subject: `THÔNG BÁO KÍCH HOẠT HỢP ĐỒNG`,
      //       text: `Vui lòng kích hoạt hợp đồng, hạn cuối: ${activeExpireTime}.`,
      //     };

      //     transporter.sendMail(mailOptions, function (error, info) {
      //       if (error) {
      //         console.error(error);
      //       } else {
      //         // console.log('Email đã được gửi: ' + info.response);
      //       }
      //     });
      //   }
      // }


      // passport.authenticate("local", { session: false }, async (err, rs) => {
      //   req.body.phoneNumber = {
      //     countryCode: "+84",
      //     number: helpers.stripeZeroOut(phoneNumber),
      //   };

      //   console.log("nếu có lỗi: ", err)
      // })(req, res, next);

      return HttpResponse.returnSuccessResponse(
        res,
        resData
      )


    } catch (error) {
      next(error);
    }
  }


  //CHO PHÉP NHẬP THỜI GIAN CHECK IN VÀ SỐ THÁNG THUÊ CỘNG LẠI 
  // => TỨC THỜI GIAN HẾT HỢP ĐỒNG NẰM Ở THÁNG SAU SO VỚI THỜI ĐIỂM HIỆN TẠI

  /**
   * @swagger
   * definitions:
   *   quickRentByAdmin:
   *     required:
   *       - phoneNumber
   *       - checkInTime
   *       - bankId
   *       - rentalPeriod
   *       - roomId
   *     properties:
   *       phoneNumber:
   *         type: string
   *       checkInTime:
   *         type: string
   *       bankId:
   *         type: string
   *       rentalPeriod:
   *         type: string
   *       roomId:
   *         type: string
   *       firstName:
   *         type: string
   *       lastName:
   *         type: string
   *       email:
   *         type: string
   *       password:
   *         type: string
   *       confirmPassword:
   *         type: string
   */

  /** 
  * @swagger
  * /v1/homeKey/room/quickRentByAdmin/:
  *   post:
  *     description: Create job by admin (related orders)
  *     tags: [Room]
  *     produces:
  *       - application/json
  *     parameters: 
  *       - in: body
  *         name: body
  *         description: Request body
  *         schema:
  *           $ref: '#definitions/quickRentByAdmin'
  *           type: object
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
  static async quickRentByAdmin(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const {
        user: userModel,
        room: roomModel,
        transactions: transactionsModel, 
        floor: floorModel,
        motelRoom: motelRoomModel,
        job: jobModel,
        bill: billModel,
        banking: bankingModel,
        order: orderModel,
      } = global.mongoModel;

      // let phoneNumber = "0999999995";
      // const checkInTime = "2024-07-19";
      // const bankingId = "65828a7fac6d1a57e81be5a2";
      // const price = 83888;
      // const bail = 802382;
      // const total = 829083;
      // const deposit = 82323;
      // const afterCheckInCost = 823982;
      // const rentalPeriod = 2;
      // const roomId = "6684ca384ee179a284e02005";
      // const firstName = "testt";
      // const lastName = "account";
      // const email = "emailTest@gmail.com";
      // const password = "123456";
      // const confirmPassword = "123456";

      const { body: data } = req;

      const {
        phoneNumber = "",
        checkInTime = "",
        bankId = "",

        rentalPeriod = 1,
        roomId = "",
      } = data;

      const firstName = data.firstName ? data.firstName : '';
      const lastName = data.firstName ? data.firstName : '';
      const email = data.firstName ? data.firstName : '';
      const password = data.firstName ? data.firstName : '';
      const confirmPassword = data.firstName ? data.firstName : '';


      const checkInDay = moment(checkInTime, "DD/MM/YYYY").startOf("days");
      const timeMoment = moment();
      const checkOutDay = checkInDay.clone().add(rentalPeriod, "months").subtract(1, "days").endOf("days");

      //Đã thuê => Thời gian thuê thuộc về quá khứ
      if(checkInDay.clone().isSameOrAfter(timeMoment.clone().startOf("days"))) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Vui lòng nhập thời gian bắt đầu thuê nhỏ hơn thời gian hiện tại"
        )
      }

      if(checkOutDay.clone().diff(timeMoment.clone().startOf("months"), "months") < 1) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Vui lòng nhập lại số tháng thuê và ngày bắt đầu thuê hợp lệ. Với thời gian nhập hiện tại, hợp đồng sẽ hết hạn trong tháng này."
        );
      }

      const phoneNumberObect = {
        countryCode: "+84",
        number: helpers.stripeZeroOut(phoneNumber),
      };

      let userData = await userModel.findOne({phoneNumber: phoneNumberObect})
        .lean()
        .exec();

      if(!userData) {
        if(!(firstName && lastName && email && password && confirmPassword)) {
          return HttpResponse.returnBadRequestResponse(
            res,
            "Tài khoản không tồn tại, vui lòng nhập đủ thông tin để tạo tài khoản"
          );
        }
        let dataSignUp = {
          firstName: firstName,
          lastName: lastName,
          phoneNumber: phoneNumberObect,
          email: email,
          password: password,
          confirmPassword: confirmPassword,
          role: ['customer'],
        }

        // Validate input data for signUp
        const validateResults = await userModel.validateData(["signUp"], dataSignUp);

        // Parse error list form validation results
        const errorList = normalizeError(validateResults);

        // Validation Error
        if (errorList.length > 0) {
          return HttpResponse.returnBadRequestResponse(res, errorList);
        }

          // Check if password and confirm password is matched
        if (dataSignUp.password !== dataSignUp.confirmPassword) {
          return HttpResponse.returnBadRequestResponse(
            res,
            "Mật khẩu không trùng nhau"
          );
        }

        // Check email
        const existingUserEmail = await userModel
          .findOne({
            email: dataSignUp.email,
            isDeleted: false,
          })
          .lean()
          .exec();

        if (existingUserEmail) {
          return HttpResponse.returnBadRequestResponse(res, "Email đã tồn tại");
        }

        // active
        dataSignUp["active"] = true;

        if (!dataSignUp.role.includes("customer")) {
          dataSignUp.role.push("customer");
        }

        userData = new userModel(dataSignUp);
        userData.phoneNumberFull = phoneNumber;

        // Generate jwt token
        userData.token = jwtHelper.signToken(userData._id, "local");

        let resData = await userData.save();
        console.log({ resData, userData });
        resData = resData.toObject();

        // Remove password property
        delete resData.password;
        delete resData.social;
      }

      if(userData.isLocked) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Tài khoản của khách hàng đã bị khóa tạm thời nên không thể tiến hành đặt cọc"
        )
      }

      const roomData = await roomModel.findOne({_id: roomId}).lean().exec();

      if(!roomData) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Phòng không tồn tại"
        );
      }

      if(roomData.status !== "available") {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Phòng đã được đặt, vui lòng chọn phòng khác"
        );
      }

      const transactionsData = await transactionsModel.findOne({
        room: roomData._id,
        status: "waiting",
        type: "deposit",
        isDeleted: false,
      }).lean().exec();

      if(transactionsData) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Đã có giao dịch cọc cho phòng này, vui lòng kiểm tra và phê duyệt"
        );
      }

      let price = roomData.price;
      let bail =  roomData.depositPrice === 0 ? roomData.price : roomData.depositPrice;
      let deposit = Number(price) / 2;
      let afterCheckInCost = Number(price) * 0.5 + Number(bail);
      let total = Number(price) + Number(bail);

      const floorData = await floorModel
        .findOne({ rooms: roomId })
        .populate("rooms")
        .lean()
        .exec();

      if (!floorData) {
        return HttpResponse.returnBadRequestResponse(res, "Tầng không hợp lệ");
      }

      const motelRoomData = await motelRoomModel
        .findOne({ floors: floorData._id })
        .populate("floors owner address")
        .lean()
        .exec();

      if (!motelRoomData) {
        return HttpResponse.returnBadRequestResponse(res, "Tòa nhà không hợp lệ");
      }

      
      let resData = await jobModel.create({
        checkInTime: moment(checkInTime,  "DD/MM/YYYY").startOf("days").toDate(),
        user: userData._id,
        room: roomData._id,
        price: price,
        bail: bail,
        total: total,
        afterCheckInCost: afterCheckInCost,
        deposit: deposit,
        rentalPeriod: rentalPeriod,
        
        fullName: userData.lastName + " " + userData.firstName,
        phoneNumber: userData.phoneNumber.countryCode +  userData.phoneNumber.number,
      });

      let userUpdateData = {
        $addToSet: {
          jobs: resData._id,
        },
      };

      await userModel
        .findOneAndUpdate({ _id: userData._id }, userUpdateData, { new: true })
        .exec();

      const bankData = await bankingModel.findOne({_id: bankId}).lean().exec();

      //order, transaction, bill of deposit
      const orderDataDeposit = await orderModel.create({
        user: userData._id,
        job: resData._id,
        isCompleted: true,
        description: `Tiền cọc phòng tháng ${moment(resData.checkInTime).format("MM/YYYY")}`,
        amount: deposit,
        type: "deposit",
        expireTime: moment(resData.checkInTime).add(2, "days").endOf("day").toDate(),
      });

      resData = await jobModel.findOneAndUpdate(
        { _id: resData._id },
        {
          isCompleted: orderDataDeposit.isCompleted,
          $addToSet: { orders: orderDataDeposit._id },
          currentOrder: orderDataDeposit._id,
        },
        { new: true }
      );


      await transactionsModel.create({
        user: userData._id,
        keyPayment: getRandomHex2(),
        keyOrder: orderDataDeposit.keyOrder,
        description:  `Tiền cọc phòng tháng ${moment(resData.checkInTime).format("MM/YYYY")}`,
        amount: orderDataDeposit.amount,
        status: "success",
        paymentMethod: "cash",
        order: orderDataDeposit._id,
        banking: bankId,
        type: "deposit",
        motel: motelRoomData._id,
        room: roomData._id,
      });

      await billModel.create({
        order: orderDataDeposit._id,
        idBill: orderDataDeposit.keyOrder,
        dateBill: moment().format("DD/MM/YYYY"),
        nameMotel: motelRoomData.name,
        addressMotel: motelRoomData.address.address,
        nameRoom: roomData.name,

        nameUser: userData.lastName + " " + userData.firstName,
        phoneUser: userData.phoneNumber.countryCode + userData.phoneNumber.number,
        addressUser: userData.address,
        emailUser: userData.email,

        nameOwner: motelRoomData.owner.lastName + motelRoomData.owner.firstName,
        emailOwner: motelRoomData.owner.email,
        phoneOwner: 
          motelRoomData.owner.phoneNumber.countryCode 
          + motelRoomData.owner.phoneNumber.number,
        addressOwner: motelRoomData.owner.address,
        nameBankOwner: bankData ? bankData.nameTkLable : "Chưa thêm tài khoản",
        numberBankOwner: bankData ? bankData.stk : "Chưa thêm tài khoản",
        nameOwnerBankOwner: bankData ? bankData.nameTk : "Chưa thêm tài khoản",

        totalAll: orderDataDeposit.amount.toFixed(2),
        totalAndTaxAll: orderDataDeposit.amount.toFixed(2),
        totalTaxAll: 0,
        typeTaxAll: 0,

        description: orderDataDeposit.description,

        user: userData._id,
        motel: motelRoomData._id,
        roomRented: roomData._id,

        type: "deposit",
      });

      //order afterCheckInCost
      const orderDataAfterCheckInCost = await orderModel.create({
        user: resData.user,
        job: resData._id,
        isCompleted: true,
        description: `Tiền thanh toán khi nhận phòng tháng 
        ${moment(resData.checkInTime).format("MM/YYYY")}`,
        amount: resData.afterCheckInCost,
        type: "afterCheckInCost",
        expireTime: moment().add(7, "days").endOf("day").toDate(),
      });

      resData = await jobModel.findOneAndUpdate(
        { _id: resData._id },
        {
          $addToSet: { orders: orderDataAfterCheckInCost._id },
          currentOrder: orderDataAfterCheckInCost._id,
        },
        { new: true }
      );
      
      await transactionsModel.create({
        user: userData._id,
        keyPayment: getRandomHex2(), 
        keyOrder: orderDataAfterCheckInCost.keyOrder,
        description:  `Tiền thanh toán khi nhận phòng tháng 
        ${moment(resData.checkInTime).format("MM/YYYY")}`,
        amount: orderDataAfterCheckInCost.amount,
        status: "success",
        paymentMethod: "cash",
        order: orderDataAfterCheckInCost._id,
        banking: bankId,
        type: "afterCheckInCost",
        motel: motelRoomData._id,
        room: roomData._id,
      });

      await billModel.create({
        order: orderDataAfterCheckInCost._id,
        idBill: orderDataAfterCheckInCost.keyOrder,
        dateBill: moment().format("DD/MM/YYYY"),
        nameMotel: motelRoomData.name,
        addressMotel: motelRoomData.address.address,
        nameRoom: roomData.name,

        nameUser: userData.lastName + " " + userData.firstName,
        phoneUser: userData.phoneNumber.countryCode + userData.phoneNumber.number,
        addressUser: userData.address,
        emailUser: userData.email,

        nameOwner: motelRoomData.owner.lastName + motelRoomData.owner.firstName,
        emailOwner: motelRoomData.owner.email,
        phoneOwner: 
          motelRoomData.owner.phoneNumber.countryCode 
          + motelRoomData.owner.phoneNumber.number,
        addressOwner: motelRoomData.owner.address,
        nameBankOwner: bankData ? bankData.nameTkLable : "Chưa thêm tài khoản",
        numberBankOwner: bankData ? bankData.stk : "Chưa thêm tài khoản",
        nameOwnerBankOwner: bankData ? bankData.nameTk : "Chưa thêm tài khoản",

        totalAll: orderDataAfterCheckInCost.amount.toFixed(2),
        totalAndTaxAll: orderDataAfterCheckInCost.amount.toFixed(2),
        totalTaxAll: 0,
        typeTaxAll: 0,

        description: orderDataAfterCheckInCost.orderData,

        user: userData._id,
        motel: motelRoomData._id,
        roomRented: roomData._id,

        type: "afterCheckInCost",
      });

      //create history monthly order
      
      if(checkInDay.clone().year() < timeMoment.clone().year()) {
        let monthPlus: number = 0;
        while(checkInDay.clone().add(monthPlus, "months").isBefore(timeMoment.clone().startOf("months"))) {
          //create order
          let startTime: moment.Moment = checkInDay.clone().add(monthPlus, "months").startOf("months");

          //first month
          if(monthPlus === 0) {
            startTime = checkInDay.clone().startOf("days");
          }
          let endTime: moment.Moment = checkInDay.clone().add(monthPlus, "months").endOf("months");

          let orderDataMonthly = await createOrderHistory(
            resData,
            roomData,
            motelRoomData,
            startTime,
            endTime,
            bankId,
          );

          await jobModel.findOneAndUpdate(
            { _id: resData._id },
            {
              $addToSet: { orders: orderDataMonthly._id },
              currentOrder: orderDataMonthly._id,
              status: "monthlyPaymentCompleted",//note: chưa chắc trạng thái
              isActived: true,
            }
          );

          monthPlus++;
        }

        //tính cho tháng hiện tại vào đầu tháng sau
        await global.agendaInstance.agenda.schedule(
          timeMoment.clone()
            .startOf("month")
            .add(1, "months")
            .toDate(),
          "CreateOrderForNextMonth",
          { jobId: resData._id }
        );

      } else if (checkInDay.clone().year() === timeMoment.clone().year()) {
        if (checkInDay.clone().month() <  timeMoment.clone().month()) {
          // tạo order trước đó
          let monthPlus: number = 0;
          while(checkInDay.clone().add(monthPlus, "months").isBefore(timeMoment.clone().startOf("months"))) {
            //create order
            let startTime: moment.Moment = checkInDay.clone().add(monthPlus, "months").startOf("months");

            //first month
            if(monthPlus === 0) {
              startTime = checkInDay.clone().startOf("days");
            }
            let endTime: moment.Moment = checkInDay.clone().add(monthPlus, "months").endOf("months");

            let orderDataMonthly = await createOrderHistory(
              resData,
              roomData,
              motelRoomData,
              startTime,
              endTime,
              bankId,
            );

            await jobModel.findOneAndUpdate(
              { _id: resData._id },
              {
                $addToSet: { orders: orderDataMonthly._id },
                currentOrder: orderDataMonthly._id,
                status: "monthlyPaymentCompleted",//note: chưa chắc trạng thái
                isActived: true,
              }
            );

            monthPlus++;
          }

          //tính cho tháng hiện tại vào đầu tháng sau
          await global.agendaInstance.agenda.schedule(
            timeMoment.clone()
              .startOf("month")
              .add(1, "months")
              .toDate(),
            "CreateOrderForNextMonth",
            { jobId: resData._id }
          );

        } else {
          //không cần tạo lịch sử hóa đơn
          await global.agendaInstance.agenda.schedule(
            timeMoment.clone()
              .startOf("month")
              .add("1", "months")
              .toDate(),
            "CreateFirstMonthOrder",
            { jobId: resData._id }
          );
        }
      }

      await roomModel
      .findOneAndUpdate(
        { _id: roomData._id },
        { status: "rented", rentedBy: userData._id },
        { new: true }
      )
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

      let updateData = {
        availableRoom: lodash.sumBy(motelRoomData.floors, "availableRoom"),
        rentedRoom: lodash.sumBy(motelRoomData.floors, "rentedRoom"),
        depositedRoom: lodash.sumBy(motelRoomData.floors, "depositedRoom"),
      };

      await motelRoomModel
        .findOneAndUpdate({ _id: motelRoomData._id }, updateData)
        .exec();

      await jobModel
        .findOneAndUpdate(
          { _id: resData._id },
          {
            isCompleted: true,
            status: "pendingMonthlyPayment",
            isActived: true,
          },
          { new: true }
        )
        .exec();

      // const userDataRes = await userModel.findOne({_id: resData.user}).lean().exec();
      // if(userDataRes) {
      //   if(userDataRes.email) {
      //     const transporter = nodemailer.createTransport({
      //       service: 'gmail',
      //       auth: {
      //         user: `${process.env.Gmail_USER}`,
      //         pass: `${process.env.Gmail_PASS}`
      //       }
      //     });    

      //     const mailOptions = {
      //       from: `${process.env.Gmail_USER}`,
      //       // to: 'quyetthangmarvel@gmail.com',
      //       to: userDataRes.email,  // thay bằng mail admin
      //       subject: `THÔNG BÁO KÍCH HOẠT HỢP ĐỒNG`,
      //       text: `Vui lòng kích hoạt hợp đồng, hạn cuối: ${activeExpireTime}.`,
      //     };

      //     transporter.sendMail(mailOptions, function (error, info) {
      //       if (error) {
      //         console.error(error);
      //       } else {
      //         // console.log('Email đã được gửi: ' + info.response);
      //       }
      //     });
      //   }
      // }

      // passport.authenticate("local", { session: false }, async (err, rs) => {
      //   req.body.phoneNumber = {
      //     countryCode: "+84",
      //     number: helpers.stripeZeroOut(phoneNumber),
      //   };

      //   console.log("nếu có lỗi: ", err)
      // })(req, res, next);

      return HttpResponse.returnSuccessResponse(
        res,
        resData
      )


    } catch (error) {
      next(error);
    }
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
      console.log({ data, roomId });

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
          description: data.description,
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
      console.log({ updateRoomData: req.body });
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
      const description = req.body.description;

      const wifiPrice = req.body.wifiPrice;
      const garbagePrice = req.body.garbagePrice;

      const vihicle: number = req.body.vihicle;
      const person: number = req.body.person;

      const arrayRemoveImg = req.body.arrayRemoveImg;
      console.log({ arrayRemoveImg });

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
      resData = await roomModel
        .findOneAndUpdate(
          { _id: id },
          {
            utilities,
            name,
            idElectricMetter,
            price,
            electricityPrice,
            waterPrice,
            wifiPrice,
            garbagePrice,
            minimumMonths,
            availableDate: moment(availableDate),
            acreage,
            roomPassword,
            depositPrice,
            vihicle,
            person,
            linkVideo,
            wifiPriceN,
            description,
          }
        )
        .lean()
        .exec();

      if (!resData) {
        return HttpResponse.returnErrorWithMessage("Phòng không tồn tại");
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

async function createOrderHistory(
  jobData: any,
  roomData: any,
  motelRoomData: any,
  startTime: moment.Moment,
  endTime: moment.Moment,
  bankId: string,
): Promise<any> {
  const { 
    order: orderModel, 
    totalKwh: totalKwhModel,
    transactions: transactionsModel,
    banking: BankingModel,
    optionsType: OptionsTypeModel,
    bill: billModel,
    user: userModel,
  } = global.mongoModel;

  const start = startTime.clone().format("YYYY-MM-DD");
  const end = endTime.clone().clone().format("YYYY-MM-DD");

  const expireTime = endTime.clone().add(15, "days");

  let dataElectricAll = await EnergyController.calculateElectricUsedDayToDayHaveLabelTime(roomData._id, start, end);

  let electricNumber = 0;
  let labelTime: string[] = [];
  let kWhData: number[] = [];
  if (dataElectricAll === null) {
    electricNumber = 0;
  } else {
    electricNumber = dataElectricAll.totalkWhTime;
    labelTime = dataElectricAll.labelTime;
    kWhData = dataElectricAll.kWhData;
  }

  const electricityPricePerKwh = roomData.electricityPrice;

  const electricPrice = electricNumber * electricityPricePerKwh;

  let numberDayStay = startTime.clone().daysInMonth();

  if(moment(jobData.checkInTime).startOf("months").isSame(startTime.clone().startOf("months"))) {
    numberDayStay = (moment(jobData.checkInTime).endOf("month").diff(moment(jobData.checkInTime), "days") + 1);
  }

  const dayOfMon = startTime.clone().daysInMonth();
  const waterPrice = (roomData.waterPrice * roomData.person);
  const servicePrice = roomData.garbagePrice;
  const vehiclePrice = roomData.wifiPrice * roomData.vihicle;
  const roomPrice = (roomData.price / dayOfMon) * numberDayStay;
  const wifiPriceN = roomData.wifiPriceN * roomData.person;
  const amount = roomPrice + vehiclePrice + servicePrice + waterPrice + electricPrice + wifiPriceN;

  const orderData = await orderModel.create({
    user: jobData.user,
    job: jobData._id,
    isCompleted: true,
    numberDayStay: numberDayStay,
    electricNumber: electricNumber,
    electricPrice: electricPrice,
    waterPrice: waterPrice,
    servicePrice: servicePrice,
    vehiclePrice: vehiclePrice,
    roomPrice: roomPrice,
    wifiPrice: wifiPriceN,
    description: `Tiền phòng tháng ${startTime.clone().format("MM/YYYY")}`,
    amount: amount,
    type: "monthly",
    startTime: startTime.clone().toDate(),
    endTime: endTime.clone().toDate(),
    expireTime: expireTime.toDate(),
  });

  await totalKwhModel.create({
    order: orderData._id,
    kWhData: kWhData,
    labelTime: labelTime,
  });

  const transactionsData = await transactionsModel.create({
    user: jobData.user,
    keyPayment: getRandomHex2(),
    keyOrder: orderData.keyOrder,
    description: orderData.description,
    amount: orderData.amount,
    status: "success",
    paymentMethod: "cash",
    order: orderData._id,
    banking: bankId,
    type: "monthly",
    motel: motelRoomData._id,
    room: roomData._id,
  });

  const electricity = await OptionsTypeModel.create({
    expense: "Chi Phí Điện",
    type: orderData.electricNumber.toString(),
    unitPrice: roomData.electricityPrice.toFixed(2),
    total: orderData.electricPrice.toFixed(2),
  });

  const garbage = await OptionsTypeModel.create({
    expense: "Chi Dịch Vụ",
    type: "1",
    unitPrice: roomData.garbagePrice.toFixed(2),
    total: orderData.servicePrice.toFixed(2),
  });

  const water = await OptionsTypeModel.create({
    expense: "Chi Phí Nước",
    type: roomData.person.toString(),
    unitPrice: roomData.waterPrice.toFixed(2),
    total: orderData.waterPrice.toFixed(2),
  });
  const vehicle = await OptionsTypeModel.create({
    expense: "Chi Phí Xe",
    type: roomData.vihicle.toString(),
    unitPrice: roomData.wifiPrice.toFixed(2),
    total: orderData.vehiclePrice.toFixed(2),
  });

  const wifi = await OptionsTypeModel.create({
    expense: "Chi Phí Wifi",
    type: roomData.person.toString(),
    unitPrice: roomData.wifiPriceN.toFixed(2),
    total: orderData.wifiPrice.toFixed(2),
  });

  const other = await OptionsTypeModel.create({
    expense: "Chi Phí Khác",
    type: "1",
    unitPrice: "0",
    total: "0",
  });

  const room = await OptionsTypeModel.create({
    expense: "Chi Phí Phòng",
    type: orderData.numberDayStay.toString(),
    unitPrice: roomData.price.toFixed(2),
    total: orderData.roomPrice.toFixed(2),
  });

  const userData = await userModel.findOne({ _id: jobData.user }).lean().exec();

  const bankData = await BankingModel.findOne({ _id: transactionsData.banking }).lean().exec();

  await billModel.create({
    order: orderData._id,
    idBill: orderData.keyOrder,
    dateBill: startTime.clone().add(1, "months").startOf("months").format("DD/MM/YYYY"), //note
    nameMotel: motelRoomData.name,
    addressMotel: motelRoomData.address.address,
    nameRoom: roomData.name,

    nameUser: userData.lastName + " " + userData.firstName,

    phoneUser: userData.phoneNumber.countryCode + userData.phoneNumber.number,
    addressUser: userData.address,
    emailUser: userData.email,

    nameOwner: motelRoomData.owner.lastName + motelRoomData.owner.firstName,
    emailOwner: motelRoomData.owner.email,
    phoneOwner: 
      motelRoomData.owner.phoneNumber.countryCode
      + motelRoomData.owner.phoneNumber.number,
    addressOwner: motelRoomData.owner.address,
    nameBankOwner: bankData ? bankData.nameTkLable : "Chưa thêm tài khoản",
    numberBankOwner: bankData ? bankData.stk : "Chưa thêm tài khoản",
    nameOwnerBankOwner: bankData ? bankData.nameTk : "Chưa thêm tài khoản",

    totalAll: orderData.amount.toFixed(2),
    totalAndTaxAll: orderData.amount.toFixed(2),
    totalTaxAll: 0,
    typeTaxAll: 0,

    description: orderData.description,

    electricity: electricity,
    garbage: garbage,
    water: water,
    wifi: wifi,
    vehicle: vehicle,
    other: other,
    room: room,

    startTime: orderData.startTime,
    endTime: orderData.endTime,

    user: jobData.user,
    motel: motelRoomData._id,
    roomRented: roomData._id,

    type: "monthly",
  });
  
  return orderData;
}

const getRandomInt = (min, max) =>
  Math.floor(Math.random() * (max - min)) + min;

const getRandomString = (length, base) => {
  let result = '';
  const baseLength = base.length;

  for (let i = 0; i < length; i++) {
    const randomIndex = getRandomInt(0, baseLength);
    result += base[randomIndex];
  }

  return result;
};
const getRandomHex2 = () => {
  const baseString = '0123456789ABCDEF';
  const ma = `${getRandomString(8, baseString)}`;
  return ma;
};
