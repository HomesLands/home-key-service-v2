import { NextFunction, Request, Response } from "express";
import * as lodash from "lodash";
import { helpers } from "../../utils";
import ImageService from "../../services/image";
import HttpResponse from "../../services/response";
import e = require("express");
import sendMail from "../../utils/Mailer/mailer";
import * as rn from "random-number";
import * as bcrypt from "bcryptjs";

export default class RequestWitdrawsController {
  static async postRequestWithdraw(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    console.log("post request withdraw");
    try {
      // Init models
      const { requestWithdraws: RequestWithdrawsModel } = global.mongoModel;
      const { user: userModel } = global.mongoModel;

      console.log("global.mongoModel", global.mongoModel);

      const id = req.params.id;

      let { body: data } = req;
      let resData = await userModel
        .findOne(
          { _id: req["userId"], isDeleted: false },
          { password: 0, token: 0 }
        )
        .populate("avatar identityCards")
        .lean()
        .exec();
      if (!resData) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Tài khoản không tồn tại"
        );
      }
      console.log("reqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq", data.amount);

      const requestWithdrawsData = await RequestWithdrawsModel.create({
        user: req["userId"],
        keyPayment: data.keyPayment,
        description: `Chuyển tiền vào tài khoản ${resData.lastName} ${resData.firstName}`,
        amount: data.amount,
        status: "waiting",
        paymentMethod: data.type,
        stk: data.stk,
        nameTk: data.nameTk,
        nameTkLable: data.nameTkLable,
        branch: data.branch,
        phoneNumberFull: data.phoneNumberFull,
      });

      //   Get ip
      data["ipAddr"] =
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.socket.remoteAddress;

      return HttpResponse.returnSuccessResponse(res, requestWithdrawsData);
    } catch (e) {
      console.error("Error in postRequestWithdraw:", e);
      next(e);
    }
  }

  static async getRequestWithdrawsUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init user model`
      const { requestWithdraws: RequestWithdrawsModel } = global.mongoModel;
      const { image: imageModel } = global.mongoModel;
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

      const resData = await RequestWithdrawsModel.paginate(
        size,
        page,
        condition
      );
      const data = [];

      if (resData) {
        for (let i = 0; i < resData.data.length; i++) {
          const _id = resData.data[i].user._id;
          const id = req["userId"];
          if (_id.toString() == id.toString()) {
            // get file Url

            if (resData.data[i].file) {
              const dataimg = await imageModel.findOne({
                _id: resData.data[i].file,
              });
              if (dataimg) {
                resData.data[i].file = await helpers.getImageUrl(dataimg);
              }
            }
            data.push(resData.data[i]);
          }
        }
      }
      if (!resData) {
        return HttpResponse.returnBadRequestResponse(res, "logPayment");
      }
      console.log("=======================================");
      console.log("dataa", data);
      return HttpResponse.returnSuccessResponse(res, data);
    } catch (e) {
      console.log(e);
      next(e);
    }
  }

  static async getRequestWithdraws(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init user model`
      const { requestWithdraws: RequestWithdrawsModel } = global.mongoModel;
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
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: false } },
        {
          $lookup: {
            from: "images",
            localField: "file",
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

      const resData = await RequestWithdrawsModel.paginate(
        size,
        page,
        condition
      );

      if (!resData) {
        return HttpResponse.returnBadRequestResponse(res, "Không có danh sách");
      }
      // for (let i = 0; i < resData.data.length; i++) {
      //   if (resData.data[i].images.length > 0) {
      //     resData.data[i].images = helpers.getImageUrl(
      //       resData.data[i].images,
      //       true
      //     );
      //   }
      // }

      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      next(e);
    }
  }

  static async putRequestWithdraw(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init models
      const { requestWithdraws: RequestWithdrawsModel } = global.mongoModel;
      const { user: userModel } = global.mongoModel;

      const id = req.params.id;

      let { body: data } = req;

      console.log("data: ", data);

      let resData = await RequestWithdrawsModel.findOne({
        _id: id,
        isDeleted: false,
      })
        .lean()
        .exec();
      if (!resData) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Tài khoản không tồn tại"
        );
      }
      // find user
      const rsuser = await userModel
        .findOne({ _id: resData.user })
        .lean()
        .exec();
      if (!rsuser) {
        return HttpResponse.returnBadRequestResponse(res, "Không tồn tại user");
      }

      if (data.status === "success") {
        const userData = await userModel
          .findOneAndUpdate(
            {
              _id: resData.user,
            },
            {
              $set: {
                wallet: rsuser.wallet - resData.amount,
              },
            },
            {
              new: true,
            }
          )
          .lean()
          .exec();
        if (!userData) {
          return HttpResponse.returnBadRequestResponse(
            res,
            "Không cập nhật được tiền"
          );
        }
      }

      const resDataS = await RequestWithdrawsModel.findOneAndUpdate(
        { _id: id },
        { status: data.status }
      )
        .lean()
        .exec();
      // Get ip
      data["ipAddr"] =
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.socket.remoteAddress;
      return HttpResponse.returnSuccessResponse(res, resDataS);
    } catch (e) {
      next(e);
    }
  }
}
