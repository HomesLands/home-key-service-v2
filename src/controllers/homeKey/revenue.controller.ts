import { NextFunction, Request, Response } from "express";
import * as mongoose from "mongoose";
import HttpResponse from "../../services/response";
import moment = require("moment");

export default class RevenueController {
  static async updateRevenue(
    idBill: string,
    bankId: string,
  ): Promise<any> {
    try {
      const {
        motelRoom: motelRoomModel,
        bill: billModel,
        revenue: revenueModel,
        revenueLog: revenueLogModel,
        job: jobModel,
      } = global.mongoModel;

      // const idBill: string = "66d34cbc7f6c6159707360a2";

      const billData = await billModel.findOne({ _id: idBill })
        .populate("order")
        .lean().exec();

      if(!billData) {
        console.log("Tạo hóa đơn thất bại");
        return false;
      }
      if(billData.isAddRevenue) {
        console.log("Hoá đơn đã được thêm");
        return false;
      }

      const motelData = await motelRoomModel.findOne({ _id: billData.motel })
        .populate("owner")
        .lean().exec();

      if(!motelData) {
        console.log("Tòa nhà không tồn tại");
        return false; //note check hơi dư
      }

      if(!motelData.owner) {
        console.log("Tài khoản chủ tòa nhà không tồn tại");
        return false;
      }

      let revenueData = await revenueModel.findOne({ userId: motelData.owner._id }).lean().exec();

      let amountAddFromBill = parseInt(billData.totalAll);
      if(revenueData) {
        if(revenueData.motels) {
          if(revenueData.motels.length > 0) {
            console.log({revenue: typeof revenueData.motels[0].motelId })
            console.log({motelData: typeof motelData._id })
            let existMotel = revenueData.motels.some( motel => 
              motel.motelId.equals(motelData._id)
            );

            console.log({exist: existMotel})

            if(existMotel) {
              console.log("ĐÃ TỒN TẠI DOANH THU, CHỈ CẬP NHẬT");
              revenueData = await revenueModel.findOneAndUpdate(
                { userId: motelData.owner._id, "motels.motelId" : motelData._id},
                {
                  $inc: { 
                    "motels.$.amount": amountAddFromBill, // += amountAddFromBill
                    totalAmount: amountAddFromBill, // += amountAddFromBill
                  }
                },
                { new: true }
              );
            } else {
              console.log("ĐÃ TỒN TẠI DOANH THU, THÊM TÒA");

              let motelRevenue = {
                motelId: motelData._id,
                motelName: motelData.name,
                amount: amountAddFromBill,
              };
              revenueData = await revenueModel.findOneAndUpdate(
                { userId: motelData.owner._id },
                {
                  $addToSet: { motels : motelRevenue },
                  $inc: { 
                    totalAmount: amountAddFromBill, // += amountAddFromBill
                  }
                },
                { new: true }
              );
            }
          }
        }
      } else {
        console.log("CHƯA TỒN TẠI DOANH THU");

        let motelRevenue = [{
          motelId: motelData._id,
          motelName: motelData.name,
          amount: amountAddFromBill,
        }];
        revenueData = await revenueModel.create({
          userId: motelData.owner._id,
          userName: `${motelData.owner.lastName} ${motelData.owner.firstName}`,
          motels: motelRevenue,
          totalAmount: amountAddFromBill,
        });
      }

      // Log
      // const bankId: string = "65828a7fac6d1a57e81be5a2";
      let depositAmount: number = 0;
      let time: moment.Moment = null;
      if(billData.type === "deposit" || billData.type === "afterCheckInCost") {
        depositAmount = billData.order.amount;

        let jobData = await jobModel.findOne({ orders: billData.order._id }).lean().exec();
        if(jobData) {
          time = moment(jobData.checkInTime);
        }
      } else if(billData.type === "monthly") {
        time = moment(billData.order.endTime);
      }

      let revenueLogData = await revenueLogModel.create({
        motelOwner: motelData.owner._id,
        motel: motelData._id,
        userTransfer: billData.user,
        bankInCome: bankId,
        bill: billData._id,
        currentAmount: revenueData.totalAmount,
        amountChange: amountAddFromBill,
        type: "recharge",
        roomAmount: billData.order.roomPrice,
        depositAmount: depositAmount,
        electricAmount: billData.order.electricPrice,
        waterAmount: billData.order.waterPrice,
        serviceAmount: billData.order.servicePrice,
        vehicleAmount: billData.order.vehiclePrice,
        wifiAmount: billData.order.wifiPrice,
        otherAmount: 0,
        time: time.toDate(),
      });

      await billModel.findOneAndUpdate(
        { _id: billData._id },
        { isAddRevenue: true },
        { new: true }
      ).lean().exec();

      return true;
    } catch (error) {
      return false;
    }
  }

