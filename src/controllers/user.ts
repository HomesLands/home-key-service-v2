import { NextFunction, Request, Response } from "express";
import * as moment from "moment";
import * as lodash from "lodash";

import { helpers, normalizeError } from "../utils";

import ImageService from "../services/image";
import TwillioService from "../services/twilio";
import HttpResponse from "../services/response";
import MotelRoomController from "../controllers/homeKey/motelRoom";
import VnpayService from "../services/vnpay";
import EnergyController from './homeKey/energy.controller';
import axios from 'axios';

export default class UserController {
  /**
   * @swagger
   * tags:
   *   - name: User
   *     description: User
   */

  /**
   * @swagger
   * /v1/user/profile:
   *   get:
   *     description: Get user profile API
   *     tags: [User]
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

  static async getProfile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init user model
      const { user: userModel, code: codeModel } = global.mongoModel;
      let resData = await userModel
        .findOne(
          { _id: req["userId"], isDeleted: false },
          { password: 0, token: 0 }
        )
        .populate("avatar identityCards backId frontId")
        .lean()
        .exec();

      // User avatar
      if (resData.avatar) {
        resData.avatar = await helpers.getImageUrl(resData.avatar);
      }
      // User backId
      if (resData.backId) {
        resData.backId = await helpers.getImageUrl(resData.backId);
      }

      // User frontId
      if (resData.frontId) {
        resData.frontId = await helpers.getImageUrl(resData.frontId);
      }

      // User identityCards
      if (resData.identityCards) {
        resData.identityCards = await helpers.getImageUrl(
          resData.identityCards,
          true
        );
      }
      // return res.send("1111");
      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      // Pass error to the next middleware
      next(e);
    }
  }

  static async getProfileDeatail(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init user model
      const { user: userModel, code: codeModel } = global.mongoModel;
      const id = req.params.id;
      let resData = await userModel
        .findOne({ _id: id, isDeleted: false }, { password: 0, token: 0 })
        .populate("avatar identityCards backId frontId")
        .lean()
        .exec();

      // User avatar
      if (resData.avatar) {
        resData.avatar = await helpers.getImageUrl(resData.avatar);
      }
      // User backId
      if (resData.backId) {
        resData.backId = await helpers.getImageUrl(resData.backId);
      }

      // User frontId
      if (resData.frontId) {
        resData.frontId = await helpers.getImageUrl(resData.frontId);
      }

      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      // Pass error to the next middleware
      next(e);
    }
  }

  /**
   * @swagger
   * /v1/admin/user:
   *   get:
   *     description: Get list user
   *     tags: [User]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: keyword
   *         in: query
   *         type: string
   *         description: Keyword to find user
   *       - name: sortBy
   *         in: query
   *         type: string
   *         description: Sort By
   *         enum:
   *              - name
   *              - phoneNumber
   *       - name: sortType
   *         in: query
   *         type: string
   *         description: Sort Type
   *         enum:
   *              - ascending
   *              - descending
   *       - name: isVerified
   *         in: query
   *         default: all
   *         type: string
   *         description: Filter Is Verified ( User Type )
   *         enum:
   *              - all
   *              - true
   *              - false
   *       - name: size
   *         in: query
   *         description: Number of user returned
   *         type: integer
   *         default: 20
   *       - name: page
   *         in: query
   *         default: 0
   *         description: Current page
   *         type: integer
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

  static async getUserList(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init user model
      const { user: userModel } = global.mongoModel;

      let sortBy: string = req.query.sortBy
        ? req.query.sortBy.toString()
        : undefined;
      let role: any = req.query.role ? req.query.role.toString() : undefined;
      let size: number = req.query.size
        ? +req.query.size.toString()
        : undefined;
      let page: number = req.query.page
        ? +req.query.page.toString()
        : undefined;
      let keyword: string = req.query.keyword
        ? req.query.keyword.toString()
        : undefined;
      let isVerified: string = req.query.isVerified
        ? req.query.isVerified.toString()
        : undefined;

      const sortType = req.query.sortType === "ascending" ? 1 : -1;
      let condition, sort, dob;

      if (role && !Array.isArray(role)) {
        role = [role];
      }

      //If isVerified is not exist, get all isVerified
      if (!isVerified) {
        isVerified = "all";
      }

      keyword = keyword ? keyword.toString() : keyword;

      // if (keyword && moment(keyword).isValid()) {
      // 	dob = new Date(keyword)
      // }

      // Check keyword is valid or not
      keyword = helpers.escapeRegexp(keyword);

      condition = [
        {
          $match: {
            $and: [
              {
                // Search name, phone number, email by string input
                // $or: [
                // 	{ firstName: new RegExp(keyword, 'i') },
                // 	{ lastName: new RegExp(keyword, 'i') }
                // ]
              },
              // filter gender, is verified, active, provider and role
              isVerified === "all"
                ? {}
                : isVerified === "true"
                  ? { isVerified: true }
                  : { isVerified: false },
              { role: { $nin: ["master", "content"] } },
            ],
          },
        },
        // Populate avatar
        {
          $lookup: {
            from: "images",
            localField: "avatar",
            foreignField: "_id",
            as: "avatar",
          },
        },
        { $unwind: { path: "$avatar", preserveNullAndEmptyArrays: true } },
        // Populate identityCards
        {
          $lookup: {
            from: "images",
            localField: "identityCards",
            foreignField: "_id",
            as: "identityCards",
          },
        },
        // Project token, password
        {
          $project: {
            token: 0,
            password: 0,
          },
        },
      ];

      if (sortBy && sortType) {
        switch (sortBy) {
          case "name": {
            sort = { firstName: sortType, lastName: sortType };
            break;
          }
          case "id": {
            sort = { _id: sortType };
            break;
          }
          case "dob": {
            sort = { dob: sortType };
            break;
          }
          case "phoneNumber": {
            sort = { phoneNumber: sortType };
            break;
          }
          case "email": {
            sort = { email: sortType };
            break;
          }
          case "active": {
            sort = { active: sortType };
            break;
          }
          case "role": {
            sort = { role: sortType };
            break;
          }
          default: {
            sort = { createdAt: -1 };
            break;
          }
        }

        condition.push({ $sort: sort });
      } else {
        condition.push({ $sort: { createdAt: -1 } });
      }

      let userData = await userModel.paginate(size, page, condition);

      // Get avatar url
      for (let i = 0; i < userData.data.length; i++) {
        if (userData.data[i].avatar) {
          userData.data[i].avatar = await helpers.getImageUrl(
            userData.data[i].avatar
          );
        }

        if (userData.data[i].identityCards) {
          userData.data[i].identityCards = await helpers.getImageUrl(
            userData.data[i].identityCards,
            true
          );
        }
      }

      return HttpResponse.returnSuccessResponse(res, userData);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /v1/admin/user:
   *   delete:
   *     description: Delete users by id
   *     tags: [User]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: userId
   *         in: query
   *         required: true
   *         type: string
   *         description: user id
   *       - name: reason
   *         in: query
   *         type: string
   *         description: reason
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

  static async deleteUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const { user: userModel } = global.mongoModel;
      let userId: string = req.query.userId
        ? req.query.userId.toString()
        : undefined;
      let reason: string = req.query.reason
        ? req.query.reason.toString()
        : undefined;

      reason = reason ? reason : "";

      // Get user data
      const userData = await userModel
        .findOne({ _id: userId })
        .lean()
        .exec();

      if (!userData) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Tài khoản không tồn tại"
        );
      }

      if (userData.currentJob) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Người thuê phòng không tồn tại"
        );
      }

      // Remove all user choosen
      await userModel.remove({ _id: userId }).exec();

      return HttpResponse.returnSuccessResponse(res, null);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /v1/user/profile:
   *   put:
   *     description: Update user profile
   *     tags: [User]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: file
   *         in: formData
   *         description: Edit avatar
   *         paramType: formData
   *         type: file
   *       - name: identityCards
   *         in: formData
   *         description: identityCards
   *         paramType: formData
   *         type: file
   *       - name: email
   *         in: formData
   *         description: email
   *         paramType: formData
   *         type: string
   *       - name: firstName
   *         in: formData
   *         description: firstName
   *         paramType: formData
   *         type: string
   *         required: true
   *       - name: lastName
   *         in: formData
   *         description: lastName
   *         paramType: formData
   *         type: string
   *         required: true
   *       - name: gender
   *         in: formData
   *         description: Gender
   *         paramType: formData
   *         type: string
   *         enum:
   *              - male
   *              - female
   *              - na
   *       - name: dob
   *         in: formData
   *         description: Birthday (mm/dd/yyyy format)
   *         paramType: formData
   *         type: string
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


  //note
  static async updateProfile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init models
      const { user: userModel, code: codeModel } = global.mongoModel;

      // Init services
      const imageService = new ImageService("any");
      const { body: data } = req;
      console.log(data);


      // Process form data
      await imageService.processFormData(req, res);

      // Validate input data for reset
      const validateResults = await userModel.validateData(
        ["updateProfile"],
        data
      );

      // Parse error list from validation results
      const errorList = normalizeError(validateResults);

      // Validation Error
      if (errorList.length > 0) {
        return HttpResponse.returnBadRequestResponse(res, errorList);
      }
      let dob = new Date();
      // Add dob
      if (data.dobAction) {
        const dateParts = data.dobAction.split("/");

        dob = new Date(+dateParts[2], dateParts[1] - 1, +dateParts[0]);

        // Check age is greater than 18
        const age = moment().diff(dob, "years");

        if (age < 18) {
          return HttpResponse.returnBadRequestResponse(res, "Tuổi không đủ 18");
        }
      }
      let resData = null;
      ////////////////////////////////
      if (data.phoneNumberFull) {
        data.phoneNumber = {
          countryCode: "+84",
          number: helpers.stripeZeroOut(data.phoneNumberFull),
        };

        // Check if whether user existed already
        const existingUser = await userModel
          .findOne({
            phoneNumber: data.phoneNumber,
            _id: { $ne: data._id },
            isDeleted: false,
          })
          .lean()
          .exec();

        // Return error
        if (existingUser) {
          return HttpResponse.returnBadRequestResponse(
            res,
            "Số điện thoại đã tồn tại"
          );
        }


        const currentUser = await userModel
          .findOne({
            _id: data._id,
            isDeleted: false,
          })
          .lean()
          .exec();

        if (!currentUser.idDevice) {




          await userModel.updateOne({
            _id: data._id,
            isDeleted: false,
          },
            {
              $set: { idDevice: null }
            }
          )

          // Update normal data
          resData = await userModel
            .findOneAndUpdate(
              { _id: data._id },
              {
                address: data.address,
                dobString: data.dobAction,
                dob: dob,
                email: data.email,
                firstName: data.firstName,
                lastName: data.lastName,
                nationalId: data.nationalId,
                gender: data.gender,
                phoneNumberFull: data.phoneNumberFull,
                phoneNumber: data.phoneNumber,
                idDevice: data.idDevice,
              },
              {
                new: true,
                fields: { password: 0, token: 0 },
              }
            )
            .populate("avatar identityCards backId frontId")
            .lean();
        } else {
          resData = await userModel
            .findOneAndUpdate(
              { _id: data._id },
              {
                address: data.address,
                dobString: data.dobAction,
                dob: dob,
                email: data.email,
                firstName: data.firstName,
                lastName: data.lastName,
                nationalId: data.nationalId,
                gender: data.gender,
                phoneNumberFull: data.phoneNumberFull,
                phoneNumber: data.phoneNumber,
                idDevice: data.idDevice,
              },
              {
                new: true,
                fields: { password: 0, token: 0 },
              }
            )
            .populate("avatar identityCards backId frontId")
            .lean();
        }

      } else {
        // Update normal data

        const currentUser = await userModel
          .findOne({
            _id: data._id,
            isDeleted: false,
          })
          .lean()
          .exec();

        if (!currentUser.idDevice) {
          await userModel.updateOne({
            _id: data._id,
            isDeleted: false,
          },
            {
              $set: { idDevice: null }
            }
          )

          resData = await userModel
            .findOneAndUpdate(
              { _id: data._id },
              {
                address: data.address,
                dobString: data.dobAction,
                dob: dob,
                email: data.email,
                firstName: data.firstName,
                lastName: data.lastName,
                nationalId: data.nationalId,
                gender: data.gender,
                phoneNumberFull: data.phoneNumberFull,
                phoneNumber: {
                  countryCode: "+84",
                  number: helpers.stripeZeroOut(data.phoneNumber.number),
                },
                idDevice: data.idDevice,
              },
              {
                new: true,
                fields: { password: 0, token: 0 },
              }
            )
            .populate("avatar identityCards backId frontId")
            .lean();
        } else {
          resData = await userModel
            .findOneAndUpdate(
              { _id: data._id },
              {
                address: data.address,
                dobString: data.dobAction,
                dob: dob,
                email: data.email,
                firstName: data.firstName,
                lastName: data.lastName,
                nationalId: data.nationalId,
                gender: data.gender,
                phoneNumberFull: data.phoneNumberFull,
                phoneNumber: {
                  countryCode: "+84",
                  number: helpers.stripeZeroOut(data.phoneNumber.number),
                },

                idDevice: data.idDevice,
              },
              {
                new: true,
                fields: { password: 0, token: 0 },
              }
            )
            .populate("avatar identityCards backId frontId")
            .lean();
        }
      }

      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      // Pass error to the next middleware
      next(e);
    }
  }

  /**
   * @swagger
   * /v1/user/motelRoom/list:
   *   get:
   *     description: Get list motel room
   *     tags: [User]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: keyword
   *         in: query
   *         type:  string
   *         description: Keyword to find motel room
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
   *          - auth: []
   */

