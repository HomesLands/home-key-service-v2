import { NextFunction, Request, Response } from "express";
const fetch = require('node-fetch');
import axios from 'axios';
import GoogleMapService from "../../services/googleMap";
import ImageService from "../../services/image";
import HttpResponse from "../../services/response";
import { helpers } from "../../utils";
import AddressController from "../address";
import * as mongoose from "mongoose";
import EnergyController from "./energy.controller";
import * as PdfPrinter from "pdfmake";
import moment = require("moment");
import BillController from "./bill.controller";
import { roomStatus } from "../../enums";
import { index } from "libs/typegoose";
const ObjectId = mongoose.Types.ObjectId;

export default class MotelRoomController {
  /**
   * @swagger
   * tags:
   *   - name: MotelRoom
   *     description: MotelRoom Control
   */

  /**
   * @swagger
   * /v1/homeKey/motelRoom/list:
   *   get:
   *     description: Get list motel room
   *     tags: [MotelRoom]
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
      let { sortBy, role, size, page, keyword } = req.query;
      size === null ? null : size;
      page === null ? null : page;
      const sortType = req.query.sortType === "ascending" ? 1 : -1;
      let condition, sort;

      condition = [
        {
          $match: {
            isAcceptedByAdmin: true
          }
        },
        {
          $lookup: {
            from: "addresses",
            localField: "address",
            foreignField: "_id",
            as: "address",
          },
        },
        { $unwind: { path: "$address", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "images",
            localField: "images",
            foreignField: "_id",
            as: "images",
          },
        },
        { $unwind: { path: "$images", preserveNullAndEmptyArrays: true } },
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
      console.log("getMotelRoomList");
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

  

  static async getMotelRoomPendingCensorList(
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
      let { sortBy, role, size, page, keyword } = req.query;
      size === null ? null : size;
      page === null ? null : page;
      const sortType = req.query.sortType === "ascending" ? 1 : -1;
      let condition, sort;

      condition = [
        {
          $match: {
            isAcceptedByAdmin: false,
            isDeleted: false,
          }
        },
        {
          $lookup: {
            from: "addresses",
            localField: "address",
            foreignField: "_id",
            as: "address",
          },
        },
        { $unwind: { path: "$address", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "images",
            localField: "images",
            foreignField: "_id",
            as: "images",
          },
        },
        { $unwind: { path: "$images", preserveNullAndEmptyArrays: true } },
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
      console.log("getMotelRoomList");
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
          if(resData["data"][i].owner) {
            if(resData["data"][i].owner.backId) {
              const backId = await imageModel.findOne({
                _id: resData["data"][i].owner.backId,
              });
              if (backId) {
                resData["data"][i].owner.backId = await helpers.getImageUrl(
                  backId
                );
              }
            }
            if(resData["data"][i].owner.frontId) {
              const frontId = await imageModel.findOne({
                _id: resData["data"][i].owner.frontId,
              });
              if (frontId) {
                resData["data"][i].owner.frontId = await helpers.getImageUrl(
                  frontId
                );
              }
            }
            if(resData["data"][i].owner.avatar) {
              const avatar = await imageModel.findOne({
                _id: resData["data"][i].owner.avatar,
              });
              if (avatar) {
                resData["data"][i].owner.avatar = await helpers.getImageUrl(
                  avatar
                );
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

  static async searchMotels(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const {
        motelRoom: motelRoomModel,
        image: imageModel,
        address: addressModel,
      } = global.mongoModel;
      const { body: data } = req;
      console.log({data});
      console.log("akjdjhfka", req.body)
      // const motelData = await motelRoomModel.find({ name: { $regex: data.name, $options: 'i' } }).lean().exec();

      //NAME
      // const sanitizedSearchString = data.name.replace(/\s+/g, '');
      // const motelData = await motelRoomModel.find({
      //   $expr: {
      //     $eq: [
      //       { $replaceAll: { input: { $toLower: "$name" }, find: " ", replacement: "" } },
      //       sanitizedSearchString.toLowerCase()
      //     ]
      //   },

      // }).lean().exec();
      // console.log({motelData});

      //PRICE: khoảng giá price1 <= minPirce <= price2
      // const motelDataPrice = await motelRoomModel.find({
      //   minPrice: {
      //     $gte: data.minPrice,
      //     $lte: data.maxPrice,
      //   }
      // }).lean().exec();


      //utilities: 
      // let defaultUtilities = 
      // ["wifi","bon_cau", "dieu_hoa", "truyen_hinh", "voi_hoa_sen",
      //   "giat_ui", "giu_xe", "gac_lung", "bon_rua_mat", "don_phong",
      //   "san_go", "tu_quan_ao", "gio_giac_tu_do", "loi_di_rieng"];

      // if(data.utilities) {
      //   if(data.utilities.length > 0) {
      //     defaultUtilities = data.utilities;
      //   }
      // }
      // const queryUtilities = [
      //   {
      //     $match: {
      //       utilities: {
      //         $elemMatch: { $in: defaultUtilities }
      //       }
      //     }
      //   },
      //   {
      //     $addFields: {
      //       matchedUtilitiesCount: {
      //         $size: {
      //           $setIntersection: ["$utilities", defaultUtilities]
      //         }
      //       }
      //     }
      //   },
      //   {
      //     $sort: {
      //       matchedUtilitiesCount: -1
      //     }
      //   },
      //   {
      //     $project: {
      //       matchedUtilitiesCount: 0
      //     }
      //   }
      // ]; 
      // const motelDataUtilities = await motelRoomModel.aggregate(queryUtilities);

      // const handlePlaceSelect = async (place) => {
      //   try {
      //     if (place === '') {
      //       place = 'Linh Trung, Thủ Đức'
      //     }

      //     const encodedAddress = encodeURIComponent(place);
      //     const response = await fetch(
      //       `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${process.env.GOOGLE_MAP_API_KEY}`
      //     );
      //     const data = await response.json();
      //     console.log({data});
      //     const { lat, lng } = data.results[0].geometry.location;
      //     // setCurrentPosition({ lat: lat, lng: lng });
      //     console.log("VỊ TRÍIIII", data);
      //     console.log("VỊ TRÍIIII", lat);
      //     console.log("VỊ TRÍIIII", lng);
      //     // setCoordinates({ lat, lng });
      //   } catch (error) {
      //     console.error('Error fetching coordinates:', error);
      //     // setCurrentPosition({ lat: 10.856866, lng: 106.763324 });
      //   }
      // };

      // handlePlaceSelect(data.address);

      // if (data.address === '') {
      //   data.address = 'Viet Nam'
      // }

      // // const encodedAddress = encodeURIComponent(data.address);
      // const response = await fetch(
      //   `https://maps.googleapis.com/maps/api/geocode/json?address=${data.address}&key=${process.env.GOOGLE_MAP_API_KEY}`
      // );
      // const addressRespone = await response.json();
      // console.log({addressRespone});
      // const { lat, lng } = addressRespone.results[0].geometry.location;
      // // setCurrentPosition({ lat: lat, lng: lng });
      // console.log("VỊ TRÍIIII", addressRespone);
      // console.log("VỊ TRÍIIII", lat);
      // console.log("VỊ TRÍIIII", lng);

      // const address = {
      //   lat: lat,
      //   lng: lng,
      // };

      //TONG
      let defaultUtilities = 
      ["wifi","bon_cau", "dieu_hoa", "truyen_hinh", "voi_hoa_sen",
        "giat_ui", "giu_xe", "gac_lung", "bon_rua_mat", "don_phong",
        "san_go", "tu_quan_ao", "gio_giac_tu_do", "loi_di_rieng"];

      if(data.utilities) {
        if(data.utilities.length > 0) {
          defaultUtilities = data.utilities;
        }
      }
      const query = [
        {
          $match: {
            utilities: {
              $elemMatch: { $in: defaultUtilities }
            },
            minPrice: {
              $gte: data.minPrice,
              $lte: data.maxPrice,
            }
          }
        },
        {
          $addFields: {
            matchedUtilitiesCount: {
              $size: {
                $setIntersection: ["$utilities", defaultUtilities]
              }
            }
          }
        },
        {
          $sort: {
            matchedUtilitiesCount: -1
          }
        },
        {
          $lookup: {
            from: 'addresses', // Tên của collection chứa địa chỉ
            localField: 'address', // Trường trong motelRoomModel chứa _id của địa chỉ
            foreignField: '_id', // Trường _id trong collection addresses
            as: 'address' // Tên trường mới chứa dữ liệu được populate
          }
        },
        {
          $unwind: {
            path: "$address",
            preserveNullAndEmptyArrays: true // Giữ lại document nếu không có địa chỉ phù hợp
          }
        },
        {
          $project: {
            matchedUtilitiesCount: 0
          }
        }
      ]; 

      let motelData = await motelRoomModel.aggregate(query);

      const dataRes = {
        listMotel: motelData,
        // address: address,
      }

      const test = await motelRoomModel.find({_id: "6640d72626fe12180875ab82"}).populate("address").lean().exec();
      console.log({test});
      console.log(test[0].address);


      return HttpResponse.returnSuccessResponse(
        res,
        dataRes
      )
    } catch (error) {
      next(error);
    }
  }

  static async censorNewMotelById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init user model`
      const {
        motelRoom: motelRoomModel,
      } = global.mongoModel;
      
      // const id = req.params.id;

      console.log("TỚI ĐÂYYY")

      let { body: data } = req;

      console.log({data});

      if(!data) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Không có dữ liệu"
        )
      }

      const motelData = await motelRoomModel.findOne({_id: data.idMotel}).lean().exec();

      if(!motelData) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Tòa nhà không tồn tại"
        )
      }

      console.log("alsdkjf", typeof(data.status));

      if(data.status === true) {
        const motelDataUpdate = await motelRoomModel.findOneAndUpdate(
          {_id: data.idMotel},
          {
            isAcceptedByAdmin: true,
          },
          {new: true}
        );
        return HttpResponse.returnSuccessResponse(res, motelDataUpdate);
      } else if(data.status === false) {
        const motelDataUpdate = await motelRoomModel.findOneAndUpdate(
          {_id: data.idMotel},
          {
            isDeleted: true,
            isAcceptedByAdmin: false,
          },
          {new: true}
        );
        return HttpResponse.returnSuccessResponse(res, motelDataUpdate);
      }
      return HttpResponse.returnSuccessResponse(res, 'hihihi');
    } catch (e) {
      next(e);
    }
  }

  static async getMotelRoomListByOwner(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init user model`
      const idOwner = req.params.id;
      console.log({idOwner});

      const {
        motelRoom: motelRoomModel,
        image: imageModel,
      } = global.mongoModel;

      let resData = [];

      resData = await motelRoomModel.find({owner: idOwner}).populate("address").lean().exec();

      if(resData) {
        if(resData.length > 0) {
          for(let i = 0; i < resData.length; i++) {
            if (resData[i].images && (resData[i].images.length > 0)) {
              const dataimg = await imageModel.findOne({
                _id: resData[i].images[0],
              });
              if (dataimg) {
                resData[i].file = await helpers.getImageUrl(dataimg);
              } else {
                resData[i].file = null;
              }
            } else {
              resData[i].file = null;
            }
          }
        }
      }
      console.log({resData});

      if(!resData) {
        resData = [];
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
      let { sortBy, role, size, page, keyword } = req.query;
      size === null ? null : size;
      page === null ? null : page;
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

      let resData = helpers.changeTimeZone(
        await motelRoomModel.paginate(size, page, condition)
      );
      console.log(2222);
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

          const idMotelRom = resData["data"][i]._id;
          resData["data"][
            i
          ].dataPayment = await MotelRoomController.getMotelRoomByIdMotelRoom(
            idMotelRom
          );
        }
      }

      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      next(e);
    }
  }
  static async getMotelRoomByIdMotelRoom(IdMotelRoom) {
    const { job: jobModel } = global.mongoModel;
    const { order: orderModel } = global.mongoModel;
    const sortBy = null;
    const size = null;
    const page = null;
    const sortType = 1;
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
          "motelRoom._id": mongoose.Types.ObjectId(IdMotelRoom),
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
    return resData;
  }
  /**
   * @swagger
   * definitions:
   *   MotelRoom:
   *     properties:
   *       name:
   *         type:  string
   *         description: name of motel room
   *       address:
   *         type:  string
   *         description: motel room address
   *       contactPhone:
   *         type:  string
   *         description: phone number to contact (Format:+84xxxxxxxxx)
   *       floors:
   *         type:  array
   *         items:
   *           type:  number
   *         description: list total room per floor
   *       rentedRoom:
   *         type:  number
   *         description: number of rented room
   *       depositedRoom:
   *         type:  number
   *         description: number of deposited room
   *       rooms:
   *         type:  array
   *         items:
   *           type:  object
   *           properties:
   *             roomKey:
   *                type:  string
   *                description: Example F1-R1
   *             availableDate:
   *                type:  string
   *                description: MM/DD/YYYY
   *         description: list available room object
   *       roomAcreage:
   *         type:  number
   *         description: acreage of room (m2)
   *       minPrice:
   *         type:  number
   *         description: minimum price of motel room
   *       maxPrice:
   *         type:  number
   *         description: maximum price of motel room
   *       electricityPrice:
   *         type:  number
   *         description: electricity price of motel room
   *       waterPrice:
   *         type:  number
   *         description: water price of motel room
   *       utilities:
   *         type:  array
   *         items:
   *           type:  string
   *         description: list of utilities
   *       description:
   *         type:  string
   *         description: description of motel room
   */