  static async buildingRevenue(
    req: Request, 
    res: Response, 
    next: NextFunction
  ): Promise<any> {
    const idMotel = req.params.idMotel;
    const year = req.params.year;

    console.log("idMotel", idMotel);
    // console.log("year", year);

    let jsonMotel = [];

    const {
      order: orderModel,
      bill: billModel,
      motelRoom: motelRoomModel,
      revenue: revenueModel,
      revenueLog: revenueLogModel,
    } = global.mongoModel;

    try {
      const motelData = await motelRoomModel.findOne({ _id: idMotel }).lean().exec();
      const hostRevenue = await revenueModel.findOne({
        // userId: motelData.owner,
        "motels.motelId": mongoose.Types.ObjectId(idMotel),
      }).lean().exec();

      if(!hostRevenue) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Hiện tòa nhà chưa có bất cứ doanh thu nào"
        );
      }

      // const motelRevenue = hostRevenue.motels.find( motel => motel.motelId.equals(mongoose.Types.ObjectId(idMotel)));

      // const remainingRevenue = motelRevenue.amount; // motel

      const remainingRevenueAllMotel = hostRevenue.totalAmount;

      const startTime = moment(parseInt(year), "YYYY").startOf("years");
      const endTime = moment(parseInt(year), "YYYY").endOf("years");
      console.log({startTime})
      console.log({endTime})

      const rechargeRevenueLogs = await revenueLogModel.find({
        motel: mongoose.Types.ObjectId(idMotel),
        time: {
          $gte: startTime.toDate(),
          $lte: endTime.toDate(),
        },
        type: "recharge"
      }).lean().exec();

      // console.log({rechargeRevenueLogs})

      const rechargeRevenueMonth = Array(12).fill(0).map((_, index) => ({
        month: index + 1,
        time: `${index + 1}/${year}`,
        total: 0, //totalAmountChange
        depositPrice: 0,
        waterPrice: 0,
        vehiclePrice: 0,
        servicePrice: 0,
        wifiPrice: 0,
        electricPrice: 0,
        otherPrice: 0,
        roomPrice: 0,
      }));

      rechargeRevenueLogs.forEach(item => {
        const month = moment(item.time).month();
        const time = `${month}/${year}`;
        
        rechargeRevenueMonth[month].total += item.amountChange || 0;
        rechargeRevenueMonth[month].depositPrice += item.depositAmount || 0;
        rechargeRevenueMonth[month].waterPrice += item.waterAmount || 0;
        rechargeRevenueMonth[month].vehiclePrice += item.vehicleAmount || 0;
        rechargeRevenueMonth[month].servicePrice += item.serviceAmount || 0;
        rechargeRevenueMonth[month].wifiPrice += item.wifiAmount || 0;
        rechargeRevenueMonth[month].electricPrice += item.electricAmount || 0;
        rechargeRevenueMonth[month].otherPrice += item.otherAmount || 0;
        rechargeRevenueMonth[month].roomPrice += item.roomAmount || 0;
      });

      console.log({rechargeRevenueMonth})

      const currentRevenueMonthTotal = rechargeRevenueMonth[moment().month()].total;

