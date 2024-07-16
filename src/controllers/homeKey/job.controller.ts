import { NextFunction, Request, Response } from "express";
import * as moment from "moment";
import * as mongoose from "mongoose";
var nodemailer = require("nodemailer");

import { helpers } from "../../utils";

import ImageService from "../../services/image";
import HttpResponse from "../../services/response";
import RoomController from "./room";
import NotificationController from "./notification";
import * as lodash from "lodash";
import { JobModel } from "models/homeKey/job";
import job from "services/agenda/jobs/job";
import axios from "axios";

export default class JobController {
  /**
   * @swagger
   * tags:
   *   - name: Job
   *     description: Job Control APIs
   */

  /**
   * @swagger
   * /v1/homeKey/job:
   *   post:
   *     description: Edit room by id
   *     tags: [Job]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: roomId
   *         in: formData
   *         type: string
   *         description: roomId
   *       - name: checkInTime
   *         in: formData
   *         type: string
   *         description: mm/dd/yyyy
   *       - name: fullName
   *         in: formData
   *         type: string
   *         description: fullName
   *       - name: phoneNumber
   *         in: formData
   *         type: string
   *         description: phoneNumber
   *       - name: price
   *         in: formData
   *         type: string
   *         description: price
   *       - name: bail
   *         in: formData
   *         type: string
   *         description: bail
   *       - name: total
   *         in: formData
   *         type: string
   *         description: total
   *       - name: deposit
   *         in: formData
   *         type: string
   *         description: deposit
   *       - name: afterCheckInCost
   *         in: formData
   *         type: string
   *         description: afterCheckInCost
   *       - name: afterCheckInCost
   *         in: formData
   *         type: string
   *         description: afterCheckInCost
   *       - name: rentalPeriod
   *         in: formData
   *         type: string
   *         description: rentalPeriod
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

  static async createJob(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init models
      const {
        room: roomModel,
        job: jobModel,
        user: userModel,
        floor: floorModel,
        motelRoom: motelRoomModel,
        order: orderModel,
        image: imageModel,
      } = global.mongoModel;

      let { body: data } = req;
      console.log({ data });

      const roomData = await RoomController.getRoomById(data.roomId);

      if (roomData && roomData.error) {
        return HttpResponse.returnBadRequestResponse(
          res,
          roomData.errors[0].errorMessage
        );
      }

      if (!roomData.isCompleted) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Phòng chưa hoàn thành"
        );
      }

      if (roomData.status !== "available") {
        return HttpResponse.returnBadRequestResponse(res, "Phòng Đã Được Đặt");
      }
      const dayID = moment(roomData.availableDate).format("DD/MM/YYYY");

      if (
        moment(data.checkInTime, "MM-DD-YYYY").isBefore(
          moment(dayID, "MM-DD-YYYY")
        )
      ) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Thời gian bắt đầu thuê nhỏ hơn ngày hiện tại"
        );
      }
      const myDateOld = data.checkInTime;

      const dateOld = myDateOld.split("/")[0];
      const monthOld = myDateOld.split("/")[1];
      const yearOld = myDateOld.split("/")[2];

      const stringDate = `${dateOld}-${monthOld}-${yearOld}`;
      let date = new Date(
        stringDate.replace(/(\d{2})-(\d{2})-(\d{4})/, "$2/$1/$3")
      );
      const myDateNew = date;
      data.checkInTime = myDateNew;
      data.room = roomData._id;
      data.user = req["userId"];

      const floorData = await floorModel
        .findOne({ rooms: data.roomId })
        .lean()
        .exec();

      if (!floorData) {
        return HttpResponse.returnBadRequestResponse(res, "Tầng không hợp lệ");
      }

      const motelRoomData = await motelRoomModel
        .findOne({ floors: floorData._id })
        .lean()
        .exec();

      if (!motelRoomData) {
        return HttpResponse.returnBadRequestResponse(res, "Phòng không hợp lệ");
      }
      let resData = await jobModel.create(data);
      let userUpdateData = {
        $addToSet: {
          jobs: resData._id,
        },
      };

      if (
        req["userProfile"].phoneNumber.number ===
        helpers.stripeZeroOut(data.phoneNumber)
      ) {
        userUpdateData["currentJob"] = resData._id;
        userUpdateData["room"] = roomData._id;
      }

      await userModel
        .findOneAndUpdate({ _id: req["userId"] }, userUpdateData, { new: true })
        .exec();

      await floorModel
        .findOneAndUpdate(
          { _id: floorData._id },
          {
            $inc: {
              availableRoom: -1,
              depositedRoom: 1,
            },
          }
        )
        .exec();
      await motelRoomModel
        .findOneAndUpdate(
          { _id: floorData._id },
          {
            $inc: {
              availableRoom: -1,
              depositedRoom: 1,
            },
          }
        )
        .exec();

      await NotificationController.createNotification({
        title: "Xác nhận đặt cọc",
        content: "Bạn đã đặt phòng thành công",
        user: req["userId"],
        isRead: false,
      });

      const orderData = await orderModel.create({
        user: req["userId"],
        job: resData._id,
        isCompleted: false,
        description: `Tiền cọc phòng tháng ${myDateOld.split("/")[1]}/${
          myDateOld.split("/")[2]
        }`,
        amount: data.deposit,
        type: "deposit",
        expireTime: moment(resData.checkInTime)
          .add(7, "days")
          .endOf("day")
          .toDate(),
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

      // Check 7 days after check in time
      await global.agendaInstance.agenda.schedule(
        moment(resData.checkInTime)
          .add(7, "days")
          .endOf("day")
          .toDate(),
        "CheckJobStatus",
        { jobId: resData._id }
      );

      return HttpResponse.returnSuccessResponse(
        res,
        await JobController.getJob(resData._id)
      );
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /v1/homeKey/job/list:
   *   get:
   *     description: Get list job
   *     tags: [Job]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: keyword
   *         in: query
   *         type:  string
   *         description: Keyword to find job
   *       - name: sortBy
   *         in: query
   *         type:  string
   *         description: Sort By
   *         enum:
   *              - createdAt
   *              - updatedAt
   *       - name: sortType
   *         in: query
   *         type:  string
   *         description: Sort Type
   *         enum:
   *              - ascending
   *              - descending
   *       - name: size
   *         in: query
   *         description: Number of user returned
   *         type:  integer
   *         default: 20
   *       - name: page
   *         in: query
   *         default: 0
   *         description: Current page
   *         type:  integer
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

  static async createJobWithCash(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      //Init models
      const {
        room: roomModel,
        job: jobModel,
        user: userModel,
        floor: floorModel,
        motelRoom: motelRoomModel,
        order: orderModel,
      } = global.mongoModel;
    } catch (error) {}
  }

  static async getJobList(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init user model`
      const {
        job: jobModel,
        floor: floorModel,
        motelRoom: motelRoomModel,
      } = global.mongoModel;
      let { sortBy, size, page, keyword } = req.query;
      const sortType = req.query.sortType === "ascending" ? 1 : -1;
      let condition, sort;

      condition = [
        {
          $lookup: {
            from: "rooms",
            localField: "room",
            foreignField: "_id",
            as: "room",
          },
        },
        { $unwind: { path: "$room", preserveNullAndEmptyArrays: true } },
        // {
        //   $project: {
        //     isDeleted: 0,
        //   },
        // },
        {
          $match: {
            user: req["userId"],
            isCompleted: true,
            isDeleted: false,
          },
        },
      ];

      if (sortBy && sortType) {
        switch (sortBy) {
          case "createdAt": {
            sort = { createdAt: sortType };
            break;
          }
          case "updatedAt": {
            sort = { updatedAt: sortType };
            break;
          }
        }
        condition.push({ $sort: sort });
      }

      const resData = await jobModel.paginate(size, page, condition);

      resData.data = await Promise.all(
        resData.data.map(async (item) => {
          const floorData = await floorModel
            .findOne({ rooms: item.room._id })
            .lean()
            .exec();

          if (floorData) {
            const motelData = await motelRoomModel
              .findOne({ floors: { $in: [floorData._id] } })
              .lean()
              .exec();
            const motelName = motelData ? motelData.name : "";
            item.motelName = motelName;
          }

          return item;
        })
      );
      console.log("Check resData: ", resData);

      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /v1/admin/homeKey/job/list:
   *   get:
   *     description: Get list job
   *     tags: [Job]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: keyword
   *         in: query
   *         type:  string
   *         description: Keyword to find job
   *       - name: sortBy
   *         in: query
   *         type:  string
   *         description: Sort By
   *         enum:
   *              - createdAt
   *              - updatedAt
   *       - name: sortType
   *         in: query
   *         type:  string
   *         description: Sort Type
   *         enum:
   *              - ascending
   *              - descending
   *       - name: size
   *         in: query
   *         description: Number of user returned
   *         type:  integer
   *         default: 20
   *       - name: page
   *         in: query
   *         default: 0
   *         description: Current page
   *         type:  integer
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

  static async getJobListByAdmin(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init user model`
      const { job: jobModel } = global.mongoModel;
      let { sortBy, size, page, keyword } = req.query;
      const sortType = req.query.sortType === "ascending" ? 1 : -1;
      let condition, sort;

      condition = [
        {
          $lookup: {
            from: "rooms",
            localField: "room",
            foreignField: "_id",
            as: "room",
          },
        },
        { $unwind: { path: "$room", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            isDeleted: 0,
          },
        },
      ];

      if (sortBy && sortType) {
        switch (sortBy) {
          case "createdAt": {
            sort = { createdAt: sortType };
            break;
          }
          case "updatedAt": {
            sort = { updatedAt: sortType };
            break;
          }
        }
        condition.push({ $sort: sort });
      }

      const resData = await jobModel.paginate(size, page, condition);

      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      next(e);
    }
  }
  static async getJobListByAdminWithUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const id = req.params.id;
      // Init models
      const { order: OrderModel, user: UserModel } = global.mongoModel;
      let { size, page } = req.query;
      let condition;
      condition = [
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: false } },
        {
          $project: {
            isDeleted: 0,
            "user.password": 0,
            "user.token": 0,
            "user.isDeleted": 0,
            "user._v": 0,
          },
        },
      ];
      const resData = await OrderModel.paginate(size, page, condition);
      if (!resData) {
        return HttpResponse.returnBadRequestResponse(res, "order.not.exist");
      }

      const dataRes = [];
      for (let i = 0; i < resData.data.length; i++) {
        if (resData.data[i].user._id == req.params.id) {
          const jobData = await JobController.getJobNoImg(
            resData.data[i].job._id
          ); //note: nguyên bản là getJob, tuy nhiên lỗi đường path tìm ảnh nên dùng tạm
          if (jobData) {
            resData.data[i].room = jobData.room;
          } else {
            resData.data[i].room = {};
          }
          dataRes.push(resData.data[i]);
        }
      }
      if (dataRes.length > 0) {
        resData.data = dataRes;
      } else {
        resData.data = [];
      }

      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /v1/homeKey/job/{id}:
   *   delete:
   *     description: Delete job by id
   *     tags: [Job]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: id
   *         in: path
   *         type: string
   *         description: jobId
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

  static async deleteJobByUser(
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
        job: jobModel,
        user: userModel,
        order: orderModel,
      } = global.mongoModel;

      const jobData = await JobController.getJob(req.params.id, {
        user: mongoose.Types.ObjectId(req["userId"]),
      });

      if (jobData && jobData.error) {
        return HttpResponse.returnBadRequestResponse(
          res,
          jobData.errors[0].errorMessage
        );
      }

      await NotificationController.createNotification({
        title: "Xác nhận hủy cọc",
        content: "Bạn đã hủy cọc phòng thành công",
        user: req["userId"],
        isRead: false,
      });

      // let resData = await jobModel
      //   .remove({ _id: req.params.id })
      //   .lean()
      //   .exec();
      let resData = await jobModel
        .findOneAndUpdate({ _id: req.params.id }, { isDeleted: true })
        .lean()
        .exec();
      // resData = await jobModel.find()

      // await orderModel.remove({ _id: { $in: jobData.orders } }).exec();

      await roomModel
        .findOneAndUpdate(
          { _id: jobData.room },
          {
            status: "available",
            $unset: { rentedBy: 1 },
          }
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
            soonExpireContractRoom: roomGroup["soonExpireContract"]
              ? roomGroup["soonExpireContract"].length
              : 0,
            rentedRoom: roomGroup["rented"] ? roomGroup["rented"].length : 0,
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
        soonExpireContractRoom: lodash.sumBy(
          motelRoomData.floors,
          "soonExpireContractRoom"
        ),
      };

      await motelRoomModel
        .findOneAndUpdate({ _id: motelRoomData._id }, updateData)
        .exec();

      let userUpdateData = {
        $pull: {
          jobs: jobData._id,
        },
      };

      if (
        req["userProfile"].phoneNumber.number ===
        helpers.stripeZeroOut(jobData.phoneNumber)
      ) {
        userUpdateData["$unset"] = { room: 1, currentJob: 1 };
      }

      await userModel
        .findOneAndUpdate({ _id: req["userId"] }, userUpdateData, { new: true })
        .exec();

      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /v1/admin/homeKey/job/{id}:
   *   delete:
   *     description: Delete job by id
   *     tags: [Job]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: id
   *         in: path
   *         type: string
   *         description: jobId
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

  static async deleteJobByAdmin(
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
        job: jobModel,
        user: userModel,
        order: orderModel,
      } = global.mongoModel;

      const jobData = await JobController.getJob(req.params.id);

      if (!jobData) {
        return HttpResponse.returnBadRequestResponse(res, "job.not.exist");
      }

      await NotificationController.createNotification({
        title: "Xác nhận hủy cọc",
        content: "Bạn đã hủy cọc phòng thành công",
        user: req["userId"],
        isRead: false,
      });

      let resData = await jobModel
        .remove({ _id: req.params.id })
        .lean()
        .exec();

      await orderModel.remove({ _id: { $in: jobData.orders } }).exec();

      await roomModel
        .findOneAndUpdate(
          { _id: jobData.room },
          {
            status: "available",
            $unset: { rentedBy: 1 },
          },
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
            rentedRoom: roomGroup["rented"] ? roomGroup["rented"].length : 0,
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

      let userUpdateData = {
        $pull: {
          jobs: jobData._id,
        },
      };

      const userData = await userModel
        .findOne({ _id: jobData.user })
        .lean()
        .exec();

      if (
        userData.phoneNumber.number ===
        helpers.stripeZeroOut(jobData.phoneNumber)
      ) {
        userUpdateData["$unset"] = { room: 1, currentJob: 1 };
      }

      await userModel
        .findOneAndUpdate({ _id: jobData.user }, userUpdateData, { new: true })
        .exec();

      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /v1/homeKey/job/{id}:
   *   get:
   *     description: Get job by id
   *     tags: [Job]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: id
   *         in: path
   *         type: string
   *         description: jobId
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

  static async getJobById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      let resData = await JobController.getJob(req.params.id, {
        user: mongoose.Types.ObjectId(req["userId"]),
      });

      if (resData && resData.error) {
        return HttpResponse.returnBadRequestResponse(
          res,
          resData.errors[0].errorMessage
        );
      }

      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /v1/admin/homeKey/job/{id}:
   *   get:
   *     description: Get job by id
   *     tags: [Job]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: id
   *         in: path
   *         type: string
   *         description: jobId
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

  static async getJobByAdmin(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      let resData = await JobController.getJob(req.params.id);

      if (resData && resData.error) {
        return HttpResponse.returnBadRequestResponse(
          res,
          resData.errors[0].errorMessage
        );
      }

      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /v1/homeKey/job/{id}/images:
   *   put:
   *     description: Upload Image For Job
   *     tags: [Job]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: id
   *         in: path
   *         required:  true
   *         type: string
   *         description: jobId
   *       - name: file
   *         in: formData
   *         required:  true
   *         type:  file
   *         description: image lists
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

  static async uploadImageForJob(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const data = req.body;
      console.log({ data });
      console.log("ahsdfkjhas", req["userId"]);
      let images = [];

      for (let i = 0; i < data.length; i++) {
        images.push(data[i]);
      }

      const imageService = new ImageService("local", true);

      // Process form data
      const processDataInfo = await imageService.processFormData(req, res);

      if (processDataInfo && processDataInfo.error) {
        return HttpResponse.returnBadRequestResponse(
          res,
          processDataInfo.error
        );
      }

      let resData = await JobController.getJob(req.params.id, {
        user: mongoose.Types.ObjectId(req["userId"]),
      });

      if (resData && resData.error) {
        return HttpResponse.returnBadRequestResponse(
          res,
          resData.errors[0].errorMessage
        );
      }

      if (!resData.isCompleted) {
        return HttpResponse.returnBadRequestResponse(res, "Chưa hoàn thành");
      }
      const { image: imageModel } = global.mongoModel;

      const { job: jobModel } = global.mongoModel;
      let rs = null;

      const dataIMG_font = await imageModel.findOne({ _id: images[0] });
      const dataIMG_end = await imageModel.findOne({ _id: images[1] });

      const dataIMG = [];
      dataIMG.push(dataIMG_font);
      dataIMG.push(dataIMG_end);

      rs = await jobModel
        .findOneAndUpdate({ _id: req.params.id }, { images: dataIMG })
        .lean()
        .exec();

      return HttpResponse.returnSuccessResponse(
        res,
        JobController.getJob(req.params.id)
      );
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /v1/homeKey/job/{id}/active:
   *   put:
   *     description: Upload Image For Job
   *     tags: [Job]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: id
   *         in: path
   *         required:  true
   *         type: string
   *         description: jobId
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

  static async activeJob(
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

      console.log("THÔNG TIN NGƯỜI DÙNG: ", req["userId"]);

      const imageService = new ImageService("local", true);

      // Process form data
      const processDataInfo = await imageService.processFormData(req, res);

      if (processDataInfo && processDataInfo.error) {
        return HttpResponse.returnBadRequestResponse(
          res,
          processDataInfo.error
        );
      }

      let resData = await JobController.getJob(req.params.id, {
        user: mongoose.Types.ObjectId(req["userId"]),
        // user: mongoose.Types.ObjectId('6683b81ac475a72180ce590c'),
      });

      if (resData && resData.error) {
        return HttpResponse.returnBadRequestResponse(
          res,
          resData.errors[0].errorMessage
        );
      }

      if (resData.status !== "pendingActivated") {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Phòng đang chờ kích hoạt"
        );
      }

      if (moment().isBefore(resData.checkInTime)) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Phòng đặt trước thời gian"
        );
      }

      if (resData.isActived) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Phòng đã được kích hoạt"
        );
      }

      //TODO: turn on IoT devices

      await roomModel
        .findOneAndUpdate({ _id: resData.room._id }, { status: "rented" })
        .lean()
        .exec();

      // await NotificationController.createNotification({
      //   title: "Thông báo đóng tiền phòng",
      //   content: "Vui lòng thanh toán tiền trước cuối tháng.",
      //   user: resData.user,
      // });

      const checkInTime = moment(resData.checkInTime)
        .utcOffset(420)
        .format("MM/DD/YYYY");

      const orderData = await orderModel.create({
        user: resData.user,
        job: resData._id,
        isCompleted: false,
        description: `Tiền thanh toán khi nhận phòng tháng ${
          checkInTime.split("/")[0]
        }/${checkInTime.split("/")[2]}`,
        amount: resData.afterCheckInCost,
        type: "afterCheckInCost",
        // expireTime: moment(resData.checkInTime).add(7, "days").endOf("day").toDate(),
        expireTime: moment()
          .add(7, "days")
          .endOf("day")
          .toDate(),
      });

      console.log("NGÀY TẠOOOO", moment());

      resData = await jobModel
        .findOneAndUpdate(
          { _id: resData._id },
          {
            $addToSet: { orders: orderData._id },
            currentOrder: orderData._id,
            isActived: true,
            status: "pendingAfterCheckInCostPayment",
          },
          { new: true }
        )
        .populate("rooms")
        .lean()
        .exec();

      let floorData = await floorModel
        .findOne({ rooms: resData.room._id })
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
            rentedRoom: roomGroup["rented"] ? roomGroup["rented"].length : 0,
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

      await global.agendaInstance.agenda.schedule(
        moment()
          .add(7, "days")
          .endOf("day")
          .toDate(),
        "CheckOrderStatus",
        { orderId: orderData._id }
      );

      await global.agendaInstance.agenda.schedule(
        moment()
          .add(2, "minutes")
          .toDate(),
        "RemindUserRenewContractAndChangeStatusRoomBeforeOneMonth",
        { jobId: resData._id }
      );

      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /v1/homeKey/motelRoom/{id}/jobList:
   *   get:
   *     description: Get job list by owner
   *     tags: [MotelRoom]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         type: string
   *         description: floor id
   *       - name: keyword
   *         in: query
   *         type:  string
   *         description: Keyword to find job
   *       - name: sortBy
   *         in: query
   *         type:  string
   *         description: Sort By
   *         enum:
   *              - createdAt
   *              - updatedAt
   *       - name: sortType
   *         in: query
   *         type:  string
   *         description: Sort Type
   *         enum:
   *              - ascending
   *              - descending
   *       - name: size
   *         in: query
   *         description: Number of job returned
   *         type:  integer
   *         default: 20
   *       - name: page
   *         in: query
   *         default: 0
   *         description: Current page
   *         type:  integer
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

  static async getJobListByOwnerAndMotelId(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init user model`
      const { job: jobModel } = global.mongoModel;
      let { sortBy, role, size, page, keyword } = req.query;
      const sortType = req.query.sortType === "ascending" ? 1 : -1;
      let condition, sort;

      condition = [
        {
          $lookup: {
            from: "floors",
            localField: "room",
            foreignField: "rooms",
            as: "floor",
          },
        },
        { $unwind: { path: "$floor", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "motelRooms",
            localField: "floor._id",
            foreignField: "floors",
            as: "motelRoom",
          },
        },
        { $unwind: { path: "$motelRoom", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "images",
            localField: "images",
            foreignField: "_id",
            as: "images",
          },
        },
        {
          $lookup: {
            from: "orders",
            localField: "currentOrder",
            foreignField: "_id",
            as: "currentOrder",
          },
        },
        {
          $unwind: { path: "$currentOrder", preserveNullAndEmptyArrays: true },
        },
        {
          $lookup: {
            from: "rooms",
            localField: "room",
            foreignField: "_id",
            as: "room",
          },
        },
        { $unwind: { path: "$room", preserveNullAndEmptyArrays: true } },
        {
          $match: {
            motelRoom: { $exists: true },
            "motelRoom.owner": req["userId"],
            "motelRoom._id": mongoose.Types.ObjectId(req.params.id),
            isCompleted: true,
          },
        },
      ];

      if (sortBy && sortType) {
        switch (sortBy) {
          case "createdAt": {
            sort = { createdAt: sortType };
            break;
          }
          case "updatedAt": {
            sort = { updatedAt: sortType };
            break;
          }
        }
        condition.push({ $sort: sort });
      }

      let resData = await jobModel.paginate(size, page, condition);

      for (let i = 0; i < resData.data.length; i++) {
        delete resData.data[i].motelRoom;
        if (resData.data[i].images) {
          resData.data[i].images = helpers.getImageUrl(
            resData.data[i].images,
            true
          );
        }
      }

      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      next(e);
    }
  }
  static async getJobListByMotelId(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init user model`
      const { job: jobModel } = global.mongoModel;
      const { order: orderModel } = global.mongoModel;
      const { user: userModel } = global.mongoModel;
      let { sortBy, role, size, page, keyword, startDate, endDate } = req.query;
      const sortType = req.query.sortType === "ascending" ? 1 : -1;
      let condition, sort;

      condition = [
        {
          $lookup: {
            from: "floors",
            localField: "room",
            foreignField: "rooms",
            as: "floor",
          },
        },
        { $unwind: { path: "$floor", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "motelRooms",
            localField: "floor._id",
            foreignField: "floors",
            as: "motelRoom",
          },
        },
        { $unwind: { path: "$motelRoom", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "images",
            localField: "images",
            foreignField: "_id",
            as: "images",
          },
        },
        {
          $lookup: {
            from: "orders",
            localField: "currentOrder",
            foreignField: "_id",
            as: "currentOrder",
          },
        },
        {
          $unwind: { path: "$currentOrder", preserveNullAndEmptyArrays: true },
        },
        {
          $lookup: {
            from: "rooms",
            localField: "room",
            foreignField: "_id",
            as: "room",
          },
        },
        { $unwind: { path: "$room", preserveNullAndEmptyArrays: true } },
        {
          $match: {
            motelRoom: { $exists: true },
            // "motelRoom.owner": req["userId"],
            "motelRoom._id": mongoose.Types.ObjectId(req.params.id),
            isCompleted: true,
            createdAt: {
              $gte: new Date(startDate.toString()), // lớn hơn
              $lt: new Date(endDate.toString()), // nhỏ hơn
            },
          },
        },
      ];

      if (sortBy && sortType) {
        switch (sortBy) {
          case "createdAt": {
            sort = { createdAt: sortType };
            break;
          }
          case "updatedAt": {
            sort = { updatedAt: sortType };
            break;
          }
        }
        condition.push({ $sort: sort });
      }

      let resData = await jobModel.paginate(size, page, condition);

      for (let i = 0; i < resData.data.length; i++) {
        // delete resData.data[i].motelRoom;
        if (resData.data[i].images) {
          resData.data[i].images = helpers.getImageUrl(
            resData.data[i].images,
            true
          );
        }
        const arrTemp = [];
        for (let j = 0; j < resData.data[i].orders.length; j++) {
          const idOrder = resData.data[i].orders[j];
          const orderData = await orderModel
            .findOne({ _id: idOrder })
            .lean()
            .exec();
          arrTemp.push(orderData);
        }
        const userId = resData.data[i].user;
        let resProfile = await userModel
          .findOne({ _id: userId, isDeleted: false }, { password: 0, token: 0 })
          .populate("avatar identityCards backId frontId")
          .lean()
          .exec();

        resData.data[i].orderData = arrTemp;
        resData.data[i].user = resProfile;
      }

      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      next(e);
    }
  }
  static async getJobListByOwnerN(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init user model`
      const { job: jobModel } = global.mongoModel;
      const { order: orderModel } = global.mongoModel;
      const { user: userModel } = global.mongoModel;
      let { sortBy, role, size, page, keyword, startDate, endDate } = req.query;
      const sortType = req.query.sortType === "ascending" ? 1 : -1;
      let condition, sort;

      condition = [
        {
          $lookup: {
            from: "floors",
            localField: "room",
            foreignField: "rooms",
            as: "floor",
          },
        },
        { $unwind: { path: "$floor", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "motelRooms",
            localField: "floor._id",
            foreignField: "floors",
            as: "motelRoom",
          },
        },
        { $unwind: { path: "$motelRoom", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "images",
            localField: "images",
            foreignField: "_id",
            as: "images",
          },
        },
        {
          $lookup: {
            from: "orders",
            localField: "currentOrder",
            foreignField: "_id",
            as: "currentOrder",
          },
        },
        {
          $unwind: { path: "$currentOrder", preserveNullAndEmptyArrays: true },
        },
        {
          $lookup: {
            from: "rooms",
            localField: "room",
            foreignField: "_id",
            as: "room",
          },
        },
        { $unwind: { path: "$room", preserveNullAndEmptyArrays: true } },
        {
          $match: {
            motelRoom: { $exists: true },
            "motelRoom.owner": req["userId"],
            // "motelRoom._id": mongoose.Types.ObjectId(req.params.id),
            isCompleted: true,
            createdAt: {
              $gte: new Date(startDate.toString()), // lớn hơn
              $lt: new Date(endDate.toString()), // nhỏ hơn
            },
          },
        },
      ];

      if (sortBy && sortType) {
        switch (sortBy) {
          case "createdAt": {
            sort = { createdAt: sortType };
            break;
          }
          case "updatedAt": {
            sort = { updatedAt: sortType };
            break;
          }
        }
        condition.push({ $sort: sort });
      }

      let resData = await jobModel.paginate(size, page, condition);

      for (let i = 0; i < resData.data.length; i++) {
        // delete resData.data[i].motelRoom;
        if (resData.data[i].images) {
          resData.data[i].images = helpers.getImageUrl(
            resData.data[i].images,
            true
          );
        }
        const arrTemp = [];
        for (let j = 0; j < resData.data[i].orders.length; j++) {
          const idOrder = resData.data[i].orders[j];
          const orderData = await orderModel
            .findOne({ _id: idOrder })
            .lean()
            .exec();
          arrTemp.push(orderData);
        }
        const userId = resData.data[i].user;
        let resProfile = await userModel
          .findOne({ _id: userId, isDeleted: false }, { password: 0, token: 0 })
          .populate("avatar identityCards backId frontId")
          .lean()
          .exec();

        resData.data[i].orderData = arrTemp;
        resData.data[i].user = resProfile;
      }

      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      next(e);
    }
  }

  static async getJobListByOwner(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init user model`
      const { job: jobModel } = global.mongoModel;
      const { order: orderModel } = global.mongoModel;
      let { sortBy, role, size, page, keyword } = req.query;
      const sortType = req.query.sortType === "ascending" ? 1 : -1;
      let condition, sort;

      condition = [
        {
          $lookup: {
            from: "floors",
            localField: "room",
            foreignField: "rooms",
            as: "floor",
          },
        },
        { $unwind: { path: "$floor", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "motelRooms",
            localField: "floor._id",
            foreignField: "floors",
            as: "motelRoom",
          },
        },
        { $unwind: { path: "$motelRoom", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "images",
            localField: "images",
            foreignField: "_id",
            as: "images",
          },
        },
        {
          $lookup: {
            from: "orders",
            localField: "currentOrder",
            foreignField: "_id",
            as: "currentOrder",
          },
        },
        {
          $unwind: { path: "$currentOrder", preserveNullAndEmptyArrays: true },
        },
        {
          $lookup: {
            from: "rooms",
            localField: "room",
            foreignField: "_id",
            as: "room",
          },
        },
        { $unwind: { path: "$room", preserveNullAndEmptyArrays: true } },
        {
          $match: {
            motelRoom: { $exists: true },
            "motelRoom.owner": req["userId"],
            // "motelRoom._id": mongoose.Types.ObjectId(req.params.id),
            isCompleted: true,
          },
        },
      ];

      if (sortBy && sortType) {
        switch (sortBy) {
          case "createdAt": {
            sort = { createdAt: sortType };
            break;
          }
          case "updatedAt": {
            sort = { updatedAt: sortType };
            break;
          }
        }
        condition.push({ $sort: sort });
      }

      let resData = await jobModel.paginate(size, page, condition);

      for (let i = 0; i < resData.data.length; i++) {
        delete resData.data[i].motelRoom;
        if (resData.data[i].images) {
          resData.data[i].images = helpers.getImageUrl(
            resData.data[i].images,
            true
          );
        }
        const arrTemp = [];
        for (let j = 0; j < resData.data[i].orders.length; j++) {
          const idOrder = resData.data[i].orders[j];
          const orderData = await orderModel
            .findOne({ _id: idOrder })
            .lean()
            .exec();
          arrTemp.push(orderData);
        }
        resData.data[i].orderData = arrTemp;
      }

      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      next(e);
    }
  }
  static async getJobListAll(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init user model`
      const { job: jobModel } = global.mongoModel;
      let { sortBy, role, size, page, keyword, dateStart, dateEnd } = req.query;
      const sortType = req.query.sortType === "ascending" ? 1 : -1;
      let condition, sort;

      const dateStartString = moment(
        dateStart.toString(),
        "YYYY-MM-DD"
      ).toDate();
      const dateEndString = moment(dateEnd.toString(), "YYYY-MM-DD").toDate();

      condition = [
        {
          $lookup: {
            from: "floors",
            localField: "room",
            foreignField: "rooms",
            as: "floor",
          },
        },
        { $unwind: { path: "$floor", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "motelRooms",
            localField: "floor._id",
            foreignField: "floors",
            as: "motelRoom",
          },
        },
        { $unwind: { path: "$motelRoom", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "images",
            localField: "images",
            foreignField: "_id",
            as: "images",
          },
        },
        {
          $lookup: {
            from: "orders",
            localField: "currentOrder",
            foreignField: "_id",
            as: "currentOrder",
          },
        },
        {
          $unwind: { path: "$currentOrder", preserveNullAndEmptyArrays: true },
        },
        {
          $lookup: {
            from: "rooms",
            localField: "room",
            foreignField: "_id",
            as: "room",
          },
        },
        { $unwind: { path: "$room", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "motelRooms",
            localField: "motelRooms",
            foreignField: "motelRoom._id",
            as: "motelRooms",
          },
        },
        {
          $match: {
            motelRoom: { $exists: true },
            // "motelRoom.owner": req.params.id,
            // "motelRoom._id": mongoose.Types.ObjectId(req.params.id),
            isCompleted: true,
            createdAt: {
              $gte: dateStartString, // lớn hơn
              $lt: dateEndString, // nhỏ hơn
            },
          },
        },
      ];

      if (sortBy && sortType) {
        switch (sortBy) {
          case "createdAt": {
            sort = { createdAt: sortType };
            break;
          }
          case "updatedAt": {
            sort = { updatedAt: sortType };
            break;
          }
        }
        condition.push({ $sort: sort });
      }

      let resData = await jobModel.paginate(size, page, condition);

      for (let i = 0; i < resData.data.length; i++) {
        delete resData.data[i].motelRoom;
        if (resData.data[i].images) {
          resData.data[i].images = helpers.getImageUrl(
            resData.data[i].images,
            true
          );
        }
      }

      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /v1/homeKey/room/{id}/job:
   *   get:
   *     description: Return job by roomid
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

  static async getJobByRoomId(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      //Init models
      const { job: jobModel } = global.mongoModel;

      let resData = await RoomController.getRoomById(req.params.id);

      if (resData && resData.error) {
        return HttpResponse.returnBadRequestResponse(
          res,
          resData.errors[0].errorMessage
        );
      }

      const jobData = await jobModel
        .findOne({ room: resData._id })
        .lean()
        .exec();

      if (!jobData) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "phòng đặt không tồn tại"
        );
      }

      resData = await JobController.getJob(jobData._id);

      if (resData && resData.error) {
        return HttpResponse.returnBadRequestResponse(
          res,
          resData.errors[0].errorMessage
        );
      }

      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /v1/homeKey/job/{id}/updateReturnRoomDate:
   *   put:
   *     description: Upload Image For Job
   *     tags: [Job]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: id
   *         in: path
   *         required:  true
   *         type: string
   *         description: jobId
   *       - name: returnRoomDate
   *         in: formData
   *         required:  true
   *         type: string
   *         description: MM/DD/YYYY
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

  static async updateReturnRoomDate(
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

      let resData = await JobController.getJob(req.params.id, {
        user: mongoose.Types.ObjectId(req["userId"]),
      });

      if (resData && resData.error) {
        return HttpResponse.returnBadRequestResponse(
          res,
          resData.errors[0].errorMessage
        );
      }

      if (
        resData.isUpdatedReturnRoomDate &&
        moment().isSameOrAfter(moment(resData.returnRoomDate))
      ) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "phòng đặt không cập nhật được thời gian"
        );
      }

      resData = await JobController.updateJob(req.params.id, {
        returnRoomDate: moment(req.body.returnRoomDate),
        isUpdatedReturnRoomDate: true,
      });

      await roomModel
        .findOneAndUpdate(
          { _id: resData.room._id },
          { availableDate: moment(req.body.returnRoomDate).add(1, "days") }
        )
        .exec();

      await global.agendaInstance.agenda.cancel({
        name: "ChangeRoomStatus",
        "data.jobId": resData.room._id,
      });
      await global.agendaInstance.agenda.schedule(
        moment(req.body.returnRoomDate)
          .startOf("day")
          .toDate(),
        "ChangeRoomStatus",
        {
          jobId: resData.room._id,
          type: "changeStatus",
          status: "available",
        }
      );

      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      next(e);
    }
  }

  //new
  static async getJobByRoom(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    const { job: jobModel } = global.mongoModel;
    try {
      const idRoom = req.params.idRoom;
      console.log({ idRoom });

      const resData = await jobModel.find({
        room: mongoose.Types.ObjectId(idRoom),
      });

      console.log({ resData });

      // if (resData && resData.error) {
      //   return HttpResponse.returnBadRequestResponse(
      //     res,
      //     resData.errors[0].errorMessage
      //   );
      // }
      // const resData = "hihi";
      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      next(e);
    }
  }

  static async renewContract(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const id = req.params.idJob;

      const numberMon = req.body.numberMon;

      const numberAddRenew: number = parseInt(numberMon, 10);

      const { job: jobModel } = global.mongoModel;

      const dataJob = await jobModel
        .findOne({ _id: id })
        .lean()
        .exec();

      if (dataJob) {
        if (numberMon && dataJob.rentalPeriod && dataJob.checkInTime) {
          const checkInTime = dataJob.checkInTime;

          const currentRentalPeriod: number = dataJob.rentalPeriod;

          const today: Date = new Date();
          const checkInTimeTemp: Date = new Date(checkInTime);
          checkInTimeTemp.setMonth(
            checkInTime.getMonth() + currentRentalPeriod
          );

          console.log({ today });
          console.log({ checkInTimeTemp });

          const subTime: number = checkInTimeTemp.getTime() - today.getTime();

          const oneDayInMs: number = 1000 * 60 * 60 * 24;
          const timeDiffInDays: number = subTime / oneDayInMs;

          console.log({ timeDiffInDays });

          if (timeDiffInDays > 15) {
            const renewedMon = currentRentalPeriod + numberAddRenew;
            const result = await jobModel.findOneAndUpdate(
              { _id: id },
              {
                rentalPeriod: renewedMon,
              }
            );

            //update job check
            const jobs = await global.agendaInstance.agenda.jobs({
              name: "RemindUserRenewContractAndChangeStatusRoomBeforeOneMonth",
              "data.jobId": dataJob._id,
              nextRunAt: { $ne: null },
            });

            if(jobs.length > 0) {
              // task check chưa chạy
              const job = jobs[0];
              job.schedule(
                moment()
                  .add(1, "minutes")
                  .toDate()
              );
              await job.save();
            } else {
              // task check đã chạy, tạo job mới
              await global.agendaInstance.agenda.schedule(
                moment().add(2, "minutes").toDate(),
                "RemindUserRenewContractAndChangeStatusRoomBeforeOneMonth",
                { jobId: dataJob._id }
              );
            }

            const resData = "Gia hạn hợp đồng thành công!";

            return HttpResponse.returnSuccessResponse(res, resData);
          } else {
            return HttpResponse.returnBadRequestResponse(
              res,
              "Đã hết thời gian gia hạn hợp đồng!"
            );
          }
        } else {
          return HttpResponse.returnBadRequestResponse(
            res,
            "Không tìm thấy job hoặc không có số tháng gia hạn hoặc không có checkInTime"
          );
        }
      } else {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Không tìm thấy job!"
        );
      }
    } catch (e) {
      console.log({ e });
      next(e);
    }
  }

  //Đặt lại trạng thái phòng sau 7 ngày cọc mà không đóng tiền ở
  static async setStatusRoomAuto(
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

      // Hủy cọc sau 7 ngày
      const dayCancelDeposited: Date = new Date();
      console.log({ dayCancelDeposited });

      dayCancelDeposited.setDate(dayCancelDeposited.getDate() - 7);
      const tempDay = dayCancelDeposited.toISOString().split("T")[0];
      console.log("day - 7: ", tempDay);

      const startDayQuery = new Date(tempDay);
      console.log({ startDayQuery });

      const endDayQuery = new Date(tempDay);
      endDayQuery.setHours(30, 59, 59, 59.99);
      console.log({ endDayQuery });

      const motelInfor = await roomModel.find({
        status: "deposited",
      });
      console.log({ motelInfor });

      if (motelInfor.length !== 0) {
        let listJobEpireDeposit = [];
        for (let i = 0; i < motelInfor.length; i++) {
          const jobByRoom = await jobModel.findOne({
            room: motelInfor[i]._id,
            checkInTime: {
              // $gte: startDayQuery,
              $lte: startDayQuery,
            },
          });
          if (jobByRoom) {
            listJobEpireDeposit.push(jobByRoom);
          }
        }

        console.log("listJobEpireDeposit", listJobEpireDeposit);
        console.log("listJobEpireDeposit", listJobEpireDeposit.length);

        if (listJobEpireDeposit.length !== 0) {
          for (let i = 0; i < listJobEpireDeposit.length; i++) {
            // Cập nhật cả motel, floor, xóa job

            const jobData = await JobController.getJobNoImg(
              listJobEpireDeposit[i]._id
            );

            //xóa job
            let resData = await jobModel
              .remove({ _id: listJobEpireDeposit[i]._id })
              .lean()
              .exec();

            //xóa order
            await orderModel.remove({ _id: { $in: jobData.orders } }).exec();

            //Cập nhật trạng thái phòng, xóa người thuê

            const roomInfor = await roomModel
              .findOne({ _id: listJobEpireDeposit[i].room })
              .lean()
              .exec();
            const userId = roomInfor.rentedBy;

            await roomModel
              .findOneAndUpdate(
                { _id: listJobEpireDeposit[i].room },
                {
                  status: "available",
                  $unset: { rentedBy: 1 },
                }
              )
              .exec();

            //cập nhật lại floor
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

            //cập nhật lại motel

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

            //Xóa job khỏi user
            let userUpdateData = {
              $pull: {
                jobs: jobData._id,
              },
            };

            await userModel
              .findOneAndUpdate({ _id: userId }, userUpdateData, { new: true })
              .exec();
          }
        } else {
          console.log("Hiện tại chưa có phòng nào quá hạn cọc giữ phòng!");
        }
      } else {
        console.log("Hiện không có phòng nào được cọc!");
      }

      // const a = await jobModel.findOne({orders: "6618fb6a728f253570ba575c"}).lean().exec();
      // console.log("aaaaaaaaaaa", a);
      // console.log(a.checkInTime);
      // console.log(a.checkInTime.setMonth(a.checkInTime.getMonth() + 3));
      // console.log(a.checkInTime);
      // console.log(a.checkInTime.getMonth() + 1);
      // console.log(a.checkInTime.getFullYear());
      // console.log(typeof(a.checkInTime.getFullYear()));
      // console.log(moment().year());
      // console.log(typeof(moment().year()));
      // console.log(moment().month());
      // console.log(a.checkInTime.getDate());
      // console.log(moment().date());
      // console.log(typeof(moment().date()));

      const jobData = await JobController.getJobNoImg(
        "661e2d3ccf1e78abdc2e3a5e"
      );

      const checkInDay = jobData.checkInTime;

      console.log({ checkInDay });

      const rentalPeriod = jobData.rentalPeriod;
      const checkOutDay = new Date(checkInDay);
      checkOutDay.setMonth(checkOutDay.getMonth() + rentalPeriod);
      console.log("Day check out:", checkOutDay.getDate());
      console.log("Day check out:", typeof checkOutDay.getDate());

      const parsedTime = moment(checkOutDay).format("DD/MM/YYYY");

      console.log({ parsedTime });

      checkOutDay.setDate(checkOutDay.getDate() + 3);

      console.log("checkout + 3: ", checkOutDay);
      console.log("checkout + 3: ", new Date(checkOutDay));
      console.log(new Date());

      // const a = 1;
      // await global.agendaInstance.agenda.schedule(
      //   moment().add(a, "minutes").toDate(),
      //   "Test1",
      //   {idOrder: 5}
      // );
      await global.agendaInstance.agenda.schedule(new Date(), "Test1", {
        idOrder: 9,
      });

      const resData = "hihih";

      return HttpResponse.returnSuccessResponse(res, resData);
      "";
    } catch (e) {
      console.log({ e });
      next(e);
    }
  }

  static async remindUserRenewContract(
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

      const dayCancelDeposited = new Date();

      // dayCancelDeposited.setMonth(dayCancelDeposited.getMonth() - 1);
      // dayCancelDeposited.setHours(7, 0, 0, 0);  // cần xem lại để nó về 0h00p
      console.log({ dayCancelDeposited });

      const currentDay = new Date();
      // currentDay.setHours(7, 0, 0, 0);
      console.log({ currentDay });

      const listJobAbleExpire = await jobModel.find({
        checkInTime: {
          $lte: dayCancelDeposited,
        },
      });
      const listJobAbleExpireLength: number = listJobAbleExpire.length;
      if (listJobAbleExpireLength !== 0) {
        let listJobExpireBeforeMon = [];
        for (let i = 0; i < listJobAbleExpireLength; i++) {
          const checkInTime = listJobAbleExpire[i].checkInTime;
          console.log("tiiii", checkInTime);
          checkInTime.setMonth(
            checkInTime.getMonth() + listJobAbleExpire[i].rentalPeriod - 1
          );

          console.log("iii", checkInTime);

          // ở đây điều kiện đang là nhắc nhở hằng ngày cho đến khi hết hợp đồng trong 1 tháng
          if (checkInTime <= currentDay) {
            const idRoomInJob = listJobAbleExpire[i].room;

            const roomInforOfJob = await roomModel
              .findOne({ _id: idRoomInJob })
              .lean()
              .exec();

            if (roomInforOfJob) {
              if (roomInforOfJob.status === "rented") {
                listJobExpireBeforeMon.push(listJobAbleExpire[i]);
              }
            }
          }
        }
        console.log("listJobAbleExpireMon", listJobExpireBeforeMon);

        const listJobExpireBeforeMonLength = listJobExpireBeforeMon.length;
        for (let i = 0; i < listJobExpireBeforeMonLength; i++) {
          if (
            listJobExpireBeforeMon[i].room &&
            listJobExpireBeforeMon[i].user
          ) {
            //Gửi mail nhắc nhở
            const userInfor = await userModel
              .findOne({ _id: listJobExpireBeforeMon[i].user })
              .lean()
              .exec();

            const jobData = await JobController.getJobNoImg(
              listJobExpireBeforeMon[i]._id
            );

            console.log("jobData", jobData);

            if (userInfor.email) {
              //send mail
              const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                  user: "cr7ronadol12345@gmail.com",
                  pass: "wley oiaw yhpl oupy",
                },
              });

              // const files = ['a.txt', 'b.pdf', 'c.png'];
              const checkInDay = jobData.checkInTime;
              const rentalPeriod = jobData.rentalPeriod;
              const checkOutDay = new Date(checkInDay);
              checkOutDay.setMonth(checkOutDay.getMonth() + rentalPeriod);

              const parsedTime = moment(checkOutDay).format("DD/MM/YYYY");
              // checkOutDay.toISOString().split('T')[0]

              const mailOptions = {
                from: "cr7ronadol12345@gmail.com",
                // to: 'quyetthangmarvel@gmail.com',
                to: userInfor.email,
                subject: `[${jobData.room.name}] THÔNG BÁO GIA HẠN HỢP ĐỒNG TRỌ`,
                text: `Phòng ${jobData.room.name} thuộc dãy ${jobData.motelRoom.name} của quý khách sẽ hết hợp đồng vào ${parsedTime}. Vui lòng truy cập trang web: http://homeslands.net:3006/ thực hiện đăng nhập rồi vào đường dẫn http://homeslands.net:3006/job-detail/${listJobExpireBeforeMon[i]._id} để gian hạn hợp đồng.`,
                // attachments: files.map(file => ({
                //     filename: file,
                //     // path: filePath
                // }))
              };

              // Gửi email
              transporter.sendMail(mailOptions, function(error, info) {
                if (error) {
                  console.error(error);
                } else {
                  console.log("Email đã được gửi: " + info.response);
                }
              });

              console.log(`Gửi tới mail: ${userInfor.email}`);
            } else {
              console.log(
                `User id: ${listJobExpireBeforeMon[i].user} không được tìm thấy hoặc chưa cập nhật email`
              );
            }

            // Đổi trạng thái phòng thành: soonExpireContract
            await roomModel.findOneAndUpdate(
              { _id: listJobExpireBeforeMon[i].room },
              {
                status: "soonExpireContract",
              }
            );

            // Cập nhật lại  room, floor số lượng: thêm trường => cần xem xét

            // //cập nhật lại floor
            // let floorData = await floorModel
            //   .findOne({ rooms: jobData.room._id })
            //   .populate("rooms")
            //   .lean()
            //   .exec();
            // const roomGroup = lodash.groupBy(floorData.rooms, (room) => {
            //   return room.status;
            // });

            // await floorModel
            //   .findOneAndUpdate(
            //     { _id: floorData._id },
            //     {
            //       availableRoom: roomGroup["available"]
            //         ? roomGroup["available"].length
            //         : 0,
            //       rentedRoom: roomGroup["rented"] ? roomGroup["rented"].length : 0,
            //       depositedRoom: roomGroup["deposited"]
            //         ? roomGroup["deposited"].length
            //         : 0,
            //     }
            //   )
            //   .exec();

            // // //cập nhật lại motel

            // let motelRoomData = await motelRoomModel
            //   .findOne({ floors: floorData._id })
            //   .populate("floors")
            //   .lean()
            //   .exec();

            // let updateData = {
            //   availableRoom: lodash.sumBy(motelRoomData.floors, "availableRoom"),
            //   rentedRoom: lodash.sumBy(motelRoomData.floors, "rentedRoom"),
            //   depositedRoom: lodash.sumBy(motelRoomData.floors, "depositedRoom"),
            // };

            // await motelRoomModel
            //   .findOneAndUpdate({ _id: motelRoomData._id }, updateData)
            //   .exec();
          } else {
            console.log("Job không chứa room hoặc user");
          }
        }
      }
      const resData = "success";
      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      console.log({ e });
      next(e);
    }
  }

  static async autoSetAvailableRoom(
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

      const dayExpireContract = new Date();
      console.log({ dayExpireContract });

      const currentDay = new Date();
      const tempDay = new Date();
      const currentDayString = tempDay.toISOString().split("T")[0];
      console.log({ currentDayString });
      console.log("type currentDayString", typeof currentDayString);

      const listJobAbleExpire = await jobModel.find({
        checkInTime: {
          $lte: dayExpireContract,
        },
      });
      const listJobAbleExpireLength: number = listJobAbleExpire.length;
      if (listJobAbleExpireLength !== 0) {
        let listJobExpire = [];
        for (let i = 0; i < listJobAbleExpireLength; i++) {
          const checkInTimeExpire = listJobAbleExpire[i].checkInTime;

          const checkOutTime = new Date(checkInTimeExpire);

          checkOutTime.setMonth(
            checkOutTime.getMonth() + listJobAbleExpire[i].rentalPeriod
          ); // thành checkout time

          // const checkOutTimeString = checkOutTime.toISOString().split('T')[0];

          // console.log({checkOutTimeString});
          // console.log("type checkOutTimeString", typeof(checkOutTimeString));

          console.log({ checkOutTime });

          if (checkOutTime <= currentDay) {
            console.log("xxxxxxxxxx");
            listJobExpire.push(listJobAbleExpire[i]);
          }
        }
        console.log({ currentDay });
        console.log("listJobExpire", listJobExpire);

        const listJobExpireLength = listJobExpire.length;
        for (let i = 0; i < listJobExpireLength; i++) {
          if (listJobExpire[i].room && listJobExpire[i].user) {
            //Gửi mail thông báo
            const userInfor = await userModel
              .findOne({ _id: listJobExpire[i].user })
              .lean()
              .exec();
            if (userInfor.email) {
              //gửi mail thông báo hết hạn thuê phòng
              console.log(`Gửi tới mail: ${userInfor.email}`);
            } else {
              console.log(
                `User id: ${listJobExpire[i].user} không được tìm thấy hoặc chưa cập nhật email`
              );
            }

            //xóa job
            const jobData = await JobController.getJobNoImg(
              listJobExpire[i]._id
            );

            let resData = await jobModel
              .remove({ _id: listJobExpire[i]._id })
              .lean()
              .exec();

            //xóa order
            await orderModel.remove({ _id: { $in: jobData.orders } }).exec();

            //Cập nhật trạng thái phòng, xóa người thuê

            const roomInfor = await roomModel
              .findOne({ _id: listJobExpire[i].room })
              .lean()
              .exec();
            const userId = roomInfor.rentedBy;

            await roomModel
              .findOneAndUpdate(
                { _id: listJobExpire[i].room },
                {
                  status: "available",
                  $unset: { rentedBy: 1 },
                }
              )
              .exec();

            //cập nhật lại floor
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

            //cập nhật lại motel

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

            //Xóa job khỏi user
            let userUpdateData = {
              $pull: {
                jobs: jobData._id,
              },
            };

            await userModel
              .findOneAndUpdate({ _id: userId }, userUpdateData, { new: true })
              .exec();
          } else {
            console.log("Job không chứa room hoặc user");
          }
        }
      }
      const resData = "haha";
      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      console.log({ e });
      next(e);
    }
  }
  static async sendMailRemindMonthlyPayment(
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

      const dayExpireContract = new Date();
      console.log({ dayExpireContract });

      const currentDay = new Date();

      const listJobMonthlyPayment = await jobModel.find({
        isDeleted: false,
        status: "pendingMonthlyPayment",
        // checkInTime: {
        //   $lte : dayExpireContract
        // }
      });

      console.log({ listJobMonthlyPayment });
      console.log("listJobMonthlyPayment length", listJobMonthlyPayment.length);

      const listJobMonthlyPaymentLength = listJobMonthlyPayment.length;

      for (let i = 0; i < listJobMonthlyPaymentLength; i++) {
        if (listJobMonthlyPayment[i].user && listJobMonthlyPayment[i].room) {
          const userInfor = await userModel
            .findOne({ _id: listJobMonthlyPayment[i].user })
            .lean()
            .exec();
          const roomInfor = await roomModel
            .findOne({ _id: listJobMonthlyPayment[i].room })
            .lean()
            .exec();

          if (userInfor.email && roomInfor.name) {
            const transporter = nodemailer.createTransport({
              service: "gmail",
              auth: {
                user: "cr7ronadol12345@gmail.com",
                pass: "wley oiaw yhpl oupy",
              },
            });

            const nowDay = new Date();
            const nowMon = nowDay.getMonth() + 1;

            let dayExpire = 15;

            const checkInDay = new Date(listJobMonthlyPayment[i].checkInTime);

            if (checkInDay.getDate() <= 15) {
              dayExpire = checkInDay.getDate();
            }
            console.log({ dayExpire });

            // const mailOptions = {
            //     from: 'cr7ronadol12345@gmail.com',
            //     // to: 'quyetthangmarvel@gmail.com',
            //     to: userInfor.email,
            //     subject: `[${jobData.room.name}] THÔNG BÁO ĐÓNG TIỀN PHÒNG`,
            //     text: `Phòng ${jobData.room.name} thuộc dãy ${jobData.motelRoom.name} đã đến thời gian thanh toán tiền phòng tháng này. Vui lòng truy cập trang web: http://homeslands.net:3006/ thực hiện đăng nhập rồi vào đường dẫn http://homeslands.net:3006/job-detail/${listJobExpireBeforeMon[i]._id} để gian hạn hợp đồng.`,
            // };

            // // Gửi email
            // transporter.sendMail(mailOptions, function (error, info) {
            //     if (error) {
            //         console.error(error);
            //     } else {
            //         console.log('Email đã được gửi: ' + info.response);
            //     }
            // });
          }
        }
      }

      const resData = "haha";
      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      console.log({ e });
      next(e);
    }
  }

  static async deleteJobByIdRoom(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init models

      const idRoom = req.params.id;
      const {
        room: roomModel,
        floor: floorModel,
        motelRoom: motelRoomModel,
        job: jobModel,
        user: userModel,
        order: orderModel,
      } = global.mongoModel;

      const roomInfor = await roomModel
        .findOne({ _id: idRoom })
        .lean()
        .exec();
      console.log("roomInfor", roomInfor);
      const idUserRented = roomInfor.rentedBy;

      const jobInfor = await jobModel.findOne({
        room: idRoom,
        user: idUserRented,
        isDeleted: false,
      });

      if (roomInfor.rentedBy) {
        const jobData = await JobController.getJob(jobInfor._id, {
          user: mongoose.Types.ObjectId(roomInfor.rentedBy),
        });

        if (jobData && jobData.error) {
          return HttpResponse.returnBadRequestResponse(
            res,
            jobData.errors[0].errorMessage
          );
        }

        await NotificationController.createNotification({
          title: "Xác nhận hủy cọc",
          content: "Bạn đã hủy cọc phòng thành công",
          user: idUserRented,
          isRead: false,
        });

        console.log("jobInfor xbaab: ", jobInfor);
        let resData = await jobModel
          .findOneAndUpdate({ _id: jobInfor._id }, { isDeleted: true })
          .lean()
          .exec();

        // let resData = await jobModel
        //   .remove({ _id: jobInfor._id })
        //   .lean()
        //   .exec();

        // await orderModel.remove({ _id: { $in: jobData.orders } }).exec();

        await roomModel
          .findOneAndUpdate(
            { _id: jobData.room },
            {
              status: "available",
              $unset: { rentedBy: 1 },
            }
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
        // console.log({roomGroup});
        // console.log("roomGroup available", roomGroup["available"]);//list các phòng available
        // console.log("roomGroup rented", roomGroup["rented"]);
        // console.log("roomGroup deposit", roomGroup["deposit"]);

        await floorModel
          .findOneAndUpdate(
            { _id: floorData._id },
            {
              availableRoom: roomGroup["available"]
                ? roomGroup["available"].length
                : 0,
              soonExpireContractRoom: roomGroup["soonExpireContract"]
                ? roomGroup["soonExpireContract"].length
                : 0,
              rentedRoom: roomGroup["rented"] ? roomGroup["rented"].length : 0,
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
          soonExpireContractRoom: lodash.sumBy(
            motelRoomData.floors,
            "soonExpireContractRoom"
          ),
        };

        await motelRoomModel
          .findOneAndUpdate({ _id: motelRoomData._id }, updateData)
          .exec();

        let userUpdateData = {
          $pull: {
            jobs: jobData._id,
          },
        };

        // if (
        //   req["userProfile"].phoneNumber.number ===
        //   helpers.stripeZeroOut(jobData.phoneNumber)
        // ) {
        //   userUpdateData["$unset"] = { room: 1, currentJob: 1 };
        // }
        userUpdateData["$unset"] = { room: 1, currentJob: 1 };

        await userModel
          .findOneAndUpdate({ _id: idUserRented }, userUpdateData, {
            new: true,
          })
          .exec();
      } else {
        const badData = "Room have not rented";
        return HttpResponse.returnBadRequestResponse(res, badData);
      }

      const resData = "Change status room success";
      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      next(e);
    }
  }

  static async deleteJobOnlyInUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init models

      const idRoom = req.params.id;
      const {
        room: roomModel,
        floor: floorModel,
        motelRoom: motelRoomModel,
        job: jobModel,
        user: userModel,
        order: orderModel,
      } = global.mongoModel;

      const roomInfor = await roomModel
        .findOne({ _id: idRoom })
        .lean()
        .exec();
      console.log("roomInfor", roomInfor);
      const idUserRented = roomInfor.rentedBy;

      const jobInfor = await jobModel.findOne({
        room: idRoom,
        user: idUserRented,
      });

      console.log({ jobInfor });

      if (roomInfor.rentedBy) {
        const jobData = await JobController.getJob(jobInfor._id, {
          user: mongoose.Types.ObjectId(roomInfor.rentedBy),
        });

        if (jobData && jobData.error) {
          return HttpResponse.returnBadRequestResponse(
            res,
            jobData.errors[0].errorMessage
          );
        }

        await NotificationController.createNotification({
          title: "Xác nhận hủy cọc",
          content: "Bạn đã hủy cọc phòng thành công",
          user: idUserRented,
          isRead: false,
        });

        let resData = await jobModel.findOneAndUpdate(
          { _id: jobInfor._id },
          { isDeleted: true }
        );

        // let resData = await jobModel
        //   .remove({ _id: jobInfor._id })
        //   .lean()
        //   .exec();

        // await orderModel.remove({ _id: { $in: jobData.orders } }).exec();

        await roomModel
          .findOneAndUpdate(
            { _id: jobData.room },
            {
              status: "available",
              $unset: { rentedBy: 1 },
            }
          )
          .exec();

        // let floorData = await floorModel
        //   .findOne({ rooms: jobData.room._id })
        //   .populate("rooms")
        //   .lean()
        //   .exec();
        // const roomGroup = lodash.groupBy(floorData.rooms, (room) => {
        //   return room.status;
        // });

        // await floorModel
        //   .findOneAndUpdate(
        //     { _id: floorData._id },
        //     {
        //       availableRoom: roomGroup["available"]
        //         ? roomGroup["available"].length
        //         : 0,
        //       rentedRoom: roomGroup["rented"] ? roomGroup["rented"].length : 0,
        //       depositedRoom: roomGroup["deposited"]
        //         ? roomGroup["deposited"].length
        //         : 0,
        //     }
        //   )
        //   .exec();

        // let motelRoomData = await motelRoomModel
        //   .findOne({ floors: floorData._id })
        //   .populate("floors")
        //   .lean()
        //   .exec();

        // let updateData = {
        //   availableRoom: lodash.sumBy(motelRoomData.floors, "availableRoom"),
        //   rentedRoom: lodash.sumBy(motelRoomData.floors, "rentedRoom"),
        //   depositedRoom: lodash.sumBy(motelRoomData.floors, "depositedRoom"),
        // };

        // await motelRoomModel
        //   .findOneAndUpdate({ _id: motelRoomData._id }, updateData)
        //   .exec();

        let userUpdateData = {
          $pull: {
            jobs: jobData._id,
          },
        };

        // if (
        //   req["userProfile"].phoneNumber.number ===
        //   helpers.stripeZeroOut(jobData.phoneNumber)
        // ) {
        //   userUpdateData["$unset"] = { room: 1, currentJob: 1 };
        // }
        userUpdateData["$unset"] = { room: 1, currentJob: 1 };

        await userModel
          .findOneAndUpdate({ _id: idUserRented }, userUpdateData, {
            new: true,
          })
          .exec();
      } else {
        const badData = "Room have not rented";
        return HttpResponse.returnBadRequestResponse(res, badData);
      }

      const resData = "Change status room success";
      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      next(e);
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                            START HELPER FUNCTION                           */
  /* -------------------------------------------------------------------------- */