  /**
   * @swagger
   * /v1/homeKey/motelRoom:
   *   post:
   *     description: Create motel room
   *     tags: [MotelRoom]
   *     parameters:
   *       - name: body
   *         in: body
   *         required:  true
   *         description: motel room data
   *         schema:
   *           type:  object
   *           $ref: '#definitions/MotelRoom'
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

  static async createMotelRoom(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init  models
      const {
        motelRoom: motelRoomModel,
        user: userModel,
        floor: floorModel,
        room: roomModel,
        address: addressModel,
        image: imageModel,
      } = global.mongoModel;

      let { body: data } = req;

      const ownerData = await userModel.findOne({_id: req["userId"]}).lean().exec();

      if(!ownerData.isCensorHost) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Tài khoản chủ trọ chưa được phê duyệt, không thể tạo tòa nhà"
        )
      }

      const googleMap = new GoogleMapService();

      const googleMapData = await googleMap.getAddressDetail(data.address);

      const addressData = await AddressController.createAddress(
        googleMapData.results[0]
      );

      let rentedRoomMotel = parseInt(data.rentedRoom);
      let depositedRoomRoomMotel = parseInt(data.depositedRoom);

      let initMotelRoomData = {
        name: data.name,
        address: addressData._id,
        contactPhone: data.contactPhone,
        owner: req["userId"],
        totalFloor: data.floors.length,
        totalRoom: 0,
        availableRoom: 0,
        rentedRoom: parseInt(data.rentedRoom),
        depositedRoom: parseInt(data.depositedRoom),
        roomAcreage: parseInt(data.roomAcreage),
        price: (parseInt(data.minPrice) + parseInt(data.maxPrice)) / 2,
        minPrice: parseInt(data.minPrice),
        maxPrice: parseInt(data.maxPrice),
        electricityPrice: data.electricityPrice,
        waterPrice: data.waterPrice,
        garbagePrice: data.garbagePrice,
        wifiPrice: data.wifiPrice,
        wifiPriceN: data.wifiPriceN,
        description: data.description,
        floors: [],
        utilities: data.utilities,
        // images: ''
        images: (await imageModel.find({ description: "motel" })).map(
          (image) => image._id
        ),
      };

      let nCompletedFloors = 0;
      for (let i = 0; i < initMotelRoomData.totalFloor; i++) {
        initMotelRoomData.totalRoom += data.floors[i];
        let initFloorData = {
          name: `Tầng ${i + 1}`,
          key: `F${i + 1}`,
          totalRoom: data.floors[i],
          availableRoom: 0,
          rentedRoom: 0,
          depositedRoom: 0,
          rooms: [],
        };

        let nCompletedRooms = 0;
        for (let j = 0; j < initFloorData.totalRoom; j++) {
          const roomKey = `00${j + 1}`.slice(-2);
          let initRoomData = {
            name: `${roomKey}`,
            key: `F${i + 1}-R${j + 1}`,
            // status: 'unknown',
            status: "available",
            price: initMotelRoomData.price,
            electricityPrice: initMotelRoomData.electricityPrice,
            waterPrice: initMotelRoomData.waterPrice,
            wifiPrice: initMotelRoomData.wifiPrice,
            wifiPriceN: initMotelRoomData.wifiPriceN,
            garbagePrice: initMotelRoomData.garbagePrice,
            utilities: initMotelRoomData.utilities,
            acreage: data.roomAcreage,
            isCompleted: true,
            // Mã Khóa Phòng
            roomPassword: helpers.generateVerifyCode(),
            images: (await imageModel.find({ description: "room" })).map(
              (image) => image._id
            ),
          };

          const roomData = data.rooms.find((data1) => {
            return data1.roomKey === initRoomData.key;
          });

          if (roomData) {
            initRoomData["availableDate"] = new Date(roomData.availableDate);
            initRoomData["status"] = "available";
            initRoomData["isCompleted"] = true;
            initFloorData.availableRoom += 1;
          } else {
            if (rentedRoomMotel != 0) {
              if (depositedRoomRoomMotel != 0) {
                initRoomData["status"] = "deposited";
                depositedRoomRoomMotel--;
              } else {
                initRoomData["status"] = "rented";
                rentedRoomMotel--;
              }
            }
            // else {
            //     initRoomData['status'] = 'unknown';
            // }
          }

          const newRoomData = await roomModel.create(initRoomData);

          initFloorData.rooms.push(newRoomData._id.toString());
          if (newRoomData.status !== "unknown") {
            nCompletedRooms += 1;
          }
          // Set Phòng trống cho tầng
          initFloorData.availableRoom += 1;
        }

        if (nCompletedRooms === initFloorData.totalRoom) {
          initFloorData["isCompleted"] = true;
          nCompletedFloors += 1;
        }

        const newFloorData = await floorModel.create(initFloorData);
        initMotelRoomData.floors.push(newFloorData._id.toString());
      }

      initMotelRoomData.availableRoom =
        initMotelRoomData.totalRoom -
        initMotelRoomData.rentedRoom -
        initMotelRoomData.depositedRoom;

      data.owner = req["userId"];

      if (nCompletedFloors === initMotelRoomData.totalFloor) {
        initMotelRoomData["isCompleted"] = true;
      }

      let resData = await motelRoomModel.create(initMotelRoomData);

      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      // Pass error to the next middleware

      next(e);
    }
  }

  /**
   * @swagger
   * /v1/homeKey/motelRoom/{id}:
   *   get:
   *     description: Return motel room by id
   *     tags: [MotelRoom]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: id
   *         in: path
   *         required:  true
   *         type:  string
   *         description: motel room id
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

  static async getMotelRoomById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const {
        floor: floorModel,
        motelRoom: motelRoomModel,
      } = global.mongoModel;
      let { id: motelRoomId } = req.params;
      console.log(117);

      const motelData = await MotelRoomController.getMotelRoom(motelRoomId);
      let availableRoom = 0;
      let rentedRoom = 0;
      let depositedRoom = 0;

      if (motelData && motelData.floors) {
        for (let index = 0; index < motelData.floors.length; index++) {
          const element = motelData.floors[index];
          let availableRoomFloors = 0;
          let rentedRoomFloors = 0;
          let depositedRoomFloors = 0;
          if (element.rooms) {
            for (let indexK = 0; indexK < element.rooms.length; indexK++) {
              const elementK = element.rooms[indexK];
              if (elementK.status === roomStatus.DEPOSITED) {
                depositedRoomFloors++;
              } else if (
                elementK.status === roomStatus.AVAILABLE ||
                elementK.status === roomStatus.UNKNOWN
              ) {
                availableRoomFloors++;
              } else {
                rentedRoomFloors++;
              }
            }
            // update floors
            await floorModel
              .findOneAndUpdate(
                { _id: element._id },
                {
                  rentedRoom: rentedRoomFloors,
                  availableRoom: availableRoomFloors,
                  depositedRoom: depositedRoomFloors,
                },
                { new: true }
              )
              .exec();
            availableRoom = availableRoom + availableRoomFloors;
            rentedRoom = rentedRoom + rentedRoomFloors;
            depositedRoom = depositedRoom + depositedRoomFloors;
          }
        }
        // update mptel
        await motelRoomModel
          .findOneAndUpdate(
            { _id: motelData._id },
            {
              rentedRoom: rentedRoom,
              availableRoom: availableRoom,
              depositedRoom: depositedRoom,
            }
          )
          .exec();
      }
      return HttpResponse.returnSuccessResponse(
        res,
        await MotelRoomController.getMotelRoom(motelRoomId)
      );
    } catch (e) {
      next(e);
    }
  }

  static async getMotelRoomVisualDataById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const {
        floor: floorModel,
        motelRoom: motelRoomModel,
      } = global.mongoModel;
      let { id: motelRoomId } = req.params;

      const motelData = await motelRoomModel.findOne({_id: motelRoomId}).lean().exec();

      if(!motelData) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Tòa nhà không tồn tại"
        )
      }

      if(!motelData.floors) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Tòa nhà không có tầng nào"
        )
      }
      let floorData = [];
      const floors = motelData.floors;
      for(let i = 0; i<floors.length; i ++) {
        let floor = await floorModel.findOne({_id: floors[i]}).populate("rooms").lean().exec();
        if(floor) {
          floorData.push(floor);
        }
      }

      // motelData.floors = floorData;

      return HttpResponse.returnSuccessResponse(res, floorData);
    } catch (e) {
      next(e);
    }
  }

  static async getMotelRoomByIdAndFloor(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const {
        floor: floorModel,
        motelRoom: motelRoomModel,
      } = global.mongoModel;
      let { id: motelRoomId, floor } = req.params;
      const indexFloor : number = parseInt(floor);
      console.log({floor});

      const motelData = await motelRoomModel.findOne({_id: motelRoomId}).lean().exec();
      if(!motelData) {
        return HttpResponse.returnSuccessResponse(res, []);
      }

      if(!motelData.floors) {
        return HttpResponse.returnSuccessResponse(res, []);
      }

      if(motelData.floors.length === 0) {
        return HttpResponse.returnSuccessResponse(res, []);
      }

      if(motelData.floors.length < (indexFloor + 1)) {
        return HttpResponse.returnSuccessResponse(res, []);
      }

      const floorData = await floorModel.findOne({_id: motelData.floors[indexFloor]}).populate("rooms").lean().exec();

      if(!floorData) {
        return HttpResponse.returnSuccessResponse(res, []);
      }

      if(!floorData.rooms) {
        return HttpResponse.returnSuccessResponse(res, []);
      }

      if(floorData.rooms.length === 0) {
        return HttpResponse.returnSuccessResponse(res, []);
      }

      return HttpResponse.returnSuccessResponse(res, floorData.rooms);
    } catch (e) {
      next(e);
    }
  }

  static async getMotelRoomByIdV2(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const {
        floor: floorModel,
        motelRoom: motelRoomModel,
        image: imageModel,
      } = global.mongoModel;
      let { id: motelRoomId } = req.params;

      const motelRoomData = await motelRoomModel.findOne({_id: motelRoomId}).populate("address").lean().exec();

      if(motelRoomData) {
        if (motelRoomData.images && (motelRoomData.images.length > 0)) {
          let images = [];
          for(let i = 0; i < motelRoomData.images.length; i++) {
            const dataimg = await imageModel.findOne({
              _id: motelRoomData.images[i],
            });
            if (dataimg) {
              images.push(await helpers.getImageUrl(dataimg));
            } 
          }
          motelRoomData.images = images;
        }
      }

      console.log({motelRoomData});
      return HttpResponse.returnSuccessResponse(res, motelRoomData);
    } catch (e) {
      next(e);
    }
  }

  static async getMotelRoomByIdDetail(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const {
        room: roomModel,
        motelRoom: motelRoomModel,
        floor: floorModel,
        job: jobModel,
        user: userModel,
      } = global.mongoModel;
      let { id: motelRoomId, idroom } = req.params;
      let { startDate, endDate } = req.query;

      const jobData = await jobModel
        .find({
          room: idroom,
          isCompleted: true,
          checkInTime: {
            $gte: new Date(startDate.toString()), // lớn hơn
            $lt: new Date(endDate.toString()), // nhỏ hơn
          },
        })
        .populate("room orders currentOrder")
        .lean()
        .exec();
      if (jobData) {
        for (let i = 0; i < jobData.length; i++) {
          const user = jobData[i].user;
          let userData = await userModel
            .findOne(
              { _id: user, isDeleted: false },
              { password: 0, token: 0, role: 0 }
            )
            .populate("backId frontId avatar")
            .lean()
            .exec();
          console.log({userData});
          if (userData) {
            if(userData.backId) {
              userData.backId = await helpers.getImageUrl(userData.backId);
            }
            if(userData.frontId) {
              userData.frontId = await helpers.getImageUrl(userData.frontId);
            }
            if(userData.avatar) {
              userData.avatar = await helpers.getImageUrl(userData.avatar);
            }
            jobData[i].user = userData;
          }

          console.log({userData})
        }
      }

      console.log({jobData})

      return HttpResponse.returnSuccessResponse(res, jobData);
    } catch (e) {
      next(e);
    }
  }
  static async getMotelRoomByIdRoom(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const {
        room: roomModel,
        motelRoom: motelRoomModel,
        floor: floorModel,
        job: jobModel,
        user: userModel,
        image: imageModel,
      } = global.mongoModel;
      let { id: motelRoomId, idroom, idUser } = req.params;
      const jobData = await jobModel
        .find({
          room: idroom,
          // user: idUser,
          isCompleted: true,
          // checkInTime: {
          //   $gte: new Date(startDate.toString()), // lớn hơn
          //   $lt: new Date(endDate.toString()), // nhỏ hơn
          // },
        })
        .populate("room orders currentOrder")
        .lean()
        .exec();
      const resData = [];
      if (jobData) {
        for (let i = 0; i < jobData.length; i++) {
          const user = jobData[i].user;
          if (user == idUser) {
            let userData = await userModel
              .findOne(
                { _id: user, isDeleted: false },
                { password: 0, token: 0, role: 0 }
              )
              .lean()
              .exec();
            if (userData) {
              jobData[i].user = userData;
            }
            // get motelRoom
            let motelRoomData = await motelRoomModel
              .findOne({ _id: motelRoomId })
              .populate("floors")
              .lean()
              .exec();
            if (motelRoomData) {
              jobData[i].motelRoomData = motelRoomData;
              jobData[i].motelRoomData.emailOwner = "";
              let userDataOwner = await userModel
                .findOne(
                  { _id: jobData[i].motelRoomData.owner, isDeleted: false },
                  { password: 0, token: 0, role: 0 }
                )
                .lean()
                .exec();
              if (userDataOwner && userDataOwner.address) {
                jobData[i].motelRoomData.emailOwner = userDataOwner.address;
              }
            }
            //
            if (jobData[i].room) {
              const room = jobData[i].room;
              if (room) {
                if (room.images) {
                  if (room.images.length > 0) {
                    for (let j = 0; j < room.images.length; j++) {
                      const dataimg = await imageModel.findOne({
                        _id: room.images[j],
                      });
                      if (dataimg) {
                        jobData[i].room.images[j] = await helpers.getImageUrl(
                          dataimg
                        );
                      }
                    }
                  }
                }
              }
            }

            resData.push(jobData[i]);
            break;
          }
        }
      }

      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      next(e);
    }
  }

  static async getAllDataForBill(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    console.log("ÁDLKHFADJKSHFLKJHA")
    try {
      const {
        room: roomModel,
        motelRoom: motelRoomModel,
        floor: floorModel,
        job: jobModel,
        user: userModel,
        image: imageModel,
      } = global.mongoModel;
      let { id: motelRoomId, idroom, idUser, startDate, endDate } = req.params;

      const jobData = await jobModel
        .find({
          room: idroom,
          // user: idUser,
          isCompleted: true,
          // checkInTime: {
          //   $gte: new Date(startDate.toString()), // lớn hơn
          //   $lt: new Date(endDate.toString()), // nhỏ hơn
          // },
        })
        .populate("room orders currentOrder")
        .lean()
        .exec();
      const resData = [];
      if (jobData) {
        for (let i = 0; i < jobData.length; i++) {
          const user = jobData[i].user;
          if (user == idUser) {
            let userData = await userModel
              .findOne(
                { _id: user, isDeleted: false },
                { password: 0, token: 0, role: 0 }
              )
              .lean()
              .exec();
            if (userData) {
              jobData[i].user = userData;
            }
            // get motelRoom
            let motelRoomData = await motelRoomModel
              .findOne({ _id: motelRoomId })
              .populate("floors")
              .lean()
              .exec();
            if (motelRoomData) {
              jobData[i].motelRoomData = motelRoomData;
              jobData[i].motelRoomData.emailOwner = "";
              let userDataOwner = await userModel
                .findOne(
                  { _id: jobData[i].motelRoomData.owner, isDeleted: false },
                  { password: 0, token: 0, role: 0 }
                )
                .lean()
                .exec();
              if (userDataOwner && userDataOwner.address) {
                jobData[i].motelRoomData.emailOwner = userDataOwner.address;
              }
            }
            //
            if (jobData[i].room) {
              const room = jobData[i].room;
              if (room) {
                if (room.images) {
                  if (room.images.length > 0) {
                    for (let j = 0; j < room.images.length; j++) {
                      const dataimg = await imageModel.findOne({
                        _id: room.images[j],
                      });
                      if (dataimg) {
                        jobData[i].room.images[j] = await helpers.getImageUrl(
                          dataimg
                        );
                      }
                    }
                  }
                }
                // if(room.listIdElectricMetter) {
                  let start : string = moment().startOf("month").format("YYYY-MM-DD");
                  if(moment(jobData.checkInTime).month() === (moment().month() + 1)) {
                    start = moment(jobData.checkInTime).format("YYYY-MM-DD");
                  }
                  let end: string = moment().format("YYYY-MM-DD");

                  if(startDate !== 'undefined') {
                    start = moment(startDate).format("YYYY-MM-DD");
                  }
                  if(endDate !== 'undefined') {
                    end = moment(endDate).format("YYYY-MM-DD");
                  }
                  
                  // if(room.listIdElectricMetter.length > 0) {
                    let electricNumber = 0;
                    let labelTime: string[] = [];
                    let kWhData: number[] = [];

                    const resResult = await EnergyController.calculateElectricUsedDayToDayHaveLabelTime(
                      room._id,
                      start,
                      end,
                    );
                    console.log({resResult})
                    if(resResult === null) {
                      electricNumber = 0;
                      jobData[i].electricNumber = electricNumber;
                      jobData[i].labelTime = labelTime;
                      jobData[i].kWhData = kWhData;
                      jobData[i].dayStart = moment(new Date(start)).format("DD/MM/YYYY");
                      jobData[i].dayEnd = moment(new Date(end)).format("DD/MM/YYYY");
                    } else {
                      electricNumber = resResult.totalkWhTime;
                      jobData[i].electricNumber = electricNumber;
                      labelTime = resResult.labelTime;
                      kWhData = resResult.kWhData;
                      jobData[i].labelTime = labelTime;
                      jobData[i].kWhData = kWhData;
                      jobData[i].dayStart = moment(new Date(start)).format("DD/MM/YYYY");
                      jobData[i].dayEnd = moment(new Date(end)).format("DD/MM/YYYY");
                    }
                  // }
                // }
                // if(room.listIdElectricMetter) {
                //   let start : string = moment().startOf("month").format("YYYY-MM-DD");
                //   if(moment(jobData.checkInTime).month() === (moment().month() + 1)) {
                //     start = moment(jobData.checkInTime).format("YYYY-MM-DD");
                //   }
                //   let end: string = moment().format("YYYY-MM-DD");

                //   if(startDate !== 'undefined') {
                //     start = moment(startDate).format("YYYY-MM-DD");
                //   }
                //   if(endDate !== 'undefined') {
                //     end = moment(endDate).format("YYYY-MM-DD");
                //   }
                //   let numberOfElectric = null;
                  
                //   if(room.listIdElectricMetter.length > 0) {
                //     console.log("qure", start);
                //     const resResult = await EnergyController.calculateElectricUsedDayToDayHaveLabelTime(
                //       room._id,
                //       start,
                //       end,
                //     );
                //     if(resResult) {
                //       numberOfElectric = resResult.totalkWhTime;
                //       jobData[i].numberOfElectric = numberOfElectric;
                //       // jobData[i].dayStart = moment(new Date(start)).format("DD-MM-YYYY");
                //       jobData[i].dayStart = moment(new Date(start)).format("DD/MM/YYYY");
                //       // jobData[i].dayEnd = moment().format("DD-MM-YYYY");
                //       jobData[i].dayEnd = moment(new Date(end)).format("DD/MM/YYYY");
                //     }
                //   }
                //   console.log({start});
                //   console.log({end});
                // }
              }
            }

            resData.push(jobData[i]);
            break;
          }
        }
      }

      console.log({startDate});
      console.log({endDate});

      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /v1/homeKey/motelRoom/{id}:
   *   put:
   *     description: Edit motelRoom by id
   *     tags: [MotelRoom]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: id
   *         in: path
   *         required:  true
   *         type:  string
   *         description: motel room id
   *       - name: contactPhone
   *         in: formData
   *         required: false
   *         type: string
   *         description: contactPhone
   *       - name: file
   *         in: formData
   *         required:  false
   *         type:  file
   *         description: image lists
   *       - name: minPrice
   *         in: formData
   *         required: false
   *         type: number
   *         description: minPrice
   *       - name: maxPrice
   *         in: formData
   *         required: false
   *         type: number
   *         description: maxPrice
   *       - name: electricityPrice
   *         in: formData
   *         required: false
   *         type: number
   *         description: electricityPrice
   *       - name: waterPrice
   *         in: formData
   *         required: false
   *         type: number
   *         description: waterPrice
   *       - name: description
   *         in: formData
   *         required: false
   *         type: string
   *         description: description
   *       - name: address
   *         in: formData
   *         required: false
   *         type: string
   *         description: address
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

  static async editMotelRoomById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const {
        motelRoom: motelRoomModel,
        image: imageModel,
      } = global.mongoModel;

      let { id: motelRoomId } = req.params;

      const imageService = new ImageService("local", true);

      // Process form data
      const processDataInfo = await imageService.processFormData(req, res);

      if (processDataInfo && processDataInfo.error) {
        return HttpResponse.returnBadRequestResponse(
          res,
          processDataInfo.error
        );
      }

      const { body: data } = req;
      console.log("data motel", data);

      const arrayRemoveImg = data.formData.removedImg;

      if (arrayRemoveImg.length > 0) {
        const motelRoomData = await motelRoomModel
          .findOne({ _id: motelRoomId })
          .lean()
          .exec();

        if (motelRoomData.images.length > 0) {
          for (let i = 0; i < motelRoomData.images.length; i++) {
            const dataImgRemove = await imageModel.findOne({
              _id: motelRoomData.images[i],
            });
            const pathLocal = await helpers.getImageUrl(dataImgRemove);
            for (let j = 0; j < arrayRemoveImg.length; j++) {
              if (pathLocal === arrayRemoveImg[j]) {
                motelRoomData.images.splice(i, 1);
                i--; //lùi lại để kiểm tra được ảnh phòng tiếp theo liền kề với ảnh đã bị xóa, ảnh sau đã dồn vào ảnh bị xóa
                break;
              }
            }
          }
        }
        // update image Remove
        const imageRemove = motelRoomData.images;
        await motelRoomModel
          .findOneAndUpdate(
            { _id: motelRoomId },
            {
              images: imageRemove,
            }
          )
          .lean()
          .exec();
      }

      return HttpResponse.returnSuccessResponse(
        res,
        await MotelRoomController.updateMotelRoom(motelRoomId, data)
      );
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /v1/homeKey/motelRoom/{id}:
   *   delete:
   *     description: Return motel room by id
   *     tags: [MotelRoom]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: id
   *         in: path
   *         required:  true
   *         type:  string
   *         description: motel room id
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

  static async deleteMotelRoom(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      //Init model
      const {
        motelRoom: motelRoomModel,
        floor: floorModel,
        room: roomModel,
      } = global.mongoModel;

      let { id: motelRoomId } = req.params;

      const motelRoomData = await MotelRoomController.getMotelRoom(motelRoomId);

      if (!motelRoomData) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "motelRoom.not.exist"
        );
      }

      if (motelRoomData.floors) {
        for (let i = 0; i < motelRoomData.floors.length; i++) {
          if (motelRoomData.floors[i].rooms) {
            for (let j = 0; j < motelRoomData.floors[i].rooms.length; j++) {
              if (
                ["rented", "deposited"].includes(
                  motelRoomData.floors[i].rooms[j].status
                )
              ) {
                return HttpResponse.returnBadRequestResponse(
                  res,
                  "floor.room.is.rented"
                );
              }
            }
          }
        }
      }

      return HttpResponse.returnSuccessResponse(
        res,
        await motelRoomModel
          .remove({ _id: motelRoomId })
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

  // Get motel room by id Ơ
  static async getMotelRoom(motelRoomId: any): Promise<any> {
    const {
      motelRoom: motelRoomModel,
      image: imageModel,
      room: roomModel,
      job: jobModel,
      user: userModel,
    } = global.mongoModel;

    let motelRoomData = await motelRoomModel
      .findOne({ _id: motelRoomId })
      .populate([
        {
          path: "floors",
          populate: "rooms",
        },
      ])
      .populate("address images")
      .lean()
      .exec();
    if (motelRoomData.images) {
      motelRoomData.images = helpers.getImageUrl(motelRoomData.images, true);
    }

    motelRoomData = helpers.changeTimeZone(motelRoomData);
    for (let i = 0; i < motelRoomData.floors.length; i++) {
      const floorsList = motelRoomData.floors[i];
      for (let j = 0; j < floorsList.rooms.length; j++) {
        const roomsList = floorsList.rooms[j];

        const DataJob = await jobModel
          .findOne({ room: roomsList._id })
          .populate("room orders images")
          .lean()
          .exec();
        if (DataJob) {
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
          }
        }

        const imageArr = [];
        for (let k = 0; k < roomsList.images.length; k++) {
          const dataimg = await imageModel.findOne({
            _id: roomsList.images[k],
          });
          if (dataimg) {
            imageArr.push(await helpers.getImageUrl(dataimg));
          }
        }
        motelRoomData.floors[i].rooms[j].images = imageArr;
        motelRoomData.floors[i].rooms[j].jobs = DataJob;
      }
    }

    return motelRoomData;
  }

  // Update motel room by id
  // static async updateMotelRoom(motelRoomId: any, rawData: any, idImg: any): Promise<any>
  static async updateMotelRoom(motelRoomId: any, rawData: any): Promise<any> {
    let data = rawData.formData;
    console.log("data updateMotelRoom", data);
    if (!data.address.address) {
      const googleMap = new GoogleMapService();
      const googleMapData = await googleMap.getAddressDetail(data.address);
      const addressData = await AddressController.createAddress(
        googleMapData.results[0]
      );
      data["address"] = addressData._id;
    }

    const { motelRoom: motelRoomModel } = global.mongoModel;

    data["minPrice"] = parseInt(data.minPrice);
    data["maxPrice"] = parseInt(data.maxPrice);
    data["price"] = (data.minPrice + data.maxPrice) / 2;

    // Find data of user
    return await motelRoomModel
      .findOneAndUpdate({ _id: motelRoomId }, data, { new: true })
      .populate([
        {
          path: "floors",
          populate: "rooms",
        },
      ])
      .populate("address")
      .lean()
      .exec();
  }

  // // Post search Find MotelRoom from Address
  static async postSearchMortelRoom(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const data = req.params.key;

      const {
        address: addressModel,
        motelRoom: motelRoomModel,
      } = global.mongoModel;

      const datares = await addressModel.aggregate([
        {
          $search: {
            index: "address",
            text: {
              query: data,
              path: {
                wildcard: "*",
              },
            },
          },
        },
      ]);

      const arrAddresses = [];
      datares.forEach((element) => {
        arrAddresses.push(element._id);
      });

      let resArrData = [];

      if (arrAddresses.length < 0) {
        return HttpResponse.returnBadRequestResponse(res, "Không có phòng nào");
      } else {
        for (let i = 0; i < arrAddresses.length; i++) {
          const motelRoomData = await motelRoomModel
            .findOne({ address: arrAddresses[i] })
            .populate("address")
            .populate("images")
            .lean()
            .exec();
          if (motelRoomData) {
            const image = helpers.getImageUrl(motelRoomData.images, true);
            motelRoomData.images = image;
            resArrData.push(motelRoomData);
          }
        }
      }
      return HttpResponse.returnSuccessResponse(res, resArrData);
    } catch (e) {
      next(e);
    }
  }

  static async postExportPdf(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    console.log("ĐÃ TẢI XONG HÓA ĐƠN")
    try {
      const { banking: BankingModel, image: imageModel } = global.mongoModel;
      const data = [];
      const nameFile = "Thien";
      let fileName = `${nameFile}.pdf`;
      const json = req.body;
      console.log("json", json);
      // insert db
      const ress = await BillController.insertDb(json, req["userId"]);

      console.log("ress", ress)
      if (ress && ress.error) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Mã Hóa Đơn Đã Tồn Tại"
        );
      }

      let resData = await BankingModel.find()
        .populate("images")
        .lean()
        .exec();
      if (resData.length <= 0) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Chưa Có Tài Khoản Nhận Tiền Liên Hệ Admin"
        );
      }

      console.log("resData[0]", resData[0]);
      const buffer = await generatePDF(json, resData[0]);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Dispsition", "attachment;filename=" + fileName);

      res.send(buffer);
    } catch (e) {
      next(e);
    }
  }

  static async postCreateOrderAndExportPdf(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const { 
        banking: BankingModel,
        image: imageModel,
        job: jobModel,
        order: orderModel,
        totalKwh: totalKwhModel,
        floor: floorModel,
        room: roomModel,
      } = global.mongoModel;
      const data = [];
      const nameFile = "Thien";
      let fileName = `${nameFile}.pdf`;
      const json = req.body;
      console.log("json", json);
      console.log("json", json.idRoom);
      console.log("json", json.idUser);

      const jobData = await jobModel.findOne({
        isDeleted: false,
        room: json.idRoom,
        // user: json.idUser,
        isCompleted: true,
      }).populate("currentOrder").lean().exec();

      if(!jobData) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Hợp đồng không tồn tại"
        )
      }

      // if(jobData.currentOrder) {
      //   if(jobData.currentOrder.isCompleted === true) {
      //     const orderData = await orderModel.create({
      //       user: json.idUser,
      //       job: jobData._id,
      //       isCompleted: false,
      //       electricNumber: json.typeElectricity,
      //       electricPrice: json.totalElectricity,
      //       numberDayStay: json.typeRoom,
      //       waterPrice: json.totalWater,
      //       servicePrice: json.totalGarbage,
      //       vehiclePrice: json.totalWifi,
      //       roomPrice: json.totalRoom,
      //       description: `Tiền phòng từ ${json.dayStart} đến ${json.dayEnd}`,
      //       amount: json.totalAndTaxAll,
      //       type: "monthly",
      //       startTime: moment(json.dayStart, "DD/MM/YYYY").toDate(),
      //       endTime: moment(json.dayEnd, "DD/MM/YYYY").toDate(),
      //       expireTime: moment(json.dayEnd, "DD/MM/YYYY").toDate(), //note: để tạm
      //     });

      //     // await totalKwhModel.create({
      //     //   order: orderData._id,
      //     //   kWhData: kWhData,
      //     //   labelTime: labelTime,
      //     // });
  
      //     // resData = await jobModel.findOneAndUpdate(
      //     //   { _id: jobData._id },
      //     //   {
      //     //     $addToSet: { orders: orderData._id },
      //     //     currentOrder: orderData._id,
      //     //     status: "pendingMonthlyPayment",
      //     //   },
      //     //   { new: true }
      //     // );


      //   } else {
      //     return HttpResponse.returnBadRequestResponse(
      //       res,
      //       "Hóa đơn hiện tại chưa được thanh toán, vui lòng yêu cầu khách hàng thanh toán trước khi tạo hóa đơn tiếp theo"
      //     )
      //   }
      // }
      console.log("curremtOrder", jobData.currentOrder);
      if(jobData.currentOrder) {
        // const currentOrder = await orderModel.findOne({_id: jobData.currentOrder}).lean().exec();

        if(jobData.currentOrder.isCompleted === true) {
          console.log("Tajo moiws")
          console.log({json});
          const orderData = await orderModel.create({
            user: json.idUser,
            job: jobData._id,
            isCompleted: false,
            electricNumber: json.typeElectricity,
            electricPrice: json.totalElectricity,
            numberDayStay: json.typeRoom,
            waterPrice: json.totalWater,
            servicePrice: json.totalGarbage,
            vehiclePrice: json.totalWifi,
            roomPrice: json.totalRoom,
            description: `Tiền phòng từ ${json.dayStart} đến ${json.dayEnd}`,
            amount: json.totalAndTaxAll,
            type: "monthly",
            startTime: moment(json.dayStart, "DD/MM/YYYY").toDate(),
            endTime: moment(json.dayEnd, "DD/MM/YYYY").toDate(),
            expireTime: moment(json.dayEnd, "DD/MM/YYYY").toDate(), //note: để tạm
          });

          await totalKwhModel.create({
            order: orderData._id,
            kWhData: json.kWhData,
            labelTime: json.labelTime,
          });
  
          await jobModel.findOneAndUpdate(
            { _id: jobData._id },
            {
              $addToSet: { orders: orderData._id },
              currentOrder: orderData._id,
              status: "pendingMonthlyPayment",
            },
            { new: true }
          );

          const roomData = await roomModel.findOne({_id: json.idRoom}).lean().exec();

          const floorData = await floorModel.findOne({rooms: json.idRoom}).lean().exec();

          const energy = {
            labelTime: json.labelTime,
            kWhData: json.kWhData,
          }


    
          const banking = [];
          // const buffer = await generateOrderMonthlyPendingPayPDF(json,banking, energy);
          const buffer = await getBufferOrderMonthly(orderData, jobData, roomData, floorData);

          res.setHeader("Content-Type", "application/pdf");
          res.setHeader("Content-Dispsition", "attachment;filename=" + fileName);
          res.send(buffer);
          
        } else {
          console.log("Chwua thanh toan")
          return HttpResponse.returnBadRequestResponse(
            res,
            "Hóa đơn hiện tại chưa được thanh toán, vui lòng yêu cầu khách hàng thanh toán trước khi tạo hóa đơn tiếp theo"
          )
        }
      }





      // console.log({jobData})

      
      // // insert db
      // const ress = await BillController.insertDb(json, req["userId"]);

      // // console.log("ress", ress)
      // if (ress && ress.error) {
      //   return HttpResponse.returnBadRequestResponse(
      //     res,
      //     "Mã Hóa Đơn Đã Tồn Tại"
      //   );
      // }

      // let resData = await BankingModel.find()
      //   .populate("images")
      //   .lean()
      //   .exec();
      // if (resData.length <= 0) {
      //   return HttpResponse.returnBadRequestResponse(
      //     res,
      //     "Chưa Có Tài Khoản Nhận Tiền Liên Hệ Admin"
      //   );
      // }

      // console.log("resData[0]", resData[0]);
      // const buffer = await generatePDF(json, resData[0]);

      

    } catch (e) {
      next(e);
    }
  }

  static async postExportPdfById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const { banking: BankingModel, image: imageModel } = global.mongoModel;
      const nameFile = "Thien";
      let fileName = `${nameFile}.pdf`;
      let json = req.body;
      let { id: idBill } = req.params;
      const dataBill = await BillController.getBillById(idBill);

      if (!dataBill) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Mã Hóa Đơn Đã Tồn Tại"
        );
      }
      console.log(dataBill.user);
      json = dataBill;

      json.expenseRoom = dataBill.room.expense;
      json.typeRoom = dataBill.room.type;
      json.unitPriceRoom = dataBill.room.unitPrice;
      json.totalRoom = dataBill.room.total;

      json.expenseRoom = dataBill.room.expense;
      json.typeRoom = dataBill.room.type;
      json.unitPriceRoom = dataBill.room.unitPrice;
      json.totalRoom = dataBill.room.total;

      json.expenseElectricity = dataBill.electricity.expense;
      json.typeElectricity = dataBill.electricity.type;
      json.unitPriceElectricity = dataBill.electricity.unitPrice;
      json.totalElectricity = dataBill.electricity.total;

      json.expenseWater = dataBill.water.expense;
      json.typeWater = dataBill.water.type;
      json.unitPriceWater = dataBill.water.unitPrice;
      json.totalWater = dataBill.water.total;

      json.expenseGarbage = dataBill.garbage.expense;
      json.typeGarbage = dataBill.garbage.type;
      json.unitPriceGarbage = dataBill.garbage.unitPrice;
      json.totalGarbage = dataBill.garbage.total;

      json.expenseWifi = dataBill.wifi.expense;
      json.typeWifi = dataBill.wifi.type;
      json.unitPriceWifi = dataBill.wifi.unitPrice;
      json.totalWifi = dataBill.wifi.total;

      json.expenseOther = dataBill.other.expense;
      json.typeOther = dataBill.other.type;
      json.unitPriceOther = dataBill.other.unitPrice;
      json.totalOther = dataBill.other.total;

      let resData = await BankingModel.find()
        .populate("images")
        .lean()
        .exec();
      if (resData.length <= 0) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Chưa Có Tài Khoản Nhận Tiền Liên Hệ Admin"
        );
      }
      const buffer = await generatePDF(json, resData[0]);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Dispsition", "attachment;filename=" + fileName);
      res.send(buffer);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /v1/homeKey/room/{id}/img:
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

      // Upload image
      if (req["files"]) {
        const uploadResults = await imageService.upload(req["files"].file);
        if (uploadResults.error) {
          return HttpResponse.returnInternalServerResponseWithMessage(
            res,
            uploadResults.message
          );
        }
        const imageArr = [];
        imageArr.push(uploadResults.imageId);
        // data.images.imageUrl = uploadResults.imageUrl;
        // data.images.imageId = uploadResults.imageId;
        const resData = await motelRoomModel
          .findOneAndUpdate(
            { _id: motelRoomId },
            // {
            //   images: imageArr,
            // },
            {
              $addToSet: {
                images: uploadResults.imageId
              },
            },
            {
              new: true,
            }
          )
          .populate("images")
          .lean()
          .exec();
      }

      return HttpResponse.returnSuccessResponse(res, data);
    } catch (e) {
      next(e);
    }
  }

  static async postUploadImgsByRoomId(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      //Init models
      const { room: roomModel } = global.mongoModel;

      let { id: roomId } = req.params;

      const imageService = new ImageService("local", false);

      // Process form data
      const processDataInfo = await imageService.processFormData(req, res);

      if (processDataInfo && processDataInfo.error) {
        return HttpResponse.returnBadRequestResponse(
          res,
          processDataInfo.error
        );
      }

      let resDataOld = await roomModel
        .findOne({ _id: roomId })
        .populate("images")
        .lean()
        .exec();

      if (!resDataOld) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Phòng không tồn tại"
        );
      }
      let resData = resDataOld;
      // Upload image
      if (req["files"]) {
        console.log("fillleeee", req["files"]);
        const uploadResults = await imageService.upload(req["files"].file);
        if (uploadResults.error) {
          return HttpResponse.returnInternalServerResponseWithMessage(
            res,
            uploadResults.message
          );
        }

        console.log({uploadResults});

        const dataIMG = resDataOld.images || [];
        dataIMG.push(uploadResults.imageId);
        console.log({dataIMG});

        resData = await roomModel
          .findOneAndUpdate(
            { _id: roomId },
            // {
            //   images: dataIMG,
            // },
            {
              $addToSet: {
                images: uploadResults.imageId
              },
            },
            {
              new: true,
            }
          )
          .populate("images")
          .lean()
          .exec();
      }

      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      next(e);
    }
  }

  //note
  static async getBuildingListByHost(req: Request, res: Response, next: NextFunction): Promise<any> {
    const id = req.params.id;
    console.log("id", id);
    console.log("-------------------------------------------");

    const { motelRoom: motelRoomModel, address: addressModel } = global.mongoModel;

    try {
      const resData = await motelRoomModel
        .find({ owner: id })
        // .populate("address")
        .lean()
        .exec();

      console.log("resDataaa: ", resData);

      const formattedData = await Promise.all(resData.map(async (element) => {
        console.log("element", element);

        const addressId = mongoose.Types.ObjectId(element.address);
        const addressData = await addressModel.findOne({ _id: element.address }).lean().exec();
        if (addressData) {
          console.log("check doc: ", element)
          return {
            ...element,
            addressName: addressData.address,

          }
        }

        return {
          ...element._doc,
          addressName: ''
        };
      }));
      console.log("formattedData", formattedData);

      return HttpResponse.returnSuccessResponse(res, formattedData);
    } catch (e) {
      next(e);
    }
  }




  /* -------------------------------------------------------------------------- */
  /*                             END HELPER FUNCTION                            */
  /* -------------------------------------------------------------------------- */

}
async function generatePDF(json, banking) {
  console.log("banking", banking);

  return new Promise((resolve, reject) => {
    let fontpathnormal = __dirname + "/fonts/roboto/Roboto-Regular.ttf";
    let fontpathbold = __dirname + "/fonts/roboto/Roboto-Medium.ttf";
    let fontpathitalics = __dirname + "/fonts/roboto/Roboto-Italic.ttf";
    let fontpathbolditalics =
      __dirname + "/fonts/roboto/Roboto-MediumItalic.ttf";
    var fonts = {
      Roboto: {
        normal: fontpathnormal,
        bold: fontpathbold,
        italics: fontpathitalics,
        bolditalics: fontpathbolditalics,
      },
    };
    const parsedDate = moment(json.dateBill, "DD/MM/YYYY");
    const month = parsedDate.format("MM");
    const year = parsedDate.format("YYYY");
    const lastDayOfMonth = parsedDate.endOf("month").format("DD");
    var docDefinition = {
      pageMargins: [40, 60, 40, 60],
      content: [
        {
          text: `HÓA ĐƠN THÁNG ${month}`,
          style: "header",
          alignment: "center",
        },
        {
          alignment: "justify",
          style: "margin10",
          columns: [
            {
              text: [
                {
                  text: `KHÁCH SẠN ${json.nameMotel}\n`,
                  fontSize: 15,
                  bold: true,
                  color: "red",
                },
                {
                  text: `Tên khách hàng: ${json.nameUser}\n`,
                },
                {
                  text: `Số điện thoại khách hàng: ${json.phoneUser}\n`,
                },
                {
                  text: `Địa chỉ: ${json.address}`,
                },
              ],
            },
            {
              alignment: "right",
              text: [
                {
                  text: `Phòng ${json.nameRoom}\n`,
                  fontSize: 12,
                  bold: true,
                  color: "red",
                },
                {
                  text: `Mã Hóa Đơn ${json.idBill}\n`,
                },
                {
                  text: `Ngày ${json.dateBill}\n`,
                },
              ],
            },
          ],
        },
        {
          text:
            "................................................................................",
          alignment: "center",
        },
        {
          style: "tableExample",
          alignment: "center",
          table: {
            widths: [159, 100, "*", "*"],
            body: [
              [
                {
                  text: "Mục",
                  bold: true,
                  alignment: "left",
                },
                {
                  text: "Số ngày/Đơn vị",
                  bold: true,
                },
                {
                  text: "Đơn Giá",
                  bold: true,
                },
                {
                  text: "Thành Tiền",
                  bold: true,
                },
              ],
              [
                {
                  text: `${json.expenseRoom}`,
                  alignment: "left",
                },
                {
                  text: `${json.typeRoom}`,
                },
                {
                  text: `${json.unitPriceRoom} đ`,
                },
                {
                  text: `${json.totalRoom} đ`,
                },
              ],
              [
                {
                  text: `${json.expenseElectricity}`,
                  alignment: "left",
                },
                {
                  text: `${json.typeElectricity}`,
                },
                {
                  text: `${json.unitPriceElectricity} đ`,
                },
                {
                  text: `${json.totalElectricity} đ`,
                },
              ],
              [
                {
                  text: `${json.expenseWater}`,
                  alignment: "left",
                },
                {
                  text: `${json.typeWater}`,
                },
                {
                  text: `${json.unitPriceWater} đ`,
                },
                {
                  text: `${json.totalWater} đ`,
                },
              ],
              [
                {
                  text: `${json.expenseWifi}`,
                  alignment: "left",
                },
                {
                  text: `${json.typeWifi}`,
                },
                {
                  text: `${json.unitPriceWifi} đ`,
                },
                {
                  text: `${json.totalWifi} đ`,
                },
              ],
              [
                {
                  text: `${json.expenseGarbage}`,
                  alignment: "left",
                },
                {
                  text: `${json.typeGarbage}`,
                },
                {
                  text: `${json.unitPriceGarbage} đ`,
                },
                {
                  text: `${json.totalGarbage} đ`,
                },
              ],
              [
                {
                  text: `${json.expenseOther}`,
                  alignment: "left",
                },
                {
                  text: `${json.typeOther}`,
                },
                {
                  text: `${json.unitPriceOther}`,
                },
                {
                  text: `${json.totalOther}`,
                },
              ],
              [
                {
                  text: "",
                  alignment: "left",
                },
                {
                  text: "",
                },
                {
                  text: "Tổng cộng:",
                  fontSize: 12,
                  bold: true,
                },
                {
                  text: `${json.totalAll} đ`,
                },
              ],
              [
                {
                  text: "",
                  alignment: "left",
                },
                {
                  text: "",
                },
                {
                  text: `Thuế (${json.typeTaxAll})):`,
                  fontSize: 12,
                  bold: true,
                },
                {
                  text: `${json.totalTaxAll} đ`,
                },
              ],
              [
                {
                  text: "",
                  alignment: "left",
                },
                {
                  text: "",
                },
                {
                  text: `TỔNG TIỀN:`,
                  fontSize: 12,
                  bold: true,
                },
                {
                  text: `${json.totalAndTaxAll} đ`,
                },
              ],
            ],
          },
          layout: "noBorders",
        },

        {
          text:
            "................................................................................",
          alignment: "center",
        },
        {
          alignment: "justify",
          style: "margin10",
          columns: [
            {
              text: [
                {
                  text: "Thông tin thanh toán\n",
                  fontSize: 15,
                  bold: true,
                  color: "red",
                },
                {
                  text: `${banking.nameTkLable}\n`,
                },
                {
                  text: `Tên Tài Khoản: ${banking.nameTk}\n`,
                },
                {
                  text: `Số tài khoản: ${banking.stk}\n`,
                },
                {
                  text: `Hạn thanh toán: ${lastDayOfMonth}/${month}/${year}`,
                },
              ],
            },
          ],
        },
        {
          alignment: "justify",
          style: "margin10",
          columns: [
            {
              text: [
                {
                  text: "Thông tin liên hệ\n",
                  fontSize: 15,
                  bold: true,
                  color: "red",
                },
                {
                  text: `Email: ${json.emailOwner}\n`,
                },
                {
                  text: `Địa chỉ: ${json.address}\n`,
                },
                {
                  text: `Số điện thoại: ${json.phoneUser}\n`,
                },
              ],
            },
          ],
        },
      ],
      styles: {
        header: {
          fontSize: 30,
          bold: true,
          alignment: "justify",
        },
        margin10: {
          margin: [10, 10, 10, 10],
        },
        tableExample: {
          margin: [0, 5, 0, 15],
        },
      },
    };

    let printer = new PdfPrinter(fonts);
    let pdfDoc = printer.createPdfKitDocument(docDefinition);
    // buffer the output
    let chunks = [];
    pdfDoc.on("data", (chunk: any) => {
      chunks.push(chunk);
    });
    pdfDoc.on("end", () => {
      var result = Buffer.concat(chunks);
      resolve(result);
    });
    pdfDoc.on("error", (error) => {
      reject(error);
    });
    // close the stream
    pdfDoc.end();
  });
}