      const keyMap = {
        depositPrice: 'totalDepositPrice',
        waterPrice: 'totalWaterPrice',
        vehiclePrice: 'totalVehiclePrice',
        servicePrice: 'totalServicePrice',
        wifiPrice: 'totalWifiPrice',
        electricPrice: 'totalElectricPrice',
        roomPrice: 'totalRoomPrice',
        otherPrice: 'totalOtherPrice',
      };

      const currentRevenueMonth = Object.entries(rechargeRevenueMonth[moment().month()]).reduce((acc, [key, value]) => {
        const newKey = keyMap[key];
        if (newKey) {
          acc[newKey] = value;
        }
        return acc;
      }, {});

      const { 
        totalOfYear, 
        totalRoomPrice,
        totalDepositPrice,
        totalWaterPrice,
        totalVehiclePrice,
        totalServicePrice,
        totalWifiPrice,
        totalElectricPrice,
        totalOtherPrice,
      } = rechargeRevenueMonth.reduce((acc, obj) => {
        acc.totalOfYear += obj.total;
        acc.totalRoomPrice += obj.roomPrice;
        acc.totalDepositPrice += obj.depositPrice;
        acc.totalWaterPrice += obj.waterPrice;
        acc.totalVehiclePrice += obj.vehiclePrice;
        acc.totalServicePrice += obj.servicePrice;
        acc.totalWifiPrice += obj.wifiPrice;
        acc.totalElectricPrice += obj.electricPrice;
        acc.totalOtherPrice += obj.otherPrice;
        return acc;
      }, { 
        totalOfYear: 0, 
        totalRoomPrice: 0,
        totalDepositPrice: 0,
        totalWaterPrice: 0,
        totalVehiclePrice: 0,
        totalServicePrice: 0,
        totalWifiPrice: 0,
        totalElectricPrice: 0,
        totalOtherPrice: 0,
      });

      const withdrawRevenueMonth = Array(12).fill(0).map((_, index) => ({
        month: index + 1,
        total: 0,
      }));

      const withdrawRevenueLogs = await revenueLogModel.find({
        motel: mongoose.Types.ObjectId(idMotel),
        time: {
          $gte: startTime.toDate(),
          $lte: endTime.toDate(),
        },
        type: "withdraw"
      }).lean().exec();

      withdrawRevenueLogs.forEach(item => {
        const month = moment(item.time).month();
      
        withdrawRevenueMonth[month].total += item.amountChange || 0;
      });