  static async getMotelRoomList(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init user model`
      const {
        motelRoom: motelRoomModel,
        image: imageModel,
      } = global.mongoModel;

      let sortBy: string = req.query.sortBy
        ? req.query.sortBy.toString()
        : undefined;
      let role: string = req.query.role ? req.query.role.toString() : undefined;
      let size: number = req.query.size
        ? +req.query.size.toString()
        : undefined;
      let page: number = req.query.page
        ? +req.query.page.toString()
        : undefined;
      let keyword: string = req.query.keyword
        ? req.query.keyword.toString()
        : undefined;

      const sortType = req.query.sortType === "ascending" ? 1 : -1;
      let condition, sort;
      condition = [
        {
          $lookup: {
            from: "addresses",
            localField: "address",
            foreignField: "_id",
            as: "address",
          },
        },
        { $unwind: { path: "$address", preserveNullAndEmptyArrays: true } },
        // {
        //   $lookup: {
        //     from: "images",
        //     localField: "images",
        //     foreignField: "_id",
        //     as: "images",
        //   },
        // },
        // { $unwind: { path: "$images", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "owner",
          },
        },
        { $unwind: { path: "$owner", preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            "address.location": "$address.geometry.location",
          },
        },
        {
          $match: {
            "owner._id": req["userId"],
          },
        },
        {
          $project: {
            "owner.token": 0,
            "owner.password": 0,
            "owner.role": 0,
            "owner.active": 0,
            "owner.isVerified": 0,
            "owner.signUpCompleted": 0,
            "owner.isDeleted": 0,
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

      const resData = helpers.changeTimeZone(
        await motelRoomModel.paginate(size, page, condition)
      );
      console.log(3333);
      if (resData) {
        const n = resData["data"].length;
        for (let i = 0; i < n; i++) {
          if (resData["data"][i].images) {
            if (Array.isArray(resData["data"][i].images)) {
              if (resData["data"][i].images.length > 0) {
                for (let j = 0; j < resData["data"][i].images.length; j++) {
                  const dataimg = await imageModel.findOne({
                    _id: resData["data"][i].images[j],
                  });
                  if (dataimg) {
                    resData["data"][i].images[j] = await helpers.getImageUrl(
                      dataimg
                    );
                  }
                }
              }
            } // imag not array
            else {
              const dataimg = await imageModel.findOne({
                _id: resData["data"][i].images,
              });
              if (dataimg) {
                resData["data"][i].images = await helpers.getImageUrl(dataimg);
              }
            }
          }
        }
      }

      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      next(e);
    }
  }
  static async getMotelRoomListAdmin(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init user model`
      const {
        motelRoom: motelRoomModel,
        image: imageModel,
      } = global.mongoModel;

      let sortBy: string = req.query.sortBy
        ? req.query.sortBy.toString()
        : undefined;
      let role: string = req.query.role ? req.query.role.toString() : undefined;
      let size: number = req.query.size
        ? +req.query.size.toString()
        : undefined;
      let page: number = req.query.page
        ? +req.query.page.toString()
        : undefined;
      let keyword: string = req.query.keyword
        ? req.query.keyword.toString()
        : undefined;

      const sortType = req.query.sortType === "ascending" ? 1 : -1;
      let condition, sort;
      condition = [
        {
          $lookup: {
            from: "addresses",
            localField: "address",
            foreignField: "_id",
            as: "address",
          },
        },
        { $unwind: { path: "$address", preserveNullAndEmptyArrays: true } },
        // {
        //   $lookup: {
        //     from: "images",
        //     localField: "images",
        //     foreignField: "_id",
        //     as: "images",
        //   },
        // },
        // { $unwind: { path: "$images", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "owner",
          },
        },
        { $unwind: { path: "$owner", preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            "address.location": "$address.geometry.location",
          },
        },
        // {
        //   $match: {
        //     "owner._id": req["userId"],
        //   },
        // },
        {
          $project: {
            "owner.token": 0,
            "owner.password": 0,
            "owner.role": 0,
            "owner.active": 0,
            "owner.isVerified": 0,
            "owner.signUpCompleted": 0,
            "owner.isDeleted": 0,
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

      const resData = helpers.changeTimeZone(
        await motelRoomModel.paginate(size, page, condition)
      );
      console.log(44444);
      if (resData) {
        const n = resData["data"].length;
        for (let i = 0; i < n; i++) {
          if (resData["data"][i].images) {
            if (Array.isArray(resData["data"][i].images)) {
              if (resData["data"][i].images.length > 0) {
                for (let j = 0; j < resData["data"][i].images.length; j++) {
                  const dataimg = await imageModel.findOne({
                    _id: resData["data"][i].images[j],
                  });
                  if (dataimg) {
                    resData["data"][i].images[j] = await helpers.getImageUrl(
                      dataimg
                    );
                  }
                }
              }
            }
            // imag not array
            else {
              const dataimg = await imageModel.findOne({
                _id: resData["data"][i].images,
              });
              if (dataimg) {
                resData["data"][i].images = await helpers.getImageUrl(dataimg);
              }
            }
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
   * /v1/user/notification/list:
   *   get:
   *     description: Get list motel room
   *     tags: [User]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
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
   *          - auth: []
   */
  static async getNotificationUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    // Init user model
    const UserID = req.params.id;
    const { notification: notificationModel } = global.mongoModel;

    const resData = await notificationModel.find({ user: UserID });

    if (!resData) {
      return HttpResponse.returnBadRequestResponse(
        res,
        "Không Có Thông Báo Nào"
      );
    }
    return HttpResponse.returnSuccessResponse(res, resData);
  }
  static async getMotelRoomByIdRoom(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      let { id: motelRoomId } = req.params;
      console.log(111111);
      // const MotelRoomData = await MotelRoomController.getMotelRoom(motelRoomId);

      return HttpResponse.returnSuccessResponse(
        res,
        await MotelRoomController.getMotelRoom(motelRoomId)
      );
    } catch (e) {
      next(e);
    }
  }

  static async getNotificationList(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init user model
      const { notification: notificationModel } = global.mongoModel;

      let sortBy: string = req.query.sortBy
        ? req.query.sortBy.toString()
        : undefined;
      let size: number = req.query.size
        ? +req.query.size.toString()
        : undefined;
      let page: number = req.query.page
        ? +req.query.page.toString()
        : undefined;

      const sortType = req.query.sortType === "ascending" ? 1 : -1;
      let condition, sort;

      condition = [
        {
          $match: {
            user: req["userId"],
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

      const resData = await notificationModel.paginate(size, page, condition);

      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      next(e);
    }
  }

  // /**
  //  * @swagger
  //  * /v1/user/deleteAccount:
  //  *   delete:
  //  *     description: Delete user account
  //  *     tags: [User]
  //  *     responses:
  //  *       200:
  //  *         description: Success
  //  *       400:
  //  *         description: Invalid request params
  //  *       401:
  //  *         description: Unauthorized
  //  *       404:
  //  *         description: Resource not found
  //  *     security:
  //  *          - auth: []
  //  */

  static async deleteAccount(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init user model
      const { user: userModel } = global.mongoModel;
      await userModel.findOneAndDelete(
        { _id: req["userProfile"]._id },
        { password: 0, token: 0 }
      );

      return HttpResponse.returnSuccessResponse(res, null);
    } catch (e) {
      // Pass error to the next middleware
      next(e);
    }
  }

  // /**
  //  * @swagger
  //  * /v1/user/address:
  //  *   post:
  //  *     description: Create address
  //  *     tags: [User]
  //  *     parameters:
  //  *       - name: body
  //  *         in: body
  //  *         required: true
  //  *         description: address
  //  *         schema:
  //  *           type: object
  //  *           $ref: '#definitions/Address'
  //  *     responses:
  //  *       200:
  //  *         description: Success
  //  *       400:
  //  *         description: Invalid request params
  //  *       401:
  //  *         description: Unauthorized
  //  *       404:
  //  *         description: Resource not found
  //  *     security:
  //  *          - auth: []
  //  */

  static async createAddress(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init user model
      const { address: addressModel } = global.mongoModel;
      const { body: data } = req;

      let resData = await addressModel.create(data);

      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      // Pass error to the next middleware
      next(e);
    }
    //1
  }

  //   /**
  //    * @swagger
  //    * /v1/user/address/{id}:
  //    *   delete:
  //    *     description: Delete address by id
  //    *     tags: [User]
  //    *     parameters:
  //    *       - name: id
  //    *         in: path
  //    *         required: true
  //    *         type: string
  //    *         description: Address id
  //    *     responses:
  //    *       200:
  //    *         description: Success
  //    *       400:
  //    *         description: Invalid request params
  //    *       401:
  //    *         description: Unauthorized
  //    *       404:
  //    *         description: Resource not found
  //    *     security:
  //    *          - auth: []
  //    */

  static async deleteAddress(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init user model
      const { location: locationModel, user: userModel } = global.mongoModel;

      const { id: addressId } = req.params;

      await userModel
        .findOneAndUpdate(
          { address: addressId },
          { $pull: { address: addressId } },
          { upsert: true }
        )
        .lean()
        .exec();

      // Delete address
      await locationModel
        .findOneAndRemove({ _id: addressId })
        .lean()
        .exec();

      return HttpResponse.returnSuccessResponse(res, null);
    } catch (e) {
      // Pass error to the next middleware
      next(e);
    }
  }

  /**
   * @swagger
   * /v1/user/recharge:
   *   post:
   *     description: Recharge wallet
   *     tags: [User]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: amount
   *         in: formData
   *         paramType: formData
   *         type: number
   *         description: amount
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

  static async rechargeWallet(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init models
      const { order: orderModel } = global.mongoModel;

      // Init services
      const imageService = new ImageService("any");
      const twillioService = new TwillioService();

      // Process form data
      await imageService.processFormData(req, res);
      const { body: data } = req;

      const orderData = await orderModel.create({
        user: req["userId"],
        isCompleted: false,
        description: `Nạp ${data.amount} vào ví nội bộ`,
        amount: data.amount,
        type: "recharge",
      });

      data.orderId = orderData._id.toString();

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
   * /v1/admin/user/{id}/recharge:
   *   put:
   *     description: Recharge wallet
   *     tags: [User]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: id
   *         in: path
   *         type: string
   *         description: user id
   *       - name: amount
   *         in: formData
   *         type: number
   *         description: amount
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

  static async rechargeWalletByAdmin(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init models
      const { user: userModel } = global.mongoModel;

      // Init services
      const imageService = new ImageService("any");

      // Process form data
      await imageService.processFormData(req, res);
      const { body: data } = req;

      let userData = await userModel
        .findOne({ _id: req.params.id, isDeleted: false })
        .lean()
        .exec();

      if (!userData) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Tài khoản không tồn tại"
        );
      }

      userData = await userModel
        .findOneAndUpdate(
          { _id: req.params.id },
          { $inc: { wallet: data.amount } }
        )
        .lean()
        .exec();

      return HttpResponse.returnSuccessResponse(res, userData);
    } catch (e) {
      // Pass error to the next middleware
      next(e);
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                            START HELPER FUNCTION                           */
  /* -------------------------------------------------------------------------- */

  // Get user by id
  static async getUserData(userId: any, fields?: object): Promise<any> {
    const { user: userModel } = global.mongoModel;

    // Find data of user
    return await userModel
      .findOne({ _id: userId, isDeleted: false }, fields)
      .lean();
  }

  // Get user by customer id
  static async getUserByCustomerId(
    customerId: any,
    fields?: object
  ): Promise<any> {
    const { user: userModel } = global.mongoModel;

    // Find data of user
    return await userModel.findOne({ customerId }, fields).lean();
  }

  // Update user by id
  static async updateUser(_id: any, fields: object): Promise<any> {
    const { user: userModel } = global.mongoModel;

    // Find and data of user
    return await userModel.findOneAndUpdate({ _id }, fields, { new: true });
  }

  // Validate user model
  static async validateData(data: object, group: string): Promise<any> {
    const { user: userModel } = global.mongoModel;

    // Validate input data for verify user
    const validateResults = await userModel.validateData([group], data);

    // Parse error list form validation results
    return normalizeError(validateResults);
  }


  // note 
  static async getBankUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init user model`
      const { banking: BankingModel, image: imageModel } = global.mongoModel;
      let { sortBy, size, page, keyword } = req.query;
      const sortType = req.query.sortType === "ascending" ? 1 : -1;
      let condition, sort;

      condition = [
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "images",
            localField: "images",
            foreignField: "_id",
            as: "images",
          },
        },
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

      const userCondition = { "user._id": req["userId"] };
      condition.push({ $match: userCondition });

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
          default:
            sort = { createdAt: -1 };
        }
        condition.push({ $sort: sort });
      }

      const resData = await BankingModel.paginate(size, page, condition);

      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      next(e);
    }
  }



  static async getHostList(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init user model
      const {
        motelRoom: motelRoomModel,
        floor: floorModel,
        room: roomModel,
        address: addressModel,
        user: userModel,
        electrics: ElectricsModel // Import ElectricsModel
      } = global.mongoModel;

      let jsonMotel = {};
      let userDataWithRevenue = [];


      let sortBy: string = req.query.sortBy
        ? req.query.sortBy.toString()
        : undefined;
      let role: any = req.query.role ? req.query.role.toString() : undefined;
      let size: number = req.query.size
        ? +req.query.size.toString()
        : undefined;
      let page: number = req.query.page
        ? +req.query.page.toString()
        : undefined;
      let keyword: string = req.query.keyword
        ? req.query.keyword.toString()
        : undefined;
      let isVerified: string = req.query.isVerified
        ? req.query.isVerified.toString()
        : undefined;

      const sortType = req.query.sortType === "ascending" ? 1 : -1;
      let condition, sort, dob;

      if (role && !Array.isArray(role)) {
        role = [role];
      }

      //If isVerified is not exist, get all isVerified
      if (!isVerified) {
        isVerified = "all";
      }

      keyword = keyword ? keyword.toString() : keyword;

      // if (keyword && moment(keyword).isValid()) {
      // 	dob = new Date(keyword)
      // }

      // Check keyword is valid or not
      keyword = helpers.escapeRegexp(keyword);

      condition = [
        {
          $match: {
            $and: [
              {
                // Search name, phone number, email by string input
                // $or: [
                // 	{ firstName: new RegExp(keyword, 'i') },
                // 	{ lastName: new RegExp(keyword, 'i') }
                // ]
              },
              // filter gender, is verified, active, provider and role
              isVerified === "all"
                ? {}
                : isVerified === "true"
                  ? { isVerified: true }
                  : { isVerified: false },
              // { role: { $nin: ["master", "content"] } },
              { role: { $in: ["host", "content"] } },
            ],
          },
        },
        // Populate avatar
        {
          $lookup: {
            from: "images",
            localField: "avatar",
            foreignField: "_id",
            as: "avatar",
          },
        },
        { $unwind: { path: "$avatar", preserveNullAndEmptyArrays: true } },
        // Populate identityCards
        {
          $lookup: {
            from: "images",
            localField: "identityCards",
            foreignField: "_id",
            as: "identityCards",
          },
        },
        // Project token, password
        {
          $project: {
            token: 0,
            password: 0,
          },
        },
      ];

      if (sortBy && sortType) {
        switch (sortBy) {
          case "name": {
            sort = { firstName: sortType, lastName: sortType };
            break;
          }
          case "id": {
            sort = { _id: sortType };
            break;
          }
          case "dob": {
            sort = { dob: sortType };
            break;
          }
          case "phoneNumber": {
            sort = { phoneNumber: sortType };
            break;
          }
          case "email": {
            sort = { email: sortType };
            break;
          }
          case "active": {
            sort = { active: sortType };
            break;
          }
          case "role": {
            sort = { role: sortType };
            break;
          }
          default: {
            sort = { createdAt: -1 };
            break;
          }
        }

        condition.push({ $sort: sort });
      } else {
        condition.push({ $sort: { createdAt: -1 } });
      }

      let userData = await userModel.paginate(size, page, condition);

      // const userDataList = userData.data;

      // // Duyệt qua từng người dùng để lấy thông tin doanh thu của từng tòa nhà
      // for (const element of userDataList) {
      //   const motelId = element._id;
      //   const currentDate = new Date();
      //   const formattedStartDate = new Date(
      //     currentDate.getFullYear(),
      //     currentDate.getMonth(),
      //     2
      //   ).toISOString().slice(0, 10);
      //   const formattedCurrentDate = currentDate.toISOString().slice(0, 10);

      //   try {
      //     const buildingRevenueUrl = `http://localhost:5502/api/v1/homeKey/energy/device/buildingRevenue/${motelId}/${formattedStartDate}/${formattedCurrentDate}`;
      //     const buildingRevenueResponse = await axios.get(buildingRevenueUrl);
      //     if (buildingRevenueResponse) {
      //       console.log("Response from the server", buildingRevenueResponse.data.data);

      //       const buildingRevenueData = buildingRevenueResponse.data.data;
      //       let hostTotalRevenue = 0;

      //       if (buildingRevenueData === "Motel has no floors") {
      //         console.log("Motel has no floors");
      //         hostTotalRevenue = 0;
      //       } else {
      //         for (const motel in buildingRevenueData) {
      //           const totalRevenue = buildingRevenueData[motel].totalRevenue;
      //           // Tính tổng doanh thu của từng tòa nhà
      //           hostTotalRevenue += totalRevenue;
      //         }
      //       }

      //       // Thêm thuộc tính hostBuildingRevenue vào element
      //       element.hostBuildingRevenue = hostTotalRevenue;
      //     } else {
      //       console.log("No response from the server");
      //     }
      //   } catch (error) {
      //     console.error("Error while fetching building revenue:", error);
      //   }

      //   // Thêm thông tin người dùng kèm doanh thu vào mảng userDataWithRevenue
      //   userDataWithRevenue.push(element);
      // }

      // // Thêm avatar url
      // for (let i = 0; i < userDataWithRevenue.length; i++) {
      //   if (userDataWithRevenue[i].avatar) {
      //     userDataWithRevenue[i].avatar = await helpers.getImageUrl(
      //       userDataWithRevenue[i].avatar
      //     );
      //   }

      //   if (userDataWithRevenue[i].identityCards) {
      //     userDataWithRevenue[i].identityCards = await helpers.getImageUrl(
      //       userDataWithRevenue[i].identityCards,
      //       true
      //     );
      //   }
      // }

      console.log(userData);
      if(userData) {
        if(userData.totalRow > 0) {
          for(let i = 0; i < userData.totalRow; i++) {
            let motelDatas = await motelRoomModel.find({owner: userData.data[i]._id}).lean().exec();
            userData.data[i].numberBuilding = motelDatas.length;
          }
        }
      }

      return HttpResponse.returnSuccessResponse(res, userData);
    } catch (e) {
      next(e);
    }
  }