  // Get job by id
  static async getJob(jobId: any, condition?: any): Promise<any> {
    // Init models
    const {
      room: roomModel,
      job: jobModel,
      floor: floorModel,
      motelRoom: motelRoomModel,
      user: userModel,
    } = global.mongoModel;

    let resData = await jobModel
      .findOne({ _id: jobId, ...condition })
      .populate("room orders order images currentOrder")
      .lean()
      .exec();

    if (!resData) {
      return HttpResponse.returnErrorWithMessage("job.not.exist");
    }

    let userData = await userModel
      .findOne({ _id: resData.user._id })
      .lean()
      .exec();
    if (userData) {
      const userRes = {
        _id: userData._id,
        name: `${userData.lastName} ${userData.firstName}`,
      };

      resData["user"] = userRes;
    }

    const floorData = await floorModel
      .findOne({ rooms: resData.room._id })
      .lean()
      .exec();

    const motelRoomData = await motelRoomModel
      .findOne({ floors: floorData._id })
      .lean()
      .exec();

    resData["motelRoom"] = motelRoomData;

    if (resData.images) {
      resData.images = await helpers.getImageUrl(resData.images, true);
    }

    helpers.changeTimeZone(resData);

    return resData;
  }

  static async getJobNoImg(jobId: any, condition?: any): Promise<any> {
    // Init models
    const {
      room: roomModel,
      job: jobModel,
      floor: floorModel,
      motelRoom: motelRoomModel,
      user: userModel,
    } = global.mongoModel;

    let resData = await jobModel
      .findOne({ _id: jobId, ...condition })
      .populate("room orders order images currentOrder")
      .lean()
      .exec();

    if (!resData) {
      return HttpResponse.returnErrorWithMessage("job.not.exist");
    }

    let userData = await userModel
      .findOne({ _id: resData.user._id })
      .lean()
      .exec();
    if (userData) {
      const userRes = {
        _id: userData._id,
        name: `${userData.lastName} ${userData.firstName}`,
      };

      resData["user"] = userRes;
    }

    const floorData = await floorModel
      .findOne({ rooms: resData.room._id })
      .lean()
      .exec();

    const motelRoomData = await motelRoomModel
      .findOne({ floors: floorData._id })
      .lean()
      .exec();

    resData["motelRoom"] = motelRoomData;

    // helpers.changeTimeZone(resData);

    return resData;
  }

