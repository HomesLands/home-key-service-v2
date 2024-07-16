import { NextFunction, Request, Response } from "express";
import * as mongoose from "mongoose";
import HttpResponse from "../../services/response";
import { RevenueModel } from "models/homeKey/revenue";

export default class BillController {
  /* -------------------------------------------------------------------------- */
  /*                            START HELPER FUNCTION                           */
  /* -------------------------------------------------------------------------- */
  /**
   * @swagger
   * tags:
   *   - name: Bill
   *     description: Bill Control
   */

  static async insertDb(data, userId): Promise<any> {
    const {
      bill: billModel,
      optionsType: OptionsTypeModel,
    } = global.mongoModel;
    // check trung ma hoa đơn
    const dataCheck = await billModel
      .findOne({
        idBill: data.idBill,
      })
      .lean()
      .exec();
    // If user was deleted
    if (dataCheck) {
      return HttpResponse.returnErrorWithMessage("Mã Hóa Đơn tồn tại");
    }

    let billData = await billModel.create({
      user: userId,
      typeTaxAll: data.typeTaxAll,
      totalTaxAll: data.totalTaxAll,
      totalAndTaxAll: data.totalAndTaxAll,
      totalAll: data.totalAll,
      imgRoom: data.imgRoom,
      address: data.address,
      phoneUser: data.phoneUser,
      nameUser: data.nameUser,
      nameRoom: data.nameRoom,
      nameMotel: data.nameMotel,
      dateBill: data.dateBill,
      idBill: data.idBill,
      emailOwner: data.emailOwner,
    });

    const Room = await OptionsTypeModel.create({
      expense: data.expenseRoom,
      type: data.typeRoom,
      unitPrice: data.unitPriceRoom,
      total: data.totalRoom,
    });

    const Electricity = await OptionsTypeModel.create({
      expense: data.expenseElectricity,
      type: data.typeElectricity,
      unitPrice: data.unitPriceElectricity,
      total: data.totalElectricity,
    });

    const Water = await OptionsTypeModel.create({
      expense: data.expenseWater,
      type: data.typeWater,
      unitPrice: data.unitPriceWater,
      total: data.totalWater,
    });

    const Garbage = await OptionsTypeModel.create({
      expense: data.expenseGarbage,
      type: data.typeGarbage,
      unitPrice: data.unitPriceGarbage,
      total: data.totalGarbage,
    });

    const Wifi = await OptionsTypeModel.create({
      expense: data.expenseWifi,
      type: data.typeWifi,
      unitPrice: data.unitPriceWifi,
      total: data.totalWifi,
    });

    const Other = await OptionsTypeModel.create({
      expense: data.expenseOther,
      type: data.typeOther,
      unitPrice: data.unitPriceOther,
      total: data.totalOther,
    });

    billData = await billModel
      .findOneAndUpdate(
        { _id: billData._id },
        {
          room: Room._id,
          other: Other._id,
          wifi: Wifi._id,
          water: Water._id,
          garbage: Garbage._id,
          electricity: Electricity._id,
        },
        { new: true }
      )
      .lean()
      .exec();

    if (!billData) {
      return HttpResponse.returnErrorWithMessage("Hóa không tồn tại", "");
    }

    // Return floor data
    return billData._id;
  }

  /**
   * @swagger
   * definitions:
   *   CreateBill:
   *     required:
   *       - email
   *       - password
   *     properties:
   *       email:
   *         type: string
   *       password:
   *         type: string
   */

  /**
   * @swagger
   * /v1/homeKey/bill:
   *   post:
   *     description: Create bill
   *     tags: [Bill]
   *     produces:
   *       - application/json
   *     parameters:
   *       - in: body
   *         name: body
   *         description: Request body
   *         schema:
   *           $ref: '#definitions/CreateBill'
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
   */

