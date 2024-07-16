import { NextFunction, Request, Response } from "express";
import * as mongoose from "mongoose";
import ImageService from "../../services/image";
import HttpResponse from "../../services/response";
import { helpers } from "../../utils";
export default class ReportProblem {
  /* -------------------------------------------------------------------------- */
  /*                            START HELPER FUNCTION                           */
  /* -------------------------------------------------------------------------- */
  // Get Add by id
  static async insertDb(data): Promise<any> {
    const {
      reportProblem: ReportProblemModel,
      optionsType: OptionsTypeModel,
    } = global.mongoModel;
    // check trung ma hoa đơn
    const dataCheck = await ReportProblemModel.findOne({
      idReportProblem: data.idReportProblem,
    })
      .lean()
      .exec();

    // If user was deleted
    if (dataCheck) {
      return HttpResponse.returnErrorWithMessage("Mã Sự Cố tồn tại");
    }

    let ReportProblemData = await ReportProblemModel.create({
      idReportProblem: data.idReportProblem,
      description: data.description,
      status: "waiting",
    });

    ReportProblemData = await ReportProblemModel.findOneAndUpdate(
      { _id: ReportProblemData._id },
      {
        motelRoom: data.IdMotelRoom,
        user: data.IdUser,
        room: data.IdRoom,
      },
      { new: true }
    )
      .lean()
      .exec();

    if (!ReportProblemData) {
      return HttpResponse.returnErrorWithMessage("Báo cáo không tồn tại", "");
    }

    // Return  data
    return ReportProblemData._id;
  }

  static async createReportProblem(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    // Init models
    const { reportProblems: reportProblemsModel } = global.mongoModel;
    const { body: data } = req;
    const ReportProblemData = await ReportProblem.insertDb(data);

    return HttpResponse.returnSuccessResponse(
      res,
      await ReportProblem.getReportProblemById(ReportProblemData)
    );
  }