  // Update job by id
  static async updateJob(jobId: any, data: any): Promise<any> {
    // Init models
    const { job: jobModel } = global.mongoModel;

    // Update job data
    await jobModel
      .findOneAndUpdate({ _id: jobId }, data)
      .populate("room orders order images")
      .lean()
      .exec();

    return JobController.getJob(jobId);
  }

  static async uploadImageForJobProfile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const data = req.body;

      let resData = await JobController.getJob(req.params.id, {
        user: mongoose.Types.ObjectId(req["userId"]),
      });

      if (resData && resData.error) {
        return HttpResponse.returnBadRequestResponse(
          res,
          resData.errors[0].errorMessage
        );
      }

      if (!resData.isCompleted) {
        return HttpResponse.returnBadRequestResponse(res, "Chưa hoàn thành");
      }
      const { image: imageModel } = global.mongoModel;

      const { job: jobModel } = global.mongoModel;
      const { user: userModel } = global.mongoModel;

      let rs = null;

      let resProfile = await userModel
        .findOne(
          { _id: req["userId"], isDeleted: false },
          { password: 0, token: 0 }
        )
        .populate("avatar identityCards backId frontId")
        .lean()
        .exec();

      const dataIMG_font = await imageModel.findOne({
        _id: resProfile.frontId._id,
      });
      const dataIMG_end = await imageModel.findOne({
        _id: resProfile.backId._id,
      });