  static async createBill(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    // Init models
    try {
      const {
        bill: billModel,
        optionsType: OptionsTypeModel,
      } = global.mongoModel;
      const { body: data } = req;
      const billData = BillController.insertDb(data, req["userId"]);

      return HttpResponse.returnSuccessResponse(
        res,
        await BillController.getBillById(billData)
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /v1/homeKey/bill/{id}:
   *   post:
   *     description: Get bill detail
   *     tags: [Bill]
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         type: string
   *         description: Bill id
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
  static async getBillDetail(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      let { id: billId } = req.params;

      return HttpResponse.returnSuccessResponse(
        res,
        await BillController.getBillById(billId)
      );
    } catch (e) {
      next(e);
    }
  }

  // Get billId by id
  static async getBillById(billId: any, lang?: string): Promise<any> {
    const { bill: billModel } = global.mongoModel;

    if (!mongoose.Types.ObjectId.isValid(billId)) {
      return HttpResponse.returnErrorWithMessage("Hóa đơn không tồn tại", lang);
    }

    let resData = await billModel
      .findOne({ _id: billId })
      .populate("electricity garbage water wifi other room")
      .lean()
      .exec();

    if (!resData) {
      return HttpResponse.returnErrorWithMessage("Hóa không tồn tại", lang);
    }

    // Return floor data
    return resData;
  }

  // Get all Bill
  /**
   * @swagger
   * /v1/homeKey/bill:
   *   get:
   *     description: Get list of bills
   *     tags: [Bill]
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: sortBy
   *         in: query
   *         required: true
   *         description: Sort by value
   *         type: string
   *       - name: size
   *         in: query
   *         required: true
   *         description: Size of page
   *         type: string
   *       - name: page
   *         in: query
   *         required: true
   *         description: Current page
   *         type: string
   *       - name: startDate
   *         in: query
   *         required: true
   *         description: Filter from startDate
   *         type: string
   *       - name: endDate
   *         in: query
   *         required: true
   *         description: Filter from startDate to endDate
   *         type: string
   *       - name: keyword
   *         in: query
   *         required: false
   *         description: Filter by keyword
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
   */
  static async getBillList(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    const { bill: billModel } = global.mongoModel;

    const sortType = req.query.sortType === "ascending" ? 1 : -1;
    let { sortBy, role, size, page, keyword, startDate, endDate } = req.query;
    let condition, sort;

    condition = [
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
          user: req["userId"],
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

    const resData = await billModel.paginate(size, page, condition);

    if (!resData) {
      return HttpResponse.returnBadRequestResponse(
        res,
        "Danh sách hóa đơn không tồn tại"
      );
    }
    return HttpResponse.returnSuccessResponse(res, resData);
  }

  // Get all Bill with admin role
  /**
   * @swagger
   * /v1/homeKey/admin/bill:
   *   get:
   *     description: Get list of bills with admin role
   *     tags: [Bill]
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: sortBy
   *         in: query
   *         required: true
   *         description: Sort by value
   *         type: string
   *       - name: size
   *         in: query
   *         required: true
   *         description: Size of page
   *         type: string
   *       - name: page
   *         in: query
   *         required: true
   *         description: Current page
   *         type: string
   *       - name: startDate
   *         in: query
   *         required: true
   *         description: Filter from startDate
   *         type: string
   *       - name: endDate
   *         in: query
   *         required: true
   *         description: Filter from startDate to endDate
   *         type: string
   *       - name: keyword
   *         in: query
   *         required: false
   *         description: Filter by keyword
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
   */
  static async getBillListAdmin(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    const { bill: billModel } = global.mongoModel;

    const sortType = req.query.sortType === "ascending" ? 1 : -1;
    let { sortBy, role, size, page, keyword, startDate, endDate } = req.query;
    let condition, sort;

    condition = [
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

    const resData = await billModel.paginate(size, page, condition);

    if (!resData) {
      return HttpResponse.returnBadRequestResponse(
        res,
        "Không có danh sách hóa đơn không tồn tại"
      );
    }
    return HttpResponse.returnSuccessResponse(res, resData);
  }

  /**
   * @swagger
   * /v1/homeKey/bill/customer:
   *   post:
   *     description: Get all bill of customer
   *     tags: [Bill]
   *     produces:
   *       - application/json
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
  // Get bill for customer role
  static async getAllBillsOfCustomer(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    const { user: UserModel, bill: billModel, revenue: revenueModel } = global.mongoModel;

    // Get userId
    const userId: string = req["userId"];
    console.log({ userId });

    // Validate user role is customer
    const customer = await UserModel.findOne({
      _id: userId,
    })
      .lean()
      .exec();
    if (!customer)
      return HttpResponse.returnBadRequestResponse(res, [
        "User could not be found",
      ]);
    console.log({ customer });

    const bills = await billModel.find({
      phoneUser: `0${customer.phoneNumber.number}`,
    }).exec();
    console.log({ bills });

    return HttpResponse.returnSuccessResponse(res, {
      message: "Get all bill of customer successful",
      data: bills,
    });
  }

  static async saveHostRevenue(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const {
        user: userModel,
        motelRoom: motelRoomModel,
        floor: floorModel,
        room: roomModel,
        bill: billModel,
        order: orderModel,
        revenue: RevenueModel,
        payDepositList: PayDepositListModel,
      } = global.mongoModel;

      const users = await userModel.find({ role: "host" }).exec();
      if (users.length === 0) {
        return HttpResponse.returnErrorWithMessage("Không tìm thấy chủ nhà nào");
      }

      const currentDate = new Date();
      const previousMonth = currentDate.getMonth() - 1;
      const previousMonthYear = previousMonth < 0 ? currentDate.getFullYear() - 1 : currentDate.getFullYear();
      const previousMonthAdjusted = previousMonth < 0 ? 11 : previousMonth;

      const firstDayOfPreviousMonth = new Date(previousMonthYear, previousMonthAdjusted, 1);
      const lastDayOfPreviousMonth = new Date(previousMonthYear, previousMonthAdjusted + 1, 0);
      lastDayOfPreviousMonth.setHours(23, 59, 59, 999);

      for (const user of users) {
        const motelInfor = await motelRoomModel.find({ owner: user._id }).exec();

        const firstDayOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const lastDayOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        lastDayOfCurrentMonth.setHours(23, 59, 59, 999);

        let totalDepositRefund = 0;

        const depositRefund = await PayDepositListModel.find({
          type: "payDeposit",
          createdAt: {
            $gte: firstDayOfCurrentMonth,
            $lt: lastDayOfCurrentMonth
          }
        }).exec();

        if (depositRefund.length > 0) {
          console.log(`Dữ liệu hoàn tiền cọc của chủ nhà ${user._id} đã tồn tại`);
          for (const motel of motelInfor) {
            const floors = motel.floors;
            for (const floor of floors) {
              const floorData = await floorModel.findOne({ _id: floor }).exec();
              const rooms = floorData.rooms;
              for (const room of rooms) {
                const depositRefundData = await PayDepositListModel.find({
                  room: room,
                  type: "payDeposit",
                  createdAt: {
                    $gte: firstDayOfPreviousMonth,
                    $lt: lastDayOfCurrentMonth
                  }
                }).exec();
                console.log(`Dữ liệu hoàn tiền cọc của phòng ${room} có ${depositRefundData.length} bản ghi`);

                if (depositRefundData.length > 0) {
                  const roomTotalDepositRefund = depositRefundData.reduce((acc, curr) => acc + curr.amount, 0) / 2;
                  totalDepositRefund += roomTotalDepositRefund;
                }
              }
            }
          }
        } else {
          console.log(`Dữ liệu hoàn tiền cọc của chủ nhà ${user._id} chưa tồn tại`);
        }

        let motelList = [];

        const revenueLastMonth = await RevenueModel.findOne({
          hostId: user._id,
          timePeriod: `${previousMonthYear}-${previousMonthAdjusted + 1}`
        }).exec();

        if (revenueLastMonth) {
          motelList = revenueLastMonth.motels;
        }

        let motelsRevenue = [];
        let motelTotalRevenue = 0;
        let electricPrice = 0;
        let waterPrice = 0;
        let servicePrice = 0;
        let vehiclePrice = 0;
        const timePeriod = `${previousMonthYear}-${previousMonthAdjusted + 1}`;

        for (const motel of motelInfor) {
          let monthlyRevenue = 0;

          motelList.map((motelLastMonth) => {
            if (motelLastMonth.motelId.toString() === motel._id.toString()) {
              motelTotalRevenue += motelLastMonth.totalRevenue;
            }
          });

          const billData = await billModel.find({
            motel: motel._id,
            type: "monthly",
            createdAt: {
              $gte: firstDayOfPreviousMonth,
              $lt: new Date(previousMonthYear, previousMonthAdjusted + 1, 1)
            }
          }).exec();

          for (const bill of billData) {
            const orderData = await orderModel.findOne({ _id: bill.order, type: "monthly" }).exec();

            console.log(`Check orderData:`, orderData);


            if (orderData) {
              monthlyRevenue += orderData.roomPrice;
              electricPrice = orderData.electricPrice;
              waterPrice = orderData.waterPrice;
              servicePrice = orderData.servicePrice;
              vehiclePrice = orderData.vehiclePrice;
            }
          }

          motelsRevenue.push({
            motelId: motel._id,
            motelName: motel.name,
            totalRevenue: motelTotalRevenue + monthlyRevenue + totalDepositRefund, // Cộng tổng hoàn tiền cọc vào tổng doanh thu
            currentMonthRevenue: monthlyRevenue,
            electricPrice: electricPrice,
            waterPrice: waterPrice,
            servicePrice: servicePrice,
            vehiclePrice: vehiclePrice,
            depositRefund: totalDepositRefund, // Lưu thông tin hoàn tiền cọc riêng biệt
            withdrawals: [] // Khởi tạo mảng rút tiền
          });
        }

        console.log(`Check motels Revenue:`, motelsRevenue);


        const revenueEntry = new RevenueModel({
          hostId: user._id,
          hostName: `${user.lastName} ${user.firstName}`,
          motels: motelsRevenue,
          timePeriod: timePeriod,
          date: lastDayOfPreviousMonth
        });

        await revenueEntry.save();
      }

      return HttpResponse.returnSuccessResponse(res, {
        message: "Lưu dữ liệu doanh thu của chủ nhà thành công",
      });

    } catch (error) {
      return next(error);
    }
  }



}