  static async getListHostPendingCensorByAdmin(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init user model
      const {
        motelRoom: motelRoomModel,
        floor: floorModel,
        room: roomModel,
        address: addressModel,
        user: userModel,
        electrics: ElectricsModel // Import ElectricsModel
      } = global.mongoModel;

      let jsonMotel = {};
      let userDataWithRevenue = [];


      let sortBy: string = req.query.sortBy
        ? req.query.sortBy.toString()
        : undefined;
      let role: any = req.query.role ? req.query.role.toString() : undefined;
      let size: number = req.query.size
        ? +req.query.size.toString()
        : undefined;
      let page: number = req.query.page
        ? +req.query.page.toString()
        : undefined;
      let keyword: string = req.query.keyword
        ? req.query.keyword.toString()
        : undefined;
      let isVerified: string = req.query.isVerified
        ? req.query.isVerified.toString()
        : undefined;

      const sortType = req.query.sortType === "ascending" ? 1 : -1;
      let condition, sort, dob;

      if (role && !Array.isArray(role)) {
        role = [role];
      }

      //If isVerified is not exist, get all isVerified
      if (!isVerified) {
        isVerified = "all";
      }

      keyword = keyword ? keyword.toString() : keyword;

      // if (keyword && moment(keyword).isValid()) {
      // 	dob = new Date(keyword)
      // }

      // Check keyword is valid or not
      keyword = helpers.escapeRegexp(keyword);

      condition = [
        {
          $match: {
            $and: [
              {
                // Search name, phone number, email by string input
                // $or: [
                // 	{ firstName: new RegExp(keyword, 'i') },
                // 	{ lastName: new RegExp(keyword, 'i') }
                // ]
              },
              // filter gender, is verified, active, provider and role
              isVerified === "all"
                ? {}
                : isVerified === "true"
                  ? { isVerified: true }
                  : { isVerified: false },
              // { role: { $nin: ["master", "content"] } },
              { role: { $in: ["host", "content"] } },
            ],
            isCensorHost: false,
            isDeleted: false,
          },
        },
        // Populate avatar
        {
          $lookup: {
            from: "images",
            localField: "avatar",
            foreignField: "_id",
            as: "avatar",
          },
        },
        { $unwind: { path: "$avatar", preserveNullAndEmptyArrays: true } },
        // Populate identityCards
        {
          $lookup: {
            from: "images",
            localField: "identityCards",
            foreignField: "_id",
            as: "identityCards",
          },
        },
        // Project token, password
        {
          $project: {
            token: 0,
            password: 0,
          },
        },
      ];

      if (sortBy && sortType) {
        switch (sortBy) {
          case "name": {
            sort = { firstName: sortType, lastName: sortType };
            break;
          }
          case "id": {
            sort = { _id: sortType };
            break;
          }
          case "dob": {
            sort = { dob: sortType };
            break;
          }
          case "phoneNumber": {
            sort = { phoneNumber: sortType };
            break;
          }
          case "email": {
            sort = { email: sortType };
            break;
          }
          case "active": {
            sort = { active: sortType };
            break;
          }
          case "role": {
            sort = { role: sortType };
            break;
          }
          default: {
            sort = { createdAt: -1 };
            break;
          }
        }

        condition.push({ $sort: sort });
      } else {
        condition.push({ $sort: { createdAt: -1 } });
      }

      let userData = await userModel.paginate(size, page, condition);

      // const userDataList = userData.data;

      // // Duyệt qua từng người dùng để lấy thông tin doanh thu của từng tòa nhà
      // for (const element of userDataList) {
      //   const motelId = element._id;
      //   const currentDate = new Date();
      //   const formattedStartDate = new Date(
      //     currentDate.getFullYear(),
      //     currentDate.getMonth(),
      //     2
      //   ).toISOString().slice(0, 10);
      //   const formattedCurrentDate = currentDate.toISOString().slice(0, 10);

      //   try {
      //     const buildingRevenueUrl = `http://localhost:5502/api/v1/homeKey/energy/device/buildingRevenue/${motelId}/${formattedStartDate}/${formattedCurrentDate}`;
      //     const buildingRevenueResponse = await axios.get(buildingRevenueUrl);
      //     if (buildingRevenueResponse) {
      //       console.log("Response from the server", buildingRevenueResponse.data.data);

      //       const buildingRevenueData = buildingRevenueResponse.data.data;
      //       let hostTotalRevenue = 0;

      //       if (buildingRevenueData === "Motel has no floors") {
      //         console.log("Motel has no floors");
      //         hostTotalRevenue = 0;
      //       } else {
      //         for (const motel in buildingRevenueData) {
      //           const totalRevenue = buildingRevenueData[motel].totalRevenue;
      //           // Tính tổng doanh thu của từng tòa nhà
      //           hostTotalRevenue += totalRevenue;
      //         }
      //       }

      //       // Thêm thuộc tính hostBuildingRevenue vào element
      //       element.hostBuildingRevenue = hostTotalRevenue;
      //     } else {
      //       console.log("No response from the server");
      //     }
      //   } catch (error) {
      //     console.error("Error while fetching building revenue:", error);
      //   }

      //   // Thêm thông tin người dùng kèm doanh thu vào mảng userDataWithRevenue
      //   userDataWithRevenue.push(element);
      // }

      // // Thêm avatar url
      // for (let i = 0; i < userDataWithRevenue.length; i++) {
      //   if (userDataWithRevenue[i].avatar) {
      //     userDataWithRevenue[i].avatar = await helpers.getImageUrl(
      //       userDataWithRevenue[i].avatar
      //     );
      //   }

      //   if (userDataWithRevenue[i].identityCards) {
      //     userDataWithRevenue[i].identityCards = await helpers.getImageUrl(
      //       userDataWithRevenue[i].identityCards,
      //       true
      //     );
      //   }
      // }

      console.log(userData);
      if(userData) {
        if(userData.totalRow > 0) {
          for(let i = 0; i < userData.totalRow; i++) {
            let motelDatas = await motelRoomModel.find({owner: userData.data[i]._id}).lean().exec();
            userData.data[i].numberBuilding = motelDatas.length;
          }
        }
      }

      return HttpResponse.returnSuccessResponse(res, userData);
    } catch (e) {
      next(e);
    }
  }

  static async censorNewHostById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init user model`
      const {
        user: userModel,
      } = global.mongoModel;
      
      // const id = req.params.id;

      let { body: data } = req;

      console.log({data});

      if(!data) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Không có dữ liệu"
        )
      }

      const userData = await userModel.findOne({_id: data.idUser}).lean().exec();

      if(!userData) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Người dùng không tồn tại"
        )
      }

      if(data.status === true) {
        const motelDataUpdate = await userModel.findOneAndUpdate(
          {_id: data.idUser},
          {
            isCensorHost: true,
          },
          {new: true}
        );
        return HttpResponse.returnSuccessResponse(res, motelDataUpdate);
      } else if(data.status === false) {
        const motelDataUpdate = await userModel.remove(
          {_id: data.idUser},
        );
        return HttpResponse.returnSuccessResponse(res, motelDataUpdate);
      }
      return HttpResponse.returnSuccessResponse(res, 'success');
    } catch (e) {
      next(e);
    }
  }
  // -------------

  /* -------------------------------------------------------------------------- */
  /*                             END HELPER FUNCTION                            */
  /* -------------------------------------------------------------------------- */
}