      const dataIMG = [];
      dataIMG.push(dataIMG_font);
      dataIMG.push(dataIMG_end);

      rs = await jobModel
        .findOneAndUpdate({ _id: req.params.id }, { images: dataIMG })
        .lean()
        .exec();

      return HttpResponse.returnSuccessResponse(
        res,
        JobController.getJob(req.params.id)
      );
    } catch (e) {
      next(e);
    }
  }

  // Delete job by id
  static async deleteJob(jobId: any, userProfile: any): Promise<any> {
    // Init models
    const {
      room: roomModel,
      floor: floorModel,
      motelRoom: motelRoomModel,
      job: jobModel,
      user: userModel,
      order: orderModel,
    } = global.mongoModel;

    const jobData = await JobController.getJob(jobId, {
      user: mongoose.Types.ObjectId(userProfile._id),
    });

    if (jobData && jobData.error) {
      return jobData;
    }

    let resData = await jobModel
      .remove({ _id: jobId })
      .lean()
      .exec();

    await orderModel.remove({ _id: { $in: jobData.orders } }).exec();

    await roomModel
      .findOneAndUpdate(
        { _id: jobData.room },
        {
          status: "available",
          $unset: { rentedBy: 1 },
        }
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
          rentedRoom: roomGroup["rented"] ? roomGroup["rented"].length : 0,
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

    let userUpdateData = {
      $pull: {
        jobs: jobData._id,
      },
    };

    if (
      userProfile.phoneNumber.number ===
      helpers.stripeZeroOut(jobData.phoneNumber)
    ) {
      userUpdateData["$unset"] = { room: 1, currentJob: 1 };
    }

    await userModel
      .findOneAndUpdate({ _id: userProfile._id }, userUpdateData, { new: true })
      .exec();

    return JobController.getJob(jobId);
  }

  /* -------------------------------------------------------------------------- */
  /*                             END HELPER FUNCTION                            */
  /* -------------------------------------------------------------------------- */
}

function parseDate(input, format) {
  format = format || "yyyy-mm-dd"; // default format
  var parts = input.match(/(\d+)/g),
    i = 0,
    fmt = {};
  // extract date-part indexes from the format
  format.replace(/(yyyy|dd|mm)/g, function(part) {
    fmt[part] = i++;
  });

  return new Date(parts[fmt["yyyy"]], parts[fmt["mm"]] - 1, parts[fmt["dd"]]);
}