      let data = {};
      data =  {
        monthlyRevenue: rechargeRevenueMonth, // array of year, one motel
        totalRevenueAllOfYear: totalOfYear,// motelOfYear
        
        totalRoomPrice, // oneMotel of Year
        totalDepositPrice, // oneMotel of Year
        totalWaterPrice, // oneMotel of Year
        totalVehiclePrice, // oneMotel of Year
        totalServicePrice, // oneMotel of Year
        totalWifiPrice, // oneMotel of Year
        totalElectricPrice, // oneMotel of Year
        totalOtherPrice, // one Motel of Year

        remainingRevenueAllMotel: remainingRevenueAllMotel, //rest of Host All motel
        currentRevenueMonth: currentRevenueMonth, // total Month current
        currentRevenueMonthTotal: currentRevenueMonthTotal,
      }
        return HttpResponse.returnSuccessResponse(res, data);
    } catch (error) {
      next(error);
    }
  }
  
  static async historyRevenueByHost(
    req: Request,
    res: Response,
    next: NextFunction
  ) : Promise<any> {
    try {
      const {
        revenueLog: revenueLogModel,
      } = global.mongoModel;
      const idHost = req.params.id;
      const { type, motel, start, end } = req.query;

      const query: RevenueLogQuery = { motelOwner: idHost };
      if (type) {
        query.type = type as string;
      }
      
      if (motel) {
        query.motel = motel as string;
      }
      
      if (start && end) {
        const isValidDateEnd = moment(end as string, "YYYY/MM/DD", true).isValid();
        const isValidDateStart = moment(start as string, "YYYY/MM/DD", true).isValid();
        if(isValidDateStart && isValidDateEnd) {
          query.time = { 
            $gte: moment(start as string).toDate(),
            $lte: moment(end as string).toDate(),
          };
        }
      }

      const revenueLogData = await revenueLogModel.find(query)
        .populate({
          path: 'userTransfer',
          select: '-password -token -role -wallet -tokenForgotPassword -tokenActive', 
        })
        .populate("bill bankInCome")
        .sort({ time: -1 })
        .select('')
        .lean().exec();

      return HttpResponse.returnSuccessResponse(res, revenueLogData);
    } catch (error) {
      next(error);
    }
  }

  static async updateRevenueApi(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<any> {
    try {
      const {
        motelRoom: motelRoomModel,
        bill: billModel,
        revenue: revenueModel,
        revenueLog: revenueLogModel,
        job: jobModel,
      } = global.mongoModel;

      const idBill: string = "66d34cbc7f6c6159707360a2";

      const billData = await billModel.findOne({ _id: idBill })
        .populate("order")
        .lean().exec();

      if(!billData) {
        console.log("Tạo hóa đơn thất bại");
        return false;
      }
      if(billData.isAddRevenue) {
        console.log("Hoá đơn đã được thêm");
        return false;
      }

      const motelData = await motelRoomModel.findOne({ _id: billData.motel })
        .populate("owner")
        .lean().exec();

      if(!motelData) {
        console.log("Tòa nhà không tồn tại");
        return false; //note check hơi dư
      }

      if(!motelData.owner) {
        console.log("Tài khoản chủ tòa nhà không tồn tại");
        return false;
      }

      let revenueData = await revenueModel.findOne({ userId: motelData.owner._id }).lean().exec();

      let amountAddFromBill = parseInt(billData.totalAll);
      if(revenueData) {
        if(revenueData.motels) {
          if(revenueData.motels.length > 0) {
            console.log({revenue: typeof revenueData.motels[0].motelId })
            console.log({motelData: typeof motelData._id })
            let existMotel = revenueData.motels.some( motel => 
              motel.motelId.equals(motelData._id)
            );

            console.log({exist: existMotel})

            if(existMotel) {
              console.log("ĐÃ TỒN TẠI DOANH THU, CHỈ CẬP NHẬT");
              revenueData = await revenueModel.findOneAndUpdate(
                { userId: motelData.owner._id, "motels.motelId" : motelData._id},
                {
                  $inc: { 
                    "motels.$.amount": amountAddFromBill, // += amountAddFromBill
                    totalAmount: amountAddFromBill, // += amountAddFromBill
                  }
                },
                { new: true }
              );
            } else {
              console.log("ĐÃ TỒN TẠI DOANH THU, THÊM TÒA");

              let motelRevenue = {
                motelId: motelData._id,
                motelName: motelData.name,
                amount: amountAddFromBill,
              };
              revenueData = await revenueModel.findOneAndUpdate(
                { userId: motelData.owner._id },
                {
                  $addToSet: { motels : motelRevenue },
                  $inc: { 
                    totalAmount: amountAddFromBill, // += amountAddFromBill
                  }
                },
                { new: true }
              );
            }
          }
        }
      } else {
        console.log("CHƯA TỒN TẠI DOANH THU");

        let motelRevenue = [{
          motelId: motelData._id,
          motelName: motelData.name,
          amount: amountAddFromBill,
        }];
        revenueData = await revenueModel.create({
          userId: motelData.owner._id,
          userName: `${motelData.owner.lastName} ${motelData.owner.firstName}`,
          motels: motelRevenue,
          totalAmount: amountAddFromBill,
        });
      }

      // Log
      const bankId: string = "65828a7fac6d1a57e81be5a2";
      let depositAmount: number = 0;
      let time: moment.Moment = null;
      if(billData.type === "deposit" || billData.type === "afterCheckInCost") {
        depositAmount = billData.order.amount;

        let jobData = await jobModel.findOne({ orders: billData.order._id }).lean().exec();
        if(jobData) {
          time = moment(jobData.checkInTime);
        }
      } else {
        time = moment(billData.order.endTime);
      }
      let revenueLogData = await revenueLogModel.create({
        motelOwner: motelData.owner._id,
        motel: motelData._id,
        userTransfer: billData.user,
        bankInCome: bankId,
        bill: billData._id,
        currentAmount: revenueData.totalAmount,
        amountChange: amountAddFromBill,
        type: "recharge",
        roomAmount: billData.order.roomPrice,
        depositAmount: depositAmount,
        electricAmount: billData.order.electricPrice,
        waterAmount: billData.order.waterPrice,
        serviceAmount: billData.order.servicePrice,
        vehicleAmount: billData.order.vehiclePrice,
        wifiAmount: billData.order.wifiPrice,
        otherAmount: 0,
        time: time
      });

      await billModel.findOneAndUpdate(
        { _id: idBill },
        { isAddRevenue: true }
      ).exec();


      // Tìm kiểm hóa đơn được thanh toán trong ngày
      // Nhóm hóa đơn thành nhóm motel
      // Phân loại hóa đơn của tháng nào
      // Tìm kiếm xem doanh thu của những tháng đó đã tồn tại hay chưa
      // - Nếu tồn tại rồi thì cập nhật vào doanh thu vào totalRevenue, currentMonthRevenue, 
      // remainingRevenue của các withdrawals của hóa đơn tháng đó và cộng vào các chỉ số trên 
      // vào các tháng sau đó (có bao nhiêu tháng cộng bấy nhiêu tháng) cho đến thời điểm hiện tại
      // - Nếu chưa có thì tạo và cũng cập nhật như trên
      // LƯU Ý: các hóa đơn deposit và afterCheckInCost dựa vào ngày check in của job để quy vào tháng checkin

      // const listBill = await billModel.find({
      //   isAddRevenue: false,
      // })
      // .populate("order")
      // .lean().exec();

      // const groupBillByMotel = lodash.groupBy(listBill, 'motel');

      // console.log({groupBillByMotel})

      // if(listBill.length = 0) {
      //   return HttpResponse.returnBadRequestResponse(res,
      //     "Không có hóa đơn nào cả"
      //   )
      // }

      // const motelIdList = Object.keys(groupBillByMotel);
      // console.log({motelIdList})

      // for(const motelId of motelIdList) {
      //   let billList = groupBillByMotel[motelId];
      //   console.log({billList})

      //   let dataUpdate = {};
      //   for(const bill of billList) {
      //     if( bill.type === "deposit" || bill.type === "afterCheckInCost") {
      //       let jobData = await jobModel.findOne({orders: bill.order._id}).lean().exec();
      //       let timePeriod: string = moment(jobData.checkInTime).format("YYYY-MM");
      //       if( timePeriod in dataUpdate ) {
      //         dataUpdate[timePeriod] += parseInt(bill.totalAll);
      //       } else {
      //         dataUpdate[timePeriod] = parseInt(bill.totalAll);
      //       }
      //     } else if( bill.type === "monthly") {
      //       let timePeriod: string = moment(bill.order.endTime).format("YYYY-MM");
      //       if( timePeriod in dataUpdate ) {
      //         dataUpdate[timePeriod] += parseInt(bill.totalAll);
      //       } else {
      //         dataUpdate[timePeriod] = parseInt(bill.totalAll);
      //       }
      //     }
      //   }
      // }

      return HttpResponse.returnSuccessResponse(res, "success");
    } catch (error) {
      next(error);
    }
  }
}

interface RevenueLogQuery {
  motelOwner: string;
  type?: string;
  motel?: string;
  time?: {
    $gte: Date;
    $lte: Date;
  };
}