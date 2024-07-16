import { NextFunction, Request, Response } from "express";
import ImageService from "../services/image";
import HttpResponse from "../services/response";
import cloudinary from "../utils/cloudinary";
export default class UploadImgController {
  static async postUpload(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const fileStr = req.body.data;
      const uploadResponse = await cloudinary.uploader.upload(fileStr, {
        upload_preset: "kjpadpuc",
      });
      // req.session = uploadResponse;
      if (req.session) {
        req.session = uploadResponse.public_id;
      }
      return HttpResponse.returnSuccessResponse(res, null);
    } catch (err) {
      console.error(err);
      res.status(500).json({ err: "err img" });
    }
  }
  static async getUpload(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    const { resources } = await cloudinary.search
      .expression("folder:img")
      .sort_by("public_id", "desc")
      .max_results(30)
      .execute();
    const publicIds = resources.map((file) => file.public_id);
    return HttpResponse.returnSuccessResponse(res, publicIds);
  }

  static async postUploadImgByRoomId(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      //Init models
      const {
        motelRoom: motelRoomModel,
        image: imageModel,
      } = global.mongoModel;
      
      console.log("TẢI ẢNH LÊN")

      let { id: motelRoomId } = req.params;

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

      console.log("ảnhhh", data);

      // Upload image
      if (req["files"]) {
        console.log("CÓ ẢNH")
        data.images = {};
        const uploadResults = await imageService.upload(req["files"].file);
        if (uploadResults.error) {
          return HttpResponse.returnInternalServerResponseWithMessage(
            res,
            uploadResults.message
          );
        }
        data.images.imageUrl = uploadResults.imageUrl;
        data.images.imageId = uploadResults.imageId;
      }

      return HttpResponse.returnSuccessResponse(res, data);
    } catch (e) {
      next(e);
    }
  }
  static async postUploadImgByRoomIdUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      //Init models
      const { user: userModel, image: imageModel } = global.mongoModel;

      let { id: id } = req.params;

      const imageService = new ImageService("local", false);

      // Process form data
      const processDataInfo = await imageService.processFormData(req, res);
      console.log({processDataInfo});

      if (processDataInfo && processDataInfo.error) {
        return HttpResponse.returnBadRequestResponse(
          res,
          processDataInfo.error
        );
      }

      const { body: data } = req;

      console.log({data});

      // Upload image
      if (req["files"]) {
        data.images = {};
        const uploadResults = await imageService.upload(req["files"].file);
        console.log("uploaded: ", uploadResults)
        if (uploadResults.error) {
          return HttpResponse.returnInternalServerResponseWithMessage(
            res,
            uploadResults.message
          );
        }
        data.images.imageUrl = uploadResults.imageUrl;
        data.images.imageId = uploadResults.imageId;
        
        let userData = await userModel.findOne({_id: id}).populate("avatar").lean().exec();
        console.log({userData});
        if(userData) {
          if(userData.avatar) {
            await imageService.remove(userData.avatar.path);
            console.log("REMOVED IMG");
          }
        }
        let resData = await userModel
          .findOneAndUpdate(
            { _id: id },
            {
              avatar: uploadResults.imageId,
            },
            {
              new: true,
              fields: { password: 0, token: 0 },
            }
          )
          .populate("avatar")
          .lean();
      }

      console.log("ĐÃ UPLOAD AVATAR")

      return HttpResponse.returnSuccessResponse(res, data);
    } catch (e) {
      next(e);
    }
  }

  static async postUploadImgByFrontIdUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      //Init models
      const { user: userModel } = global.mongoModel;

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
        data.images.imageUrl = uploadResults.imageUrl;
        data.images.imageId = uploadResults.imageId;
        let resData = await userModel
          .findOneAndUpdate(
            { _id: id },
            {
              frontId: uploadResults.imageId,
            },
            {
              new: true,
              fields: { password: 0, token: 0 },
            }
          )
          .populate("avatar")
          .lean();
      }

      return HttpResponse.returnSuccessResponse(res, data);
    } catch (e) {
      next(e);
    }
  }
  static async postUploadImgByOrder(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      //Init models
      const { order: orderModel } = global.mongoModel;

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
        data.images.imageUrl = uploadResults.imageUrl;
        data.images.imageId = uploadResults.imageId;
        let resData = await orderModel
          .findOneAndUpdate(
            { _id: id },
            {
              UNC: uploadResults.imageId,
            },
            {
              new: true,
              fields: { password: 0, token: 0 },
            }
          )
          .lean();
      }

      return HttpResponse.returnSuccessResponse(res, data);
    } catch (e) {
      next(e);
    }
  }
  static async postUploadImgByBackIdUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      //Init models
      const { user: userModel } = global.mongoModel;

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
        data.images.imageUrl = uploadResults.imageUrl;
        data.images.imageId = uploadResults.imageId;
        let resData = await userModel
          .findOneAndUpdate(
            { _id: id },
            {
              backId: uploadResults.imageId,
            },
            {
              new: true,
              fields: { password: 0, token: 0 },
            }
          )
          .populate("avatar")
          .lean();
      }

      return HttpResponse.returnSuccessResponse(res, data);
    } catch (e) {
      next(e);
    }
  }

  static async postUploadImgByRoomIdTransaction(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      //Init models
      const { transactions: TransactionsModel } = global.mongoModel;

      let { id: id } = req.params;
      console.log({id});

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
      console.log("check data from req", data);
      console.log("check data from req", data.formData);

      console.log("fill", req["files"]);


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
        console.log("check uploadResults", uploadResults);

        data.images.imageUrl = uploadResults.imageUrl;
        data.images.imageId = uploadResults.imageId;

        const resDataS = await TransactionsModel.findOneAndUpdate(
          { _id: id },
          { file: uploadResults.imageId }
        )
          .lean()
          .exec();
      }

      return HttpResponse.returnSuccessResponse(res, data);
    } catch (e) {
      next(e);
    }
  }

  static async postUploadImgPayDeposit(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      //Init models
      const { payDepositList: payDepositListModel } = global.mongoModel;

      let { id: id } = req.params;
      console.log({id});

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
      console.log("check data from req", data);
      console.log("check data from req", data.formData);

      console.log("fill", req["files"]);


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
        console.log("check uploadResults", uploadResults);

        data.images.imageUrl = uploadResults.imageUrl;
        data.images.imageId = uploadResults.imageId;

        const resDataS = await payDepositListModel.findOneAndUpdate(
          { _id: id },
          { file: uploadResults.imageId }
        )
          .lean()
          .exec();
      }

      return HttpResponse.returnSuccessResponse(res, data);
    } catch (e) {
      next(e);
    }
  }
}