async function getBufferOrderMonthly(
  orderData: any,
  jobData: any,
  roomData: any,
  floorData: any,
): Promise<any>{
  const {
    motelRoom: motelRoomModel,
    room: roomModel,
    address: addressModel,
    user: userModel,
    banking: BankingModel,
    job: jobModel,
    transactions: TransactionsModel,
    order: orderModel,
    floor: floorModel,
    totalKwh: totalKwhModel,
  } = global.mongoModel;
  const motelData = await motelRoomModel.findOne({floors: floorData._id}).populate("owner address").lean().exec();
  console.log({motelData});

  const motelOwner = motelData.owner;
  const emailOwner = motelOwner.email;
  const phoneOwner =
    motelOwner.phoneNumber.countryCode + motelOwner.phoneNumber.number;
  const addressOwner = motelOwner.address;

  const adminData = await userModel.findOne({role: "master"}).lean().exec();

  let banking = await BankingModel.find({ user: adminData._id }) //trả về mảng
    .lean()
    .exec();
  // const banking = await BankingModel.find({ user: motelOwner._id }) //trả về mảng
  //   .lean()
  //   .exec();

  //Nếu đã yêu cầu thanh toán => đã có transaction => đã chọn ngân hàng
  const transactionData = await TransactionsModel.findOne({order: orderData._id}).lean().exec();
  if(transactionData) {
    let tempBanking = await BankingModel.findOne({ _id: transactionData.banking })
    .lean()
    .exec();

    if(tempBanking) {
      banking = [];
      banking.push(tempBanking);
    }
  }

  const nameMotel = motelData.name;
  const motelAddress = motelData.address.address;
  const nameRoom = roomData.name;

  console.log("Tớiiiiii")

  if(orderData.type === "monthly")  {
    console.log("Tới 1")
    // const totalkWhTime = await EnergyController.calculateElectricUsedDayToDayHaveLabelTime(
    //   roomData._id,
    //   moment(new Date(orderData.startTime)).format("YYYY-MM-DD"),
    //   moment(new Date(orderData.endTime)).format("YYYY-MM-DD")
    // );

    const totalkWhTime = await totalKwhModel.findOne({
      order: orderData._id,
    }).lean().exec();


    // // //Thông số
    const idBill: string = orderData.keyOrder;
    const numberDayStay = orderData.numberDayStay;

    const unitPriceRoom = roomData.price;
    const unitPriceElectricity = roomData.electricityPrice;
    const unitPriceWater = roomData.waterPrice;
    const unitPriceGarbage = roomData.garbagePrice; // dịch vụ
    const unitPriceWifi = roomData.wifiPrice; // xe
    const unitPriceOther = 0;

    const typeRoom: number = orderData.numberDayStay;
    const typeWater: number = roomData.person;
    const typeGarbage: string = "1";
    const typeWifi: number = roomData.vihicle;
    const typeOther = 0;
    let typeElectricity: number = orderData.electricNumber;

    const totalAll = parseInt(orderData.amount);
    const totalAndTaxAll = parseInt(orderData.amount);
    const totalRoom = parseInt(orderData.roomPrice);
    const totalWifi = parseInt(orderData.vehiclePrice);
    const totalGarbage = parseInt(orderData.servicePrice); // service
    const totalWater = parseInt(orderData.waterPrice);
    const totalElectricity = parseInt(orderData.electricPrice);

    const parsedTime = moment(new Date(orderData.createdAt)).format("DD/MM/YY"); //ngày tạo

    const expireTime = moment(new Date(orderData.expireTime)).format("DD/MM/YYYY");
    const startTime = moment(new Date(orderData.createdAt)).format("DD/MM/YYYY");

    let json = {};

    if (roomData.rentedBy) {
      const userId = roomData.rentedBy;
      const userInfor = await userModel
        .findOne({ _id: userId })
        .lean()
        .exec();

      const nameUser = userInfor.lastName + userInfor.firstName;
      const phoneUser =
        userInfor.phoneNumber.countryCode +
        " " +
        userInfor.phoneNumber.number;
      const addressUser = userInfor.address;
      const emailUser = userInfor.email;


      json = {
        numberDayStay: numberDayStay,

        idBill: idBill, 
        phoneOwner,
        startTime: startTime,
        expireTime: expireTime,
        dateBill: parsedTime,
        nameMotel: nameMotel,
        addressMotel: motelAddress,
        nameRoom: nameRoom,
        nameUser: nameUser,
        phoneUser: phoneUser,
        addressUser: addressUser,
        imgRoom: "",
        addressOwner: addressOwner,
        emailUser: emailUser,
        emailOwner: emailOwner,

        totalAll: totalAll,

        totalAndTaxAll: totalAndTaxAll,

        totalTaxAll: 0,
        typeTaxAll: 0,
        expenseRoom: "Chi Phí Phòng",
        typeRoom: typeRoom,
        unitPriceRoom: unitPriceRoom,
        totalRoom: totalRoom,

        expenseElectricity: "Chi Phí Điện",
        typeElectricity: typeElectricity,
        unitPriceElectricity: unitPriceElectricity,
        totalElectricity: totalElectricity,

        expenseWater: "Chi Phí Nước",
        typeWater: typeWater,
        unitPriceWater: unitPriceWater,
        totalWater: totalWater,

        expenseGarbage: "Phí Dịch Vụ",
        typeGarbage: typeGarbage,
        unitPriceGarbage: unitPriceGarbage,
        totalGarbage: totalGarbage,

        expenseWifi: "Chi Phí Xe",
        typeWifi: typeWifi,
        unitPriceWifi: unitPriceWifi,
        totalWifi: totalWifi,

        expenseOther: "Tiện Ích Khác",
        typeOther: typeOther,
        unitPriceOther: unitPriceOther,
        totalOther: typeOther * unitPriceOther,
      };

      const nameFile = `Invoice - ${nameMotel} - ${nameRoom} from ${moment(new Date(orderData.startTime)).format("DD-MM-YYYY")} to ${moment(new Date(orderData.endTime)).format("DD-MM-YYYY")}`;
      let fileName = `${nameFile}.pdf`;

      const buffer = await generateOrderMonthlyPendingPayPDF(json, banking[0], totalkWhTime);

      // Export chartjs to pdf
      // const configuration: ChartConfiguration = {
      //   type: "line",
      //   data: {
      //     labels: totalkWhTime.labelTime.map((item) =>
      //       item ? item : "Chưa có dữ liệu"
      //     ),
      //     datasets: [
      //       {
      //         // label: `Tổng số điện từ ${startTime} đến ${endTime}`,
      //         label: `Tổng số điện từ ${moment(new Date(orderData.startTime)).format("DD-MM-YYYY")} đến ${moment(new Date(orderData.endTime)).format("DD-MM-YYYY")}`,
      //         data: totalkWhTime.kWhData,
      //         backgroundColor: ["rgba(255, 99, 132, 0.2)"],
      //         borderColor: ["rgba(255,99,132,1)"],
      //         borderWidth: 1,
      //         tension: 0.01,
      //         fill: false,
      //       },
      //     ],
      //   },
      //   options: {
      //     scales: {
      //       x: {
      //         title: {
      //           display: true,
      //           text: "Thời gian",
      //         },
      //       },
      //       y: {
      //         title: {
      //           display: true,
      //           text: "Số KwH",
      //         },
      //       },
      //     },
      //   },
      //   plugins: [
      //     {
      //       id: "background-colour",
      //       beforeDraw: (chart) => {
      //         const ctx = chart.ctx;
      //         ctx.save();
      //         ctx.fillStyle = "white";
      //         ctx.fillRect(0, 0, width, height);
      //         ctx.restore();
      //       },
      //     },
      //     {
      //       id: "chart-data-labels",
      //       afterDatasetsDraw: (chart, args, options) => {
      //         const { ctx } = chart;
      //         ctx.save();

      //         // Configure data labels here
      //         chart.data.datasets.forEach((dataset, i) => {
      //           const meta = chart.getDatasetMeta(i);
      //           meta.data.forEach((element, index) => {
      //             const model = element;
      //             const x = model.x;
      //             const y = model.y;
      //             const text = dataset.data[index]
      //               ? (+dataset.data[index].toString()).toFixed(2)
      //               : ""; // You can customize this based on your data
      //             const font = "12px Arial"; // Example font setting
      //             const fillStyle = "black"; // Example color setting
      //             const textAlign = "center"; // Example alignment setting

      //             ctx.fillStyle = fillStyle;
      //             ctx.font = font;
      //             ctx.textAlign = textAlign;
      //             ctx.fillText(text, x, y);
      //           });
      //         });

      //         ctx.restore();
      //       },
      //     },
      //   ],
      // };
      // const chartBufferPNG = await chartJSNodeCanvas.renderToBuffer(
      //   configuration
      // );
      // const mergedBuffer = await mergeBuffer(buffer, chartBufferPNG);
      // console.log({ mergedBuffer: Buffer.from(mergedBuffer) });

      
      // res.send(mergedBuffer);
      return buffer;
    }
  }
}
async function generateOrderMonthlyPendingPayPDF(json, banking, energy): Promise<Buffer> {
  console.log({ banking });
  return new Promise((resolve, reject) => {
    let fontpathnormal = __dirname + "/fonts/roboto/Roboto-Regular.ttf";
    let fontpathbold = __dirname + "/fonts/roboto/Roboto-Medium.ttf";
    let fontpathitalics = __dirname + "/fonts/roboto/Roboto-Italic.ttf";
    let fontpathbolditalics =
      __dirname + "/fonts/roboto/Roboto-MediumItalic.ttf";
    var fonts = {
      Roboto: {
        normal: fontpathnormal,
        bold: fontpathbold,
        italics: fontpathitalics,
        bolditalics: fontpathbolditalics,
      },
    };
    const parsedDate = moment(json.startTime, "DD/MM/YYYY");
    const month = parsedDate.format("MM");
    const year = parsedDate.format("YYYY");
    const lastDayOfMonth = parsedDate.endOf("month").format("DD");
    const tableBody = [];
    for (let i = 0; i < energy.labelTime.length; i++) {
      const time = energy.labelTime[i] || "Không có dữ liệu";
      //check if time is valid and convert to DD/MM/YYYY format
      const parsedTime = time ? moment(time).format("DD/MM/YYYY") : "0";
      const kWh = energy.kWhData[i];
      const formattedKWh = kWh ? kWh.toFixed(3) : "0";
      const totalPrice = (kWh || 0) * 3900; // Tính giá tiền từ số kWh và giá điện (3900 đ/kWh)
      //convert totalPrice to x.000
      const formattedTotalPrice = totalPrice
        .toFixed(0)
        .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      tableBody.push([
        parsedTime || "0",
        formattedKWh || "0",
        formattedTotalPrice,
      ]); // Thêm dữ liệu vào mỗi hàng của bảng
    }

    var docDefinition = {
      pageMargins: [40, 60, 40, 60],
      content: [
        {
          columns: [
            {
              width: 80, // Cột này sẽ có độ rộng cố định là 100
              image: __dirname + "/homeland-logo.jpg",
              alignment: "left",
            },
            {
              width: "auto", // Cột này sẽ co giãn để vừa với nội dung
              stack: [
                {
                  text: `HÓA ĐƠN THÁNG ${month}`,
                  style: "header",
                  alignment: "center",
                },
              ],
              alignment: "center",
              margin: [40, 24, 0, 0], // Duy trì khoảng cách giữa cột này và cột tiếp theo
            },
          ],
        },

        {
          alignment: "justify",
          margin: [6, 0, 0, 0],
          columns: [
            {
              text: [
                {
                  text: `HomeLand\n`,
                  fontSize: 15,
                  bold: true,
                  color: "gray",
                },
              ],
            },
          ],
        },
        {
          text:
            "_______________________________________________________________________________________________",
          alignment: "center",
          margin: [0, 10, 0, 10],
        },

        {
          alignment: "justify",
          style: "margin10",
          columns: [
            {
              text: [
                {
                  text: `KHÁCH SẠN ${json.nameMotel}\n`,
                  fontSize: 15,
                  bold: true,
                  color: "red",
                },
                {
                  text: `Địa chỉ: ${json.addressMotel}\n\n`,
                },
                {
                  text: `Tên khách hàng: ${json.nameUser}\n`,
                },
                {
                  text: `Email: ${json.emailUser}\n`,
                },
                {
                  text: `Số điện thoại khách hàng: ${json.phoneUser}\n`,
                },
                {
                  text: `Địa chỉ: ${json.addressUser}`,
                },
              ],
            },
            {
              alignment: "right",
              text: [
                {
                  text: `Phòng ${json.nameRoom}\n`,
                  fontSize: 12,
                  bold: true,
                  color: "red",
                },
                {
                  text: `Mã Hóa Đơn: ${json.idBill}\n`,
                },
                {
                  text: `Ngày: ${json.dateBill}\n`,
                },
              ],
            },
          ],
        },
        {
          text:
            "................................................................................",
          alignment: "center",
        },
        {
          style: "tableExample",
          alignment: "center",
          table: {
            widths: [159, 100, "*", "*"],
            body: [
              [
                {
                  text: "Mục",
                  bold: true,
                  alignment: "left",
                },
                {
                  text: "Số ngày/Đơn vị",
                  bold: true,
                },
                {
                  text: "Đơn Giá",
                  bold: true,
                },
                {
                  text: "Thành Tiền",
                  bold: true,
                },
              ],
              [
                {
                  text: `${json.expenseRoom}`,
                  alignment: "left",
                },
                {
                  text: `${json.typeRoom}`,
                },
                {
                  text: `${json.unitPriceRoom} đ`,
                },
                {
                  text: `${json.totalRoom} đ`,
                },
              ],
              [
                {
                  text: `${json.expenseElectricity}`,
                  alignment: "left",
                },
                {
                  text: `${json.typeElectricity}`,
                },
                {
                  text: `${json.unitPriceElectricity} đ`,
                },
                {
                  text: `${json.totalElectricity} đ`,
                },
              ],
              [
                {
                  text: `${json.expenseWater}`,
                  alignment: "left",
                },
                {
                  text: `${json.typeWater}`,
                },
                {
                  text: `${json.unitPriceWater} đ`,
                },
                {
                  text: `${json.totalWater} đ`,
                },
              ],
              [
                {
                  text: `${json.expenseWifi}`,
                  alignment: "left",
                },
                {
                  text: `${json.typeWifi}`,
                },
                {
                  text: `${json.unitPriceWifi} đ`,
                },
                {
                  text: `${json.totalWifi} đ`,
                },
              ],
              [
                {
                  text: `${json.expenseGarbage}`,
                  alignment: "left",
                },
                {
                  text: `${json.typeGarbage}`,
                },
                {
                  text: `${json.unitPriceGarbage} đ`,
                },
                {
                  text: `${json.totalGarbage} đ`,
                },
              ],
              [
                {
                  text: `${json.expenseOther}`,
                  alignment: "left",
                },
                {
                  text: `${json.typeOther}`,
                },
                {
                  text: `${json.unitPriceOther}`,
                },
                {
                  text: `${json.totalOther}`,
                },
              ],
              [
                {
                  text: "",
                  alignment: "left",
                },
                {
                  text: "",
                },
                {
                  text: "Tổng cộng:",
                  fontSize: 12,
                  bold: true,
                },
                {
                  text: `${json.totalAll} đ`,
                },
              ],
              [
                {
                  text: "",
                  alignment: "left",
                },
                {
                  text: "",
                },
                {
                  text: `Thuế (${json.typeTaxAll}):`,
                  fontSize: 12,
                  bold: true,
                },
                {
                  text: `${json.totalTaxAll} đ`,
                },
              ],
              [
                {
                  text: "",
                  alignment: "left",
                },
                {
                  text: "",
                },
                {
                  text: `TỔNG TIỀN:`,
                  fontSize: 12,
                  bold: true,
                },
                {
                  text: `${json.totalAndTaxAll} đ`,
                },
              ],
            ],
          },
          layout: "noBorders",
        },

        {
          text:
            "................................................................................",
          alignment: "center",
        },
        {
          alignment: "justify",
          style: "margin10",
          columns: [
            {
              text: [
                {
                  text: "Thông tin thanh toán\n",
                  fontSize: 15,
                  bold: true,
                  color: "red",
                },
                {
                  text: `${banking.nameTkLable}\n`,
                },
                {
                  text: `Tên Tài Khoản: ${banking.nameTk}\n`,
                },
                {
                  text: `Số tài khoản: ${banking.stk}\n`,
                },
                {
                  text: `Hạn thanh toán: ${json.expireTime}`,
                },
              ],
            },
          ],
        },
        {
          alignment: "justify",
          style: "margin10",
          columns: [
            {
              text: [
                {
                  text: "Thông tin liên hệ\n",
                  fontSize: 15,
                  bold: true,
                  color: "red",
                },
                {
                  text: `Email: ${json.emailOwner}\n`,
                },
                {
                  text: `Địa chỉ: ${json.addressOwner}\n`,
                },
                {
                  text: `Số điện thoại: ${json.phoneOwner}\n`,
                },
              ],
            },
          ],
        },
        {
          alignment: "justify",
          style: "margin10",
          columns: [
            {
              text: [
                {
                  text: "Trạng thái hóa đơn: ",
                  fontSize: 15,
                  bold: true,
                  color: "red",
                },
                {
                  text: `Chưa thanh toán`,
                },
              ],
            },
          ],
        },
        {
          alignment: "justify",
          style: "margin10",
          pageBreak: "before", // Thêm phân trang trước khi ghi bảng
          columns: [
            {
              text: [
                {
                  text: "Thông tin chi tiết\n",
                  fontSize: 15,
                  bold: true,
                  color: "red",
                },
              ],
            },
          ],
        },
        {
          style: "tableExample",
          alignment: "center",
          table: {
            headerRows: 1,
            widths: ["auto", "*", "auto"],
            body: [
              [
                { text: "Thời gian", style: "tableHeader" },
                { text: "Mức tiêu thụ điện (kWh)", style: "tableHeader" },
                { text: "Thành tiền (VND)", style: "tableHeader" },
              ],
              ...tableBody, // Thêm dữ liệu vào body của bảng
            ],
          },
        },
      ],

      styles: {
        header: {
          fontSize: 30,
          bold: true,
          alignment: "justify",
        },
        margin10: {
          margin: [10, 10, 10, 10],
        },
        tableExample: {
          margin: [0, 5, 0, 15],
        },
      },
    };

    let printer = new PdfPrinter(fonts);
    let pdfDoc = printer.createPdfKitDocument(docDefinition);
    // buffer the output
    let chunks = [];
    pdfDoc.on("data", (chunk: any) => {
      chunks.push(chunk);
    });
    pdfDoc.on("end", () => {
      var result = Buffer.concat(chunks);
      resolve(result);
    });
    pdfDoc.on("error", (error) => {
      reject(error);
    });
    // close the stream
    pdfDoc.end();
  });
}