  static async getReportProblemDetail(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      let { id: reportProblemId } = req.params;

      return HttpResponse.returnSuccessResponse(
        res,
        await ReportProblem.getReportProblemById(reportProblemId)
      );
    } catch (e) {
      next(e);
    }
  }

  // Get reportProblem by id
  static async getReportProblemById(
    reportProblemId: any,
    lang?: string
  ): Promise<any> {
    const { reportProblem: ReportProblemModel } = global.mongoModel;

    if (!mongoose.Types.ObjectId.isValid(reportProblemId)) {
      return HttpResponse.returnErrorWithMessage(
        "Báo cáo sự cố không tồn tại",
        lang
      );
    }

    let resData = await ReportProblemModel.findOne({ _id: reportProblemId })
      .lean()
      .exec();

    if (!resData) {
      return HttpResponse.returnErrorWithMessage("Hóa không tồn tại", lang);
    }

    // Return floor data
    return resData;
  }

  // Get all ReportProblem
  static async getReportProblemList(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    const { reportProblem: ReportProblemModel } = global.mongoModel;

    const sortType = req.query.sortType === "ascending" ? 1 : -1;
    let { sortBy, role, size, page, keyword, startDate, endDate } = req.query;
    let condition, sort;

    condition = [
      {
        $lookup: {
          from: "images",
          localField: "image",
          foreignField: "_id",
          as: "image",
        },
      },
      { $unwind: { path: "$image", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "motelRooms",
          localField: "motelRoom",
          foreignField: "_id",
          as: "motelRoom",
        },
      },
      { $unwind: { path: "$motelRoom", preserveNullAndEmptyArrays: true } },
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
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          isDeleted: 0,
          "user.password": 0,
          "user.token": 0,
          "user.isDeleted": 0,
          "user._v": 0,
        },
      },
      {
        $match: {
          // user: req["userId"],
          createdAt: {
            $gte: new Date(startDate.toString()), // lớn hơn
            $lte: new Date(endDate.toString()), // nhỏ hơn
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
        default:
          sort = { createdAt: -1 };
      }
      condition.push({ $sort: sort });
    }

    const resData = await ReportProblemModel.paginate(size, page, condition);
    if (resData && resData.data) {
      const dataArr = [];
      for (let index = 0; index < resData.data.length; index++) {
        const element = resData.data[index];
        const userId = req["userId"];

        if (userId.toString() == element.user._id) {
          dataArr.push(element);
        }
        if (element.image) {
          resData.data[index].image = await helpers.getImageUrl(element.image);
        }
      }

      resData.data = dataArr;
    }

    if (!resData) {
      return HttpResponse.returnBadRequestResponse(
        res,
        "Không có danh sách báo cáo sự cố không tồn tại"
      );
    }
    return HttpResponse.returnSuccessResponse(res, resData);
  }
  static async getReportProblemListHost(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    const { reportProblem: ReportProblemModel } = global.mongoModel;

    const sortType = req.query.sortType === "ascending" ? 1 : -1;
    let { sortBy, role, size, page, keyword, startDate, endDate } = req.query;
    let condition, sort;

    condition = [
      {
        $lookup: {
          from: "images",
          localField: "image",
          foreignField: "_id",
          as: "image",
        },
      },
      { $unwind: { path: "$image", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "motelRooms",
          localField: "motelRoom",
          foreignField: "_id",
          as: "motelRoom",
        },
      },
      { $unwind: { path: "$motelRoom", preserveNullAndEmptyArrays: true } },
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
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          isDeleted: 0,
          "user.password": 0,
          "user.token": 0,
          "user.isDeleted": 0,
          "user._v": 0,
        },
      },
      {
        $match: {
          createdAt: {
            $gte: new Date(startDate.toString()), // lớn hơn
            $lte: new Date(endDate.toString()), // nhỏ hơn
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
        default:
          sort = { createdAt: -1 };
      }
      condition.push({ $sort: sort });
    }

    const resData = await ReportProblemModel.paginate(size, page, condition);
    console.log("dataa", resData.data);
    if (resData && resData.data) {
      const dataArr = [];
      for (let index = 0; index < resData.data.length; index++) {
        const element = resData.data[index];
        const userId = req["userId"];
        if (userId.toString() == element.motelRoom.owner) {
          dataArr.push(element);
        }
        if (element.image) {
          resData.data[index].image = await helpers.getImageUrl(element.image);
        }
      }

      resData.data = dataArr;
    }

    if (!resData) {
      return HttpResponse.returnBadRequestResponse(
        res,
        "Không có danh sách báo cáo sự cố không tồn tại"
      );
    }
    return HttpResponse.returnSuccessResponse(res, resData);
  }

  static async getReportProblemListAdmin(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    const { reportProblem: ReportProblemModel } = global.mongoModel;

    const sortType = req.query.sortType === "ascending" ? 1 : -1;
    let { sortBy, role, size, page, keyword, startDate, endDate } = req.query;
    let condition, sort;

    condition = [
      {
        $lookup: {
          from: "images",
          localField: "image",
          foreignField: "_id",
          as: "image",
        },
      },
      { $unwind: { path: "$image", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "motelRooms",
          localField: "motelRoom",
          foreignField: "_id",
          as: "motelRoom",
        },
      },
      { $unwind: { path: "$motelRoom", preserveNullAndEmptyArrays: true } },
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
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          isDeleted: 0,
          "user.password": 0,
          "user.token": 0,
          "user.isDeleted": 0,
          "user._v": 0,
        },
      },
      {
        $match: {
          createdAt: {
            $gte: new Date(startDate.toString()), // lớn hơn
            $lte: new Date(endDate.toString()), // nhỏ hơn
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
        default:
          sort = { createdAt: -1 };
      }
      condition.push({ $sort: sort });
    }

    const resData = await ReportProblemModel.paginate(size, page, condition);
    if (resData && resData.data) {
      for (let index = 0; index < resData.data.length; index++) {
        const element = resData.data[index];
        if (element.image) {
          resData.data[index].image = await helpers.getImageUrl(element.image);
        }
      }
    }

    if (!resData) {
      return HttpResponse.returnBadRequestResponse(
        res,
        "Không có danh sách báo cáo sự cố không tồn tại"
      );
    }
    return HttpResponse.returnSuccessResponse(res, resData);
  }

  static async postUploadImgById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      //Init models
      const { reportProblem: ReportProblemModel } = global.mongoModel;

      let { id: id } = req.params;

      const imageService = new ImageService("local", false);

      // Process form data
      const processDataInfo = await imageService.processFormData(req, res);

      if (processDataInfo && processDataInfo.error) {
        return HttpResponse.returnBadRequestResponse(
          res,
          processDataInfo.error
        );
      }

      const { body: data } = req;

      // Upload image
      if (req["files"]) {
        data.images = {};
        const uploadResults = await imageService.upload(req["files"].file);
        if (uploadResults.error) {
          return HttpResponse.returnInternalServerResponseWithMessage(
            res,
            uploadResults.message
          );
        }
        let resData = await ReportProblemModel.findOneAndUpdate(
          { _id: id },
          {
            image: uploadResults.imageId,
          },
          {
            new: true,
          }
        ).lean();
      }

      return HttpResponse.returnSuccessResponse(res, data);
    } catch (e) {
      next(e);
    }
  }
  static async postChangeStatusById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      //Init models
      const { reportProblem: ReportProblemModel } = global.mongoModel;

      let { id: id } = req.params;

      const imageService = new ImageService("local", false);

      // Process form data
      const processDataInfo = await imageService.processFormData(req, res);

      if (processDataInfo && processDataInfo.error) {
        return HttpResponse.returnBadRequestResponse(
          res,
          processDataInfo.error
        );
      }

      const { body: data } = req;
      if (data) {
        await ReportProblemModel.findOneAndUpdate(
          { _id: id },
          {
            status: data.status,
          },
          {
            new: true,
          }
        ).lean();
      }

      return HttpResponse.returnSuccessResponse(res, data);
    } catch (e) {
      next(e);
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                             END HELPER FUNCTION                            */
  /* -------------------------------------------------------------------------- */
}
