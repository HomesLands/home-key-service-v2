import * as moment from "moment";
import * as lodash from "lodash";

var nodemailer = require('nodemailer');

import JobController from "../../../controllers/homeKey/job.controller";
import EnergyController from "../../../controllers/homeKey/energy.controller";
import RoomController from "../../../controllers/homeKey/room";
import NotificationController from "../../../controllers/homeKey/notification";
import { helpers, jwtHelper, normalizeError } from "../../../utils";

export default (agenda) => {
  // create order
  // Cần phải sửa: để check lại hạn hợp đồng là trong tháng hay qua tháng tiếp theo
  agenda.define("CreateOrder", async (job, done) => {
    try {
      console.log("CreateOrder");
      // Init models
      const { order: orderModel, job: jobModel } = global.mongoModel;

      let data = job.attrs.data;

      let resData = await JobController.getJob(job.attrs.data.jobId);

      if (resData.isActived) {
        // await NotificationController.createNotification({
        //   title: "Thông báo đóng tiền phòng",
        //   content: "Vui lòng thanh toán tiền phòng trong vòng 5 ngày.",
        //   user: resData.user,
        //   isRead: false,
        // });

        const orderData = await orderModel.create({
          user: resData.user,
          job: resData._id,
          isCompleted: false,
          description: `Tiền phòng tháng ${moment().month() + 1}/${moment().year()}`,
          amount: resData.room.price,
          type: "monthly",
        });

        resData = await jobModel.findOneAndUpdate(
          { _id: resData._id },
          {
            $addToSet: { orders: orderData._id },
            currentOrder: orderData._id,
            status: "pendingMonthlyPayment",
          },
          { new: true }
        );

        await global.agendaInstance.agenda.schedule(
          moment()
            .endOf("month")
            .toDate(),
          "CheckOrderStatus",
          { orderId: orderData._id }
        );
        await global.agendaInstance.agenda.schedule(
          moment()
            .startOf("month")
            .add(1, "months")
            .toDate(),
          "CreateOrder",
          { jobId: resData._id }
        );
      } else {
        // -----------------new
        //Xóa job tạm thời
        // await jobModel.findOneAndUpdate({ _id: resData._id }, {isDeleted: true})
        //                           .lean()
        //                           .exec();
        //---------------------
      }
      done();
    } catch (err) {
      done();
    }
  });

  agenda.define("CreateOrderForNextMonth", async (job, done) => {
    try {
      console.log("CreateOrderForNextMonth");
      // Init models
      const { 
        order: orderModel, 
        job: jobModel, 
        room: roomModel,
        totalKwh: totalKwhModel,
      } = global.mongoModel;

      let data = job.attrs.data;

      let resData = await JobController.getJobNoImg(job.attrs.data.jobId);

      const timeCal = moment().subtract(1, "months"); 
      const startTime : moment.Moment = moment().subtract(1, 'months').startOf("months");
      const start = startTime.format("YYYY-MM-DD"); // đầu tháng trước
      const endTime: moment.Moment = moment().subtract(1, 'months').endOf("months");// cuối tháng trước
      const end = endTime.clone().format("YYYY-MM-DD");// cuối tháng trước

      const expireTime = endTime.clone().add(15, "days"); // note: để tạm 15 ngày, cần tính lại tất cả, cần set lại cuối ngày

      // let electricNumber = await EnergyController.countElectricV2(job.attrs.data.jobId, start, end);
      const roomId = resData.room;
      let dataElectricAll = await EnergyController.calculateElectricUsedDayToDayHaveLabelTime(roomId, start, end);

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

      
      const roomData = await roomModel.findOne({_id: roomId})
                                                                  .lean()
                                                                  .exec();

      const electricityPricePerKwh = roomData.electricityPrice;

      const electricPrice = electricNumber * electricityPricePerKwh;

      const numberDayStay = moment(start).daysInMonth();
      const waterPrice = (roomData.waterPrice * roomData.person);
      const servicePrice = roomData.garbagePrice;
      const vehiclePrice = roomData.wifiPrice * roomData.vihicle;
      const roomPrice = resData.room.price;
      const wifiPriceN = roomData.wifiPriceN * roomData.person;
      const amount = roomPrice + vehiclePrice + servicePrice + waterPrice + electricPrice + wifiPriceN;



      if (resData) {
        if (resData.isActived && !(resData.isDeleted)) {
          const orderData = await orderModel.create({
            user: resData.user,
            job: resData._id,
            isCompleted: false,
            numberDayStay: numberDayStay,
            electricNumber: electricNumber,
            electricPrice: electricPrice,
            waterPrice: waterPrice,
            servicePrice: servicePrice,
            vehiclePrice: vehiclePrice,
            roomPrice: roomPrice,
            wifiPrice: wifiPriceN,
            description: `Tiền phòng tháng ${ timeCal.month() + 1}/${ timeCal.year()}`, //đang ở đầu tháng để tạo order cho tháng trước
            amount: amount,
            type: "monthly",
            startTime: startTime.clone().toDate(),
            endTime: endTime.clone().toDate(),
            expireTime: expireTime.clone().toDate(),
          });

          await totalKwhModel.create({
            order: orderData._id,
            kWhData: kWhData,
            labelTime: labelTime,
          });

          resData = await jobModel.findOneAndUpdate(
            { _id: resData._id },
            {
              $addToSet: { orders: orderData._id },
              currentOrder: orderData._id,
              status: "pendingMonthlyPayment",
            },
            { new: true }
          );

          await global.agendaInstance.agenda.schedule(
            moment().add("2", 'minutes').toDate(), //note: gốc là 5 minutes
            "CheckOrderStatusTemp",
            { orderId: orderData._id }
          );
          console.log("Tạo order thành côngggg");
          done();
        } else {
          console.log("Không tạo đượcccc")
          done();
          // -----------------new
          //Xóa job tạm thời
          // await jobModel.findOneAndUpdate({ _id: resData._id }, {isDeleted: true})
          //                           .lean()
          //                           .exec();
          //---------------------
        }
      } else {
        console.log("Không tìm thấy jobbbb")
        done();
      }
      done();
    } catch (err) {
      done();
    }
  });

  // create first month order
  agenda.define("CreateFirstMonthOrder", async (job, done) => {
    try {

      console.log("CreateFirstMonthOrder");
      // Init models
      const { order: orderModel, job: jobModel, room: roomModel, totalKwh: totalKwhModel } = global.mongoModel;

      let data = job.attrs.data;

      let resData = await JobController.getJobNoImg(job.attrs.data.jobId);

      if (resData) {
        if (resData.isActived && !(resData.isDeleted)) {
          const checkInTime = resData.checkInTime;
          const startTime = moment(checkInTime).startOf("day");
          const start = startTime.format("YYYY-MM-DD");
          const endTime = moment(checkInTime).endOf("month").endOf("day");
          const end = endTime.format("YYYY-MM-DD");

          const expireTime = endTime.clone().add(15, "days");
  
          // let electricNumber = await EnergyController.countElectricV2(job.attrs.data.jobId, start, end);
          const roomId = resData.room;
          let dataElectricAll = await EnergyController.calculateElectricUsedDayToDayHaveLabelTime(roomId, start, end);

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
  
          const roomData = await roomModel.findOne({_id: roomId})
                                                                      .lean()
                                                                      .exec();
          const electricityPricePerKwh = roomData.electricityPrice;
  
          const electricPrice = electricNumber * electricityPricePerKwh;
          const dayOfMon = moment(checkInTime).daysInMonth(); // số ngày của tháng
          const numberDayStay = (moment(resData.checkInTime).endOf("month").diff(moment(resData.checkInTime), "days") + 1); //cộng 1: tính cả ngày checkIn
          const waterPrice = (roomData.waterPrice * roomData.person);
          const servicePrice = roomData.garbagePrice;
          const vehiclePrice = (roomData.wifiPrice * roomData.vihicle);
          const roomPrice = (resData.room.price / dayOfMon) * numberDayStay;
          const wifiPriceN = roomData.wifiPriceN * roomData.person;
          const amount = roomPrice + vehiclePrice + servicePrice + waterPrice + electricPrice + wifiPriceN;
          
          
          const orderData = await orderModel.create({
            user: resData.user,
            job: resData._id,
            isCompleted: false,
            electricNumber: electricNumber,
            electricPrice: electricPrice,
            numberDayStay: numberDayStay,
            waterPrice: waterPrice,
            servicePrice: servicePrice,
            vehiclePrice: vehiclePrice,
            roomPrice: roomPrice,
            wifiPrice: wifiPriceN,
            description: `Tiền phòng tháng ${moment(checkInTime).month() + 1}/${moment(checkInTime).year()}`,
            amount: amount,
            type: "monthly",
            startTime: startTime.clone().toDate(),
            endTime: endTime.clone().toDate(),
            expireTime: expireTime.clone().toDate(),
          });

          await totalKwhModel.create({
            order: orderData._id,
            kWhData: kWhData,
            labelTime: labelTime,
          });
  
          resData = await jobModel.findOneAndUpdate(
            { _id: resData._id },
            {
              $addToSet: { orders: orderData._id },
              currentOrder: orderData._id,
              status: "pendingMonthlyPayment",
            },
            { new: true }
          );
  
          await global.agendaInstance.agenda.schedule(
            moment().add("2", "minutes").toDate(), //note: 5 minute
            "CheckOrderStatusTemp",
            { orderId: orderData._id }
          );
        }
      }

      
      // await global.agendaInstance.agenda.schedule(
      //   moment()
      //     .startOf("month")
      //     .add("1", "months")
      //     .toDate(),
      //   "CheckOrderStatusTemp",
      //   { orderId: orderData._id }
      // );

      // await global.agendaInstance.agenda.schedule(
      //   moment()
      //     .endOf("month")
      //     .toDate(),
      //   "CheckOrderStatus",
      //   { orderId: orderData._id }
      // );

      // await global.agendaInstance.agenda.every("2 minutes", "CreateOrder", { jobId: resData._id });
      // await global.agendaInstance.agenda.schedule(
      //   moment()
      //     .startOf("month")
      //     .add(1, "months")
      //     .toDate(),
      //   "CreateOrder",
      //   { jobId: resData._id }
      // );
      // }
      done();
    } catch (err) {
      done();
    }
  });

  // check order status
  agenda.define("CheckOrderStatus", async (job, done) => {
    try {
      // Init models
      const {
        order: orderModel,
        job: jobModel,
        room: roomModel,
        floor: floorModel,
        motelRoom: motelRoomModel,
        user: userModel, 
        payDepositList: payDepositListModel,
      } = global.mongoModel;

      let data = job.attrs.data;

      let orderData = await orderModel.findOne(job.attrs.data.orderId);

      if (orderData) {
        let userData = await userModel.findOne({_id: orderData.user}).lean().exec();
        if (!orderData.isCompleted) {
          const jobData = await jobModel.findOne({ orders: orderData._id })
            .lean()
            .exec();

          const jobDataAfterUpdate = await jobModel.findOneAndUpdate(
            { orders: orderData._id },
            {
              isActivated: false,
              isDeleted: true,
            },
            { new: true }
          );

          await payDepositListModel.create({
            room: jobDataAfterUpdate.room,
            user: jobDataAfterUpdate.user,
            job: jobDataAfterUpdate._id,
            ordersNoPay: orderData._id,
            type: "noPayDeposit",
            reasonNoPay: "noPayAterCheckInCost",
            amount: jobDataAfterUpdate.deposit,
          });

          await NotificationController.createNotification({
            title: "Thông báo hủy hợp đồng",

            content: `Phòng ${jobData.room.name} thuộc dãy ${jobData.motelRoom.name} 
            của quý khách đã bị hủy hợp đồng vì hết thời hạn thanh toán nhận phòng. 
            Quý khách sẽ không được hoàn lại các khoản tiền cọc trước đó.`,

            type: "cancelContract",
            user: userData._id,
            isRead: false,
            url: `${process.env.BASE_PATH_CLINET3}pay-deposit-user/`,
            tag: null,
            contentTag: null,
          })

          if (userData.email) {
            const transporter = nodemailer.createTransport({
              service: 'gmail',
              auth: {
                user: `${process.env.Gmail_USER}`,
                pass: `${process.env.Gmail_PASS}`
              }
            });

            const mailOptions = {
              from: `${process.env.Gmail_USER}`,
              // to: 'quyetthangmarvel@gmail.com',
              to: userData.email,
              subject: `[${jobData.room.name}] THÔNG BÁO HỦY HỢP ĐỒNG CHO THUÊ`, //tháng trước
              text: `Hợp đồng cho thuê phòng ${jobData.room.name} thuộc dãy ${jobData.motelRoom.name} của quý khách đã bị hủy vì hết thời hạn thanh toán nhận phòng. Quý khách sẽ không được hoàn lại các khoản tiền cọc trước đó.`,
            };

            // Gửi email
            transporter.sendMail(mailOptions, function (error, info) {
              if (error) {
                console.error(error);
              } else {
                // console.log('Email đã được gửi: ' + info.response);
              }
            });
          }

          if (jobData) {
            let roomId = jobData.room;
            const roomInfor = await roomModel.findOne({ _id: roomId })
              .lean()
              .exec();

            const userId = roomInfor.rentedBy;

            await roomModel.findOneAndUpdate({ _id: roomId }, {
              status: "available",
              $unset: { rentedBy: 1 },
            })
              .exec()

            //cập nhật lại floor
            let floorData = await floorModel
              .findOne({ rooms: roomId })
              .populate("rooms")
              .lean()
              .exec();

            let motelRoomData = await motelRoomModel
              .findOne({ floors: floorData._id })
              .populate("floors")
              .lean()
              .exec();

            await RoomController.updateInforMotel(
              floorData,
              motelRoomData,
            );

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
        }
      }

      done();
    } catch (err) {
      done();
    }
  });

  agenda.define("CheckAcceptOrder", async (job, done) => {
    try {
      // Init models
      const {
        order: orderModel,
        job: jobModel,
        room: roomModel,
        floor: floorModel,
        motelRoom: motelRoomModel,
        user: userModel, 
        payDepositList: payDepositListModel,
        transactions: transactionsModel,
      } = global.mongoModel;

      let data = job.attrs.data;

      const adminData = await userModel.findOne({
        role: { $in: ['master']}
      }).lean().exec();

      let orderData = await orderModel.findOne({
        _id: job.attrs.data.orderId,
        isDeleted: false,
      }).lean().exec(); // nếu order còn thì job còn, order bị xóa thì job cũng bị xóa và ngược lại

      if (orderData) {
        if (!orderData.isCompleted) {
          const jobData = await jobModel.findOne({ orders: orderData._id })
            .lean()
            .exec();

          if(moment() <= moment(new Date(orderData.expireTime))) {
            const roomData = await roomModel.findOne({_id: jobData.room}).lean().exec();
            const floorData = await floorModel.findOne({rooms: jobData.room}).lean().exec();

            const motelData = await motelRoomModel.findOne({floors: floorData._id}).lean().exec();

            const ownerData = await userModel.findOne({_id: motelData.owner}).lean().exec();

            const transactionData = await transactionsModel.findOne({order: orderData._id}).lean().exec();

            const transporter = nodemailer.createTransport({
              service: 'gmail',
              auth: {
                user: `${process.env.Gmail_USER}`,
                pass: `${process.env.Gmail_PASS}`
              }
            });



            const mailOptions = {
              from: `${process.env.Gmail_USER}`,
              // to: 'quyetthangmarvel@gmail.com',
              to: "cr7ronadol12345@gmail.com",  // thay bằng mail admin
              subject: `[${motelData.name}] - [${roomData.name}] NHẮC NHỞ DUYỆT THANH TOÁN CỌC`,
              text: `Vui lòng duyệt giao dịch cọc mã ${transactionData.keyPayment} cho phòng ${roomData.name}, tòa ${motelData.name}. Nếu minh chứng chuyển tiền là sai, vui lòng liên hệ admin để xử lý!`,
            };

            await NotificationController.createNotification({
              title: "Thông báo duyệt thanh toán cọc",
              content: `Vui lòng duyệt cọc cho phòng ${roomData.name} thuộc tòa nhà ${motelData.name}.`,
              user: adminData._id,
              isRead: false,
            });

            transporter.sendMail(mailOptions, function (error, info) {
              if (error) {
                console.error(error);
              } else {
                // console.log('Email đã được gửi: ' + info.response);
              }
            });

            await global.agendaInstance.agenda.schedule(
              moment().add("1", 'days').startOf("days").toDate(),
              'CheckAcceptOrder',
              { orderId: orderData._id }
            );
          } else {
            //note: tìm cách xử lý
          }

        }
      }

      done();
    } catch (err) {
      done();
    }
  });

  // check job status
  agenda.define("CheckJobStatus", async (job, done) => {
    try {
      // Init models
      const {
        order: orderModel,
        job: jobModel,
        room: roomModel,
        floor: floorModel,
        motelRoom: motelRoomModel,
        user: userModel,
        payDepositList: payDepositListModel
      } = global.mongoModel;

      let data = job.attrs.data;

      let jobData = await jobModel.findOne(job.attrs.data.jobId);

      if (jobData) {
        const userData = await userModel.findOne({ _id: jobData.user })
                                                                  .lean()
                                                                  .exec();

        let roomId = jobData.room;

        if (!jobData.isActived && !jobData.isDeleted) {
         if(userData) {
          const roomData = await roomModel.findOne({_id: jobData.room}).lean().exec();
          const floorDataN = await floorModel.findOne({rooms: jobData.room}).lean().exec();

          const motelData = await motelRoomModel.findOne({floors: floorDataN._id}).lean().exec();

          if(userData.email) {
            const transporter = nodemailer.createTransport({
              service: 'gmail',
              auth: {
                user: `${process.env.Gmail_USER}`,
                pass: `${process.env.Gmail_PASS}`
              }
            });

            const mailOptions = {
              from: `${process.env.Gmail_USER}`,
              // to: 'quyetthangmarvel@gmail.com',
              // to: "cr7ronadol12345@gmail.com",  // thay bằng mail admin
              to: userData.email,
              subject: `[${motelData.name}] - [${roomData.name}] THÔNG BÁO HỦY CỌC`,
              text: `Phòng ${roomData.name} thuộc tòa nhà ${motelData.name} của quý khách đã bị hủy cọc vì hết thời hạn kích hoạt hợp đồng`,
            };
    
            transporter.sendMail(mailOptions, function (error, info) {
              if (error) {
                console.error(error);
              } else {
                // console.log('Email đã được gửi: ' + info.response);
              }
            });
          }

          const jobDataAfterUpdate = await jobModel
            .findOneAndUpdate(
              { _id: jobData._id },
              {
                status: "expiredActivated",
                isDeleted: true,
              }, 
              {new: true}
            )
            .exec();

          await payDepositListModel.create({
            room: jobDataAfterUpdate.room,
            user: jobDataAfterUpdate.user,
            job: jobDataAfterUpdate._id,
            type: "noPayDeposit",
            reasonNoPay: "noActive",
            amount: jobDataAfterUpdate.deposit,
          });

          await NotificationController.createNotification({
            title: "Thông báo hủy cọc",

            content: `Phòng ${roomData.name} thuộc tòa nhà ${motelData.name} đặt 
            cọc ngày ${moment(jobData.checkInTime).format("DD-MM-YYYY")} 
            của quý khách đã bị hủy cọc vì hết thời hạn kích hoạt hợp đồng.`,

            user: jobData.user._id,
            isRead: false,
            type: "cancelContract",
            url: `${process.env.BASE_PATH_CLINET3}pay-deposit-user`,
            tag: null,
            contentTag: null,
          });

          const roomInfor = await roomModel.findOne({ _id: roomId })
            .lean()
            .exec();

          const userId = roomInfor.rentedBy;

          await roomModel.findOneAndUpdate({ _id: roomId }, {
            status: "available",
            $unset: { rentedBy: 1 },
          })
            .exec()

          let floorData = await floorModel
            .findOne({ rooms: roomId })
            .populate("rooms")
            .lean()
            .exec();

          let motelRoomData = await motelRoomModel
            .findOne({ floors: floorData._id })
            .populate("floors")
            .lean()
            .exec();

          await RoomController.updateInforMotel(
            floorData,
            motelRoomData,
          );

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

        }
      }

      done();
    } catch (err) {
      done();
    }
  });

  agenda.define("CheckOrderStatusTemp", async (job, done) => {
    try {
      // Init models
      const {
        order: orderModel,
        job: jobModel,
        room: roomModel,
        floor: floorModel,
        motelRoom: motelRoomModel,
        user: userModel, } = global.mongoModel;

      let data = job.attrs.data;

      const jobData = await jobModel.findOne({ orders: job.attrs.data.orderId });

      if (jobData) {
        let checkInTime = jobData.checkInTime;
        // checkInTime.setMonth(checkInTime.getMonth() + jobData.rentalPeriod); //
        
        let checkOutTime = moment(jobData.checkInTime).add(jobData.rentalPeriod, "months").subtract("1", "days"); // chính xác ngày cuối cùng còn được ở
        //nên có thể ngày hết hạn ở có thể nhỏ hơn ngày mà task này được chạy (vì task này chạy vào đầu tháng, một số phòng đặt phòng vào đầu tháng thì
        // vào cuối tháng trước, trước khi task chạy thì đã hết hạn rồi)
        console.log("CheckOrderStatusTemp checkOutTime", checkOutTime);
        console.log("CheckOrderStatusTemp moment", moment());

        if (moment().year() < checkOutTime.year()) {
          console.log("RemindUserMonthly15EveryDay_ExpireNextMonth checkOutTime", checkOutTime);
          console.log("RemindUserMonthly15EveryDay_ExpireNextMonth moment", moment());
          //CHECK
          //Nhắc nhở đóng tiền liên tục 15 ngày đầu
          await global.agendaInstance.agenda.schedule(
            moment().add("2", 'minutes').toDate(), //note: 5
            "RemindUserMonthly15EveryDay_ExpireNextMonth",//done
            { orderId: job.attrs.data.orderId }
          );

          done();

        } else if (moment().year() === checkOutTime.year()) {
          if (moment().month() < checkOutTime.month()) {
            //CHECKED
            console.log("RemindUserMonthly15EveryDay_ExpireNextMonth 2 checkOutTime", checkOutTime);
            console.log("RemindUserMonthly15EveryDay_ExpireNextMonth 2 moment", moment());

            //Nhắc nhở đóng tiền liên tục 15 ngày đầu
            await global.agendaInstance.agenda.schedule(
              moment().add("2", 'minutes').toDate(), //note: 5
              "RemindUserMonthly15EveryDay_ExpireNextMonth",//done
              { orderId: job.attrs.data.orderId }
            );

            done();

          } else if (moment().month() === checkOutTime.month()) {
            // if (checkOutTime.date() <= 2) {       
              //CHECKED       
            if (checkOutTime.date() <= 2) {
              await global.agendaInstance.agenda.schedule(
                moment().add("2", 'minutes').toDate(), //note: 5
                "RemindUserMonthlyToExpirePlus2Day_Expire1Or2ThisMonth", 
                { orderId: job.attrs.data.orderId }
              );

              done();

            } else if (checkOutTime.date() <= 15) {
              //CHECKED
              await global.agendaInstance.agenda.schedule(
                moment().add("2", 'minutes').toDate(), //note: 5
                "RemindUserMonthlyToExpireDay_ExpireThisMonth",
                { orderId: job.attrs.data.orderId }
              );

              done();

            } else {
              //CHECKED
              await global.agendaInstance.agenda.schedule(
                moment().add("2", 'minutes').toDate(),//note: 5
                "RemindUserMonthlyToDay15_ExpireThisMonth",
                { orderId: job.attrs.data.orderId }
              );

              done();

            }
          } else {
            //CHECKED
            //check in vào đầu tháng, sẽ hết hạn vào ngày cuối cùng của tháng
            await global.agendaInstance.agenda.schedule(
              moment().add("2", 'minutes').toDate(),//note: 5
              "RemindUserMonthlyToDay3_ExpireEndOfLastMonth",
              { orderId: job.attrs.data.orderId }
            );

            done();

          }
        } else {
          //check in vào đầu tháng, sẽ hết hạn vào ngày cuối cùng của tháng
          //CHECKED
          await global.agendaInstance.agenda.schedule(
            moment().add("2", 'minutes').toDate(),//note: 5
            "RemindUserMonthlyToDay3_ExpireEndOfLastMonth",
            { orderId: job.attrs.data.orderId }
          );

          done();

        }
      }
      done();
    } catch (err) {
      done();
    }
  });

  agenda.define("RemindUserMonthlyToDay3_ExpireEndOfLastMonth", async(job, done) => {
    try {
      const orderId = job.attrs.data.orderId;
      const {
        order: orderModel,
        job: jobModel,
        room: roomModel,
        floor: floorModel,
        motelRoom: motelRoomModel,
        user: userModel, 
        payDepositList: payDepositListModel,
      } = global.mongoModel;

      

      const orderData = await orderModel.findOne({ _id: job.attrs.data.orderId })
                                                                  .lean()
                                                                  .exec();

      if (orderData) {
        const jobId = orderData.job;
        const userId = orderData.user._id;

        const jobData = await JobController.getJobNoImg(jobId);

        const checkInTime = jobData.checkInTime;
        const rentalPeriod = jobData.rentalPeriod;

        const checkOutTime = moment(checkInTime).add(rentalPeriod, "months").subtract(1, "days"); // ngày cuối cùng được ở
        const checkOutTimePlus3Days = checkOutTime.add(3, 'days').endOf('day'); // ngày cuối cùng được ở

        if(!moment(orderData.expireTime).endOf('day').isSame(checkOutTimePlus3Days)) {
          await orderModel.findOneAndUpdate(
            {_id: orderData._id},
            {expireTime: checkOutTimePlus3Days}
          )
        }

        if (orderData.isCompleted === false) {

          const userData = await userModel.findOne({ _id: userId })
                                                                  .lean()
                                                                  .exec();

          // if (moment().date() <= 3) {
          if (checkOutTimePlus3Days.diff(moment().endOf('day')) >= 0) {
            if (userData) {
              await NotificationController.createNotification({
                title: "Thông báo đóng tiền phòng",

                content:`Quý khách vui lòng đóng tiền phòng tháng${checkOutTime.month() + 1}/${checkOutTime.year()} 
                cho phòng ${jobData.room.name} thuộc dãy ${jobData.motelRoom.name}. Hạn đóng tới hết ngày 
                03/${moment().month() + 1}/${moment().year()}. Lưu ý: Nếu không hoàn thành thanh toán, 
                quý khách sẽ không được hoàn trả tiền cọc.`,

                user: jobData.user._id,
                type: "monthly",
                isRead: false,
                url: `${process.env.BASE_PATH_CLINET3}job-detail/${jobData._id}/${jobData.room._id}`,
                tag: "Order",
                contentTag: orderData._id,
              });

              if (userData.email) {
                const transporter = nodemailer.createTransport({
                  service: 'gmail',
                  auth: {
                    user: `${process.env.Gmail_USER}`,
                    pass: `${process.env.Gmail_PASS}`
                  }
                });
  
                const mailOptions = {
                  from: `${process.env.Gmail_USER}`,
                  // to: 'quyetthangmarvel@gmail.com',
                  to: userData.email,
                  subject: `[${jobData.room.name}] THÔNG BÁO ĐÓNG TIỀN PHÒNG THÁNG ${checkOutTime.month() + 1}/${checkOutTime.year()}`,
                  text: `Quý khách vui lòng đóng tiền phòng tháng${checkOutTime.month() + 1}/${checkOutTime.year()} cho phòng ${jobData.room.name} thuộc dãy ${jobData.motelRoom.name}. Hạn đóng tới hết ngày 03/${moment().month() + 1}/${moment().year()}. Lưu ý: Nếu không hoàn thành thanh toán, quý khách sẽ không được hoàn trả tiền cọc.`,
                };

                
  
                // Gửi email
                transporter.sendMail(mailOptions, function (error, info) {
                  if (error) {
                    console.error(error);
                  } else {
                    // console.log('Email đã được gửi: ' + info.response);
                  }
                });
              } else {
                await global.agendaInstance.agenda.schedule(
                  moment()
                    .add(1, "days")
                    .startOf('day')
                    .toDate(),
                  "RemindUserMonthlyToDay3_ExpireEndOfLastMonth",
                  { orderId: job.attrs.data.orderId }
                );
              }
            }

            await global.agendaInstance.agenda.schedule(
              moment()
                .add(1, "days")
                .startOf('day')
                .toDate(),
              "RemindUserMonthlyToDay3_ExpireEndOfLastMonth",
              { orderId: job.attrs.data.orderId }
            );
          } else {
            const jobDataAfterUpdate= await jobModel.findOneAndUpdate(
              { orders: orderData._id },
              {
                isActivated: false,
                isDeleted: true,
              },
              { new: true }
            );

            await payDepositListModel.create({
              room: jobDataAfterUpdate.room,
              user: jobDataAfterUpdate.user,
              job: jobDataAfterUpdate._id,
              ordersNoPay: orderData._id,
              type: "noPayDeposit",
              reasonNoPay: "noPayMonthly",
              amount: jobDataAfterUpdate.deposit + jobDataAfterUpdate.afterCheckInCost,
              //thêm hạn thanh toán: note
            });

            const roomDataN = await roomModel.findOne({_id: jobData.room}).lean().exec();
            const floorDataN = await floorModel.findOne({rooms: jobData.room}).lean().exec();
  
            const motelDataN = await motelRoomModel.findOne({floors: floorDataN._id}).lean().exec();
  

            if(userData.email) {
              const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                  user: `${process.env.Gmail_USER}`,
                  pass: `${process.env.Gmail_PASS}`
                }
              });
  
              const mailOptions = {
                from: `${process.env.Gmail_USER}`,
                // to: 'quyetthangmarvel@gmail.com',
                // to: "cr7ronadol12345@gmail.com",  // thay bằng mail admin
                to: userData.email,
                subject: `[${motelDataN.name}] - [${roomDataN.name}] THÔNG BÁO HỦY HỢP ĐỒNG`,
                text: `Phòng ${roomDataN.name} thuộc tòa nhà ${motelDataN.name} của quý khách đã bị hủy hợp đồng vì không thanh toán hóa đơn tháng ${moment(orderData.startTime).format("MM-YYYY")} đúng hạn. Quý khách sẽ không được hoàn các khoản cọc trước đó.`,
              };
      
              transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                  console.error(error);
                } else {
                  // console.log('Email đã được gửi: ' + info.response);
                }
              });
            }

            await NotificationController.createNotification({
              title: "Thông báo hủy hợp đồng",

              content: `Phòng ${roomDataN.name} thuộc tòa nhà ${motelDataN.name} 
              của quý khách đã bị hủy hợp đồng vì không thanh toán hóa đơn tháng 
              ${moment(orderData.startTime).format("MM-YYYY")} đúng hạn.
              Quý khách sẽ không được hoàn các khoản cọc trước đó.`,

              user: jobData.user._id,
              isRead: false,
              type: "cancelContract",
              url: `${process.env.BASE_PATH_CLINET3}pay-deposit-user`,
              tag: null,
              contentTag: null,
            });

            if (jobData) {
              let roomId = jobData.room;
              const roomInfor = await roomModel.findOne({ _id: roomId })
                .lean()
                .exec();

              const userId = roomInfor.rentedBy;

              await roomModel.findOneAndUpdate({ _id: roomId }, {
                status: "available",
                $unset: { rentedBy: 1 },
              })
                .exec()

              let floorData = await floorModel
                .findOne({ rooms: roomId })
                .populate("rooms")
                .lean()
                .exec();
  
              let motelRoomData = await motelRoomModel
                .findOne({ floors: floorData._id })
                .populate("floors")
                .lean()
                .exec();
  
              await RoomController.updateInforMotel(
                floorData,
                motelRoomData,
              );

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

            if(userData) {
              await NotificationController.createNotification({
                title: "Thông báo hủy hợp đồng",

                content: `Hợp đồng cho thuê phòng ${jobData.room.name} thuộc dãy ${jobData.motelRoom.name} của 
                quý khách đã bị hủy vì quý khách chưa hoàn thành tiền phòng tháng ${moment().month()}/${moment().year()}.
                Quý khách sẽ không được hoàn các khoản tiền cọc trước đó.`,

                user: jobData.user._id,
                type: "cancelContract",
                isRead: false,
                url: `${process.env.BASE_PATH_CLINET3}pay-deposit-user/`,
                tag: null,
                contentTag: null,
              });

              if (userData.email) {
                const transporter = nodemailer.createTransport({
                  service: 'gmail',
                  auth: {
                    user: `${process.env.Gmail_USER}`,
                    pass: `${process.env.Gmail_PASS}`
                  }
                });
  
                const mailOptions = {
                  from: `${process.env.Gmail_USER}`,
                  // to: 'quyetthangmarvel@gmail.com',
                  to: userData.email,
                  subject: `[${jobData.room.name}] THÔNG BÁO HỦY HỢP ĐỒNG CHO THUÊ`, //tháng trước
                  text: `Hợp đồng cho thuê phòng ${jobData.room.name} thuộc dãy ${jobData.motelRoom.name} của quý khách đã bị hủy vì quý khách chưa hoàn thành tiền phòng tháng ${moment().month()}/${moment().year()}.`,
                };

                
  
                // Gửi email
                transporter.sendMail(mailOptions, function (error, info) {
                  if (error) {
                    console.error(error);
                  } else {
                    // console.log('Email đã được gửi: ' + info.response);
                  }
                });
              }
            }
          }
        } else {
          const jobDataAfterUpdate = await jobModel.findOneAndUpdate(
            { orders: orderData._id },
            {
              isActivated: false,
              isDeleted: true,
            },
            { new: true }
          );

          const payDepositListData = await payDepositListModel.create({
            room: jobDataAfterUpdate.room,
            user: jobDataAfterUpdate.user,
            job: jobDataAfterUpdate._id,
            type: "payDeposit",
            reasonNoPay: "unknown",
            amount: jobDataAfterUpdate.deposit + jobDataAfterUpdate.afterCheckInCost,
          });

          //user
          await NotificationController.createNotification({
            title: "Thông báo hết hợp đồng",

            content: `Phòng ${jobData.room.name} thuộc dãy ${jobData.motelRoom.name} 
            của quý khách đã hết thời hạn thuê. Hợp đồng đã hết hạn, bạn vui lòng truy cập 
            đường dẫn bên dưới để theo dõi khoản trả cọc.`,

            type: "payDeposit",
            user: jobDataAfterUpdate.user,
            isRead: false,
            url: `${process.env.BASE_PATH_CLINET3}pay-deposit-user/`,
            tag: "payDepositList",
            contentTag: payDepositListData._id,
          });

          //admin
          const adminData = await userModel.findOne({
            role: { $in: ['master']}
          }).lean().exec();

          await NotificationController.createNotification({
            title: "Thông báo thực hiện trả cọc",

            content: `Phòng ${jobData.room.name} thuộc dãy ${jobData.motelRoom.name} 
            đã hết hợp đồng thuê. Vui lòng truy cập đường dẫn bên dưới để thực hiện trả 
            cọc cho người dùng.`,

            type: "payDeposit",
            user: adminData._id,
            isRead: false,
            url: `${process.env.BASE_PATH_CLINET3}manage-deposit/pay-deposit/${jobData.motelRoom._id}`,
            tag: "payDepositList",
            contentTag: payDepositListData._id,
          });

          const userData = await userModel.findOne({_id: jobDataAfterUpdate.user}).lean().exec();

          if (userData.email) {
            const transporter = nodemailer.createTransport({
              service: 'gmail',
              auth: {
                user: `${process.env.Gmail_USER}`,
                pass: `${process.env.Gmail_PASS}`
              }
            });

            const mailOptions = {
              from: `${process.env.Gmail_USER}`,
              // to: 'quyetthangmarvel@gmail.com',
              to: userData.email,
              subject: `[${jobData.room.name}] THÔNG BÁO HẾT HẠN HỢP ĐỒNG CHO THUÊ`, //tháng trước
              text: `Hợp đồng cho thuê phòng ${jobData.room.name} thuộc dãy ${jobData.motelRoom.name} của quý khách đã hết hạn. Vui lòng truy cập vào đường dẫn ${process.env.BASE_PATH_CLINET3}pay-deposit-user/ , đăng nhập tài khoản để theo dõi thông tin về hoàn trả các khoản tiền cọc.`,
            };

            // Gửi email
            transporter.sendMail(mailOptions, function (error, info) {
              if (error) {
                console.error(error);
              } else {
                // console.log('Email đã được gửi: ' + info.response);
              }
            });
          }

          if (jobData) {
            let roomId = jobData.room;
            const roomInfor = await roomModel.findOne({ _id: roomId })
              .lean()
              .exec();

            const userId = roomInfor.rentedBy;

            await roomModel.findOneAndUpdate({ _id: roomId }, {
              status: "available",
              $unset: { rentedBy: 1 },
            })
              .exec()

            let floorData = await floorModel
              .findOne({ rooms: roomId })
              .populate("rooms")
              .lean()
              .exec();

            let motelRoomData = await motelRoomModel
              .findOne({ floors: floorData._id })
              .populate("floors")
              .lean()
              .exec();

            await RoomController.updateInforMotel(
              floorData,
              motelRoomData,
            );

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
        }
      }
      done();
    } catch (error) {
      console.log({error});
      done();
    }
  });

  agenda.define("RemindUserMonthlyToExpirePlus2Day_Expire1Or2ThisMonth", async(job, done) => {
    try {
      const orderId = job.attrs.data.orderId;
      const {
        order: orderModel,
        job: jobModel,
        room: roomModel,
        floor: floorModel,
        motelRoom: motelRoomModel,
        user: userModel,
        payDepositList: payDepositListModel,
        totalKwh: totalKwhModel,
      } = global.mongoModel;

      

      const orderData = await orderModel.findOne({ _id: job.attrs.data.orderId })
                                                                  .lean()
                                                                  .exec();

      if (orderData) {
        const jobId = orderData.job;
        const userId = orderData.user._id;

        const jobData = await JobController.getJobNoImg(jobId);

        const checkInTime = jobData.checkInTime;
        const rentalPeriod = jobData.rentalPeriod;

        const checkOutTime = moment(checkInTime).add(rentalPeriod, "months").subtract(1, "days"); // ngày cuối cùng được ở

        //update expireTime, because default expireTime = createTime + 15(days);
        if(moment(orderData.expireTime).date() !== 4) {
          await orderModel.findOneAndUpdate(
            {_id: orderData._id},
            {expireTime: checkOutTime.clone().date(4).endOf('day').toDate()}
          )
        }
     
        if (orderData.isCompleted === false) {

          const userData = await userModel.findOne({ _id: userId })
                                                                  .lean()
                                                                  .exec();

          if (moment().date() <= 4) {
            if (userData) {
              await NotificationController.createNotification({
                title: "Thông báo đóng tiền phòng",

                content: `Quý khách vui lòng đóng tiền phòng tháng${checkOutTime.month()}/${checkOutTime.year()} 
                cho phòng ${jobData.room.name} thuộc dãy ${jobData.motelRoom.name}. Hạn đóng tới hết ngày 
                04/${checkOutTime.month() + 1}/${checkOutTime.year()}. Lưu ý: Nếu không hoàn thành thanh toán, 
                quý khách sẽ không được hoàn trả tiền cọc.`,

                type: "monthly",
                user: jobData.user._id,
                isRead: false,
                url: `${process.env.BASE_PATH_CLINET3}job-detail/${jobData._id}/${jobData.room._id}`,
                tag: "Order",
                contentTag: orderData._id,
              });

              if (userData.email) {
                const transporter = nodemailer.createTransport({
                  service: 'gmail',
                  auth: {
                    user: `${process.env.Gmail_USER}`,
                    pass: `${process.env.Gmail_PASS}`
                  }
                });
  
                const mailOptions = {
                  from: `${process.env.Gmail_USER}`,
                  // to: 'quyetthangmarvel@gmail.com',
                  to: userData.email,
                  subject: `[${jobData.room.name}] THÔNG BÁO ĐÓNG TIỀN PHÒNG THÁNG ${checkOutTime.month()}/${checkOutTime.year()}`,//tháng trước
                  text: `Quý khách vui lòng đóng tiền phòng tháng${checkOutTime.month()}/${checkOutTime.year()} cho phòng ${jobData.room.name} thuộc dãy ${jobData.motelRoom.name}. Hạn đóng tới hết ngày 04/${checkOutTime.month() + 1}/${checkOutTime.year()}. Lưu ý: Nếu không hoàn thành thanh toán, quý khách sẽ không được hoàn trả tiền cọc.`,
                };

                
  
                // Gửi email
                transporter.sendMail(mailOptions, function (error, info) {
                  if (error) {
                    console.error(error);
                  } else {
                    // console.log('Email đã được gửi: ' + info.response);
                  }
                });
  
                // console.log(`Gửi tới mail: ${userData.email}`);
              } else {
                console.log("VÀO ĐÂY HẢ 1");
                console.log(moment());
                await global.agendaInstance.agenda.schedule(
                  moment()
                    .add(1, "days")
                    .startOf("days")
                    .toDate(),
                  "RemindUserMonthlyToExpirePlus2Day_Expire1Or2ThisMonth",
                  { orderId: job.attrs.data.orderId }
                );

                done();
              }
            }

            console.log("VÀO ĐÂY HẢ 2");
            console.log(moment());
            await global.agendaInstance.agenda.schedule(
              moment()
                .add(1, "days")
                .startOf("days")
                .toDate(),
              "RemindUserMonthlyToExpirePlus2Day_Expire1Or2ThisMonth",
              { orderId: job.attrs.data.orderId }
            );

            done();
          } else {
            const payDeposit = await payDepositListModel.create({
              room: jobData.room,
              user: jobData.user,
              job: jobData._id,
              ordersNoPay: orderData._id,
              type: "noPayDeposit",
              reasonNoPay: "noPayMonthly",
              amount: jobData.deposit + jobData.afterCheckInCost,
              //thêm hạn thanh toán: note
            });
            const startTime = moment().startOf("months").startOf("day");
            const start = startTime.format("YYYY-MM-DD");
            const monInEnd = (moment().month() + 1) < 10 ? ("0" + (moment().month() + 1)) : (moment().month() + 1);
            // const end = moment().year() + "-" + monInEnd + "-" + "04";
            const endTime = checkOutTime.clone().endOf("day");
            const end = endTime.format("YYYY-MM-DD");
            const expireTime = endTime.clone().add(15, "days");

            // let electricNumber = await EnergyController.countElectricV2(jobData._id, start, end);
            const roomId = jobData.room;
            let dataElectricAll = await EnergyController.calculateElectricUsedDayToDayHaveLabelTime(roomId, start, end);

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

            const roomData = await roomModel.findOne({_id: roomId})
                                                                        .lean()
                                                                        .exec();
            const electricityPricePerKwh = roomData.electricityPrice;
            const electricPrice = electricNumber * electricityPricePerKwh;

            const dayOfMon = moment().daysInMonth(); // số ngày của tháng
            const numberDayStay = (Math.abs(checkOutTime.diff(checkOutTime.startOf("month"), "days")) + 1); //cộng 1: tính cả ngày checkIn
            const waterPrice = (roomData.waterPrice * roomData.person);
            const servicePrice = roomData.garbagePrice;
            const vehiclePrice = (roomData.wifiPrice * roomData.vihicle);
            const roomPrice = (jobData.room.price / dayOfMon) * numberDayStay;
            const wifiPriceN = roomData.wifiPriceN * roomData.person;
            const amount = roomPrice + vehiclePrice + servicePrice + waterPrice + electricPrice + wifiPriceN;

            //oder  những ngày của tháng mới
            const orderDataNoPay = await orderModel.create({
              user: jobData.user,
              job: jobData._id,
              isCompleted: false,
              electricNumber: electricNumber,
              electricPrice: electricPrice,
              numberDayStay: numberDayStay,
              waterPrice: waterPrice,
              servicePrice: servicePrice,
              vehiclePrice: vehiclePrice,
              roomPrice: roomPrice,
              wifiPrice: wifiPriceN,
              description: `Tiền phòng tháng ${moment().month() + 1}/${moment().year()}`,
              amount: amount,
              type: "monthly",
              startTime: startTime.clone().toDate(),
              endTime: endTime.clone().toDate(),
              expireTime: expireTime.clone().toDate(),
            });

            await totalKwhModel.create({
              order: orderData._id,
              kWhData: kWhData,
              labelTime: labelTime,
            });

            const jobDataAfterUpdate = await jobModel.findOneAndUpdate(
              { orders: orderData._id },
              {
                $addToSet: { orders: orderDataNoPay._id },
                isActivated: false,
                isDeleted: true,
              },
              { new: true }
            );

            //Thêm order chưa được trả
            await payDepositListModel.findOneAndUpdate(
              {_id : payDeposit._id},
              {
                $addToSet: { ordersNoPay: orderDataNoPay._id },
              },
              { new: true }
            )

            if (jobData) {
              let roomId = jobData.room;
              const roomInfor = await roomModel.findOne({ _id: roomId })
                .lean()
                .exec();

              const userId = roomInfor.rentedBy;

              await roomModel.findOneAndUpdate({ _id: roomId }, {
                status: "available",
                $unset: { rentedBy: 1 },
              })
                .exec()

              let floorData = await floorModel
                .findOne({ rooms: roomId })
                .populate("rooms")
                .lean()
                .exec();
  
              let motelRoomData = await motelRoomModel
                .findOne({ floors: floorData._id })
                .populate("floors")
                .lean()
                .exec();
  
              await RoomController.updateInforMotel(
                floorData,
                motelRoomData,
              );

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

            if(userData) {
              await NotificationController.createNotification({
                title: "Thông báo hủy hợp đồng",

                content: `Hợp đồng cho thuê phòng ${jobData.room.name} thuộc dãy ${jobData.motelRoom.name} của 
                quý khách đã bị hủy vì quý khách chưa hoàn thành tiền phòng tháng 
                ${moment(orderData.startTime).format("MM-YYYY")} đúng hạn.`,

                type: "cancelContract",
                user: jobData.user._id,
                isRead: false,
                url: `${process.env.BASE_PATH_CLINET3}pay-deposit-user/`,
                tag: null,
                contentTag: null,
              });

              if (userData.email) {
                const transporter = nodemailer.createTransport({
                  service: 'gmail',
                  auth: {
                    user: `${process.env.Gmail_USER}`,
                    pass: `${process.env.Gmail_PASS}`
                  }
                });
  
                const mailOptions = {
                  from: `${process.env.Gmail_USER}`,
                  // to: 'quyetthangmarvel@gmail.com',
                  to: userData.email,
                  subject: `[${jobData.room.name}] THÔNG BÁO HỦY HỢP ĐỒNG CHO THUÊ`, //tháng trước
                  text: `Hợp đồng cho thuê phòng ${jobData.room.name} thuộc dãy ${jobData.motelRoom.name} của quý khách đã bị hủy vì quý khách chưa hoàn thành tiền phòng tháng ${moment(orderData.startTime).format("MM-YYYY")} đúng hạn.`,
                };
  
                // Gửi email
                transporter.sendMail(mailOptions, function (error, info) {
                  if (error) {
                    console.error(error);
                  } else {
                    // console.log('Email đã được gửi: ' + info.response);
                  }
                });
  
              }
            }
          }
        } else {
          //NOTE: thêm job thanh toán những ngày còn lại
          if (moment().date() <= checkOutTime.date()) {
            console.log("TRƯỜNG HỢP 1");
            await global.agendaInstance.agenda.schedule(
              checkOutTime
                .add(1, "days").startOf('day')
                .toDate(),
              "CreateOrderForRestDayInMonExpireContract_At1Or2Day",
              { jobId: jobData._id }
            );
            done();
          } else {
            console.log("TRƯỜNG HỢP 2");
            await global.agendaInstance.agenda.schedule(
              moment()
                .add(2, "hours")
                .toDate(),
              "CreateOrderForRestDayInMonExpireContract_At1Or2Day",
              { jobId: jobData._id }
            );
            done();
          }
        }
      }
    } catch (error) {
      console.log({error});
      done();
    }
  })

  agenda.define("CreateOrderForRestDayInMonExpireContract_At1Or2Day", async (job, done) => {
    try {
      console.log("CreateOrderForRestDayInMonExpireContract_At1Or2Day");
      // Init models
      const { order: orderModel, job: jobModel, room: roomModel, totalKwh: totalKwhModel } = global.mongoModel;

      let data = job.attrs.data;

      let resData = await JobController.getJobNoImg(job.attrs.data.jobId);

      if (resData) {
        if (resData.isActived && !(resData.isDeleted)) {
          const checkInDay = resData.checkInTime;
          const rentalPeriod = resData.rentalPeriod;
          const checkOutDay = moment(checkInDay).add(rentalPeriod, "months").subtract(1, "days"); //  chính xác ngày ở cuối 

          const startTime = checkOutDay.clone().startOf("months").startOf("day");
          const start = startTime.format("YYYY-MM-DD");
          const endTime = checkOutDay.clone().endOf("day");
          const end = endTime.clone().format("YYYY-MM-DD");
          const expireTime = endTime.clone().date(6).endOf('day');
          
          // let electricNumber = await EnergyController.countElectricV2(job.attrs.data.jobId, start, end);
          const roomId = resData.room;
          let dataElectricAll = await EnergyController.calculateElectricUsedDayToDayHaveLabelTime(
            roomId,
            start,
            end
          );

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
  
          const roomData = await roomModel.findOne({_id: roomId})
                                                                      .lean()
                                                                      .exec();
          const electricityPricePerKwh = roomData.electricityPrice;
  
          const electricPrice = electricNumber * electricityPricePerKwh;

          const dayOfMon = moment(checkOutDay).daysInMonth(); // số ngày của tháng

          // note: checkOutDay.clone().subtract(1, 'days'): vì nếu lấy ngày hiện tại thì thiếu 1 giây, bị làm tròn xuống số ngày
          const numberDayStay = (Math.abs(checkOutDay.clone().endOf("days").diff(checkOutDay.clone().startOf("month"), "days")) + 1); //cộng 1: tính cả ngày checkIn
          const waterPrice = (roomData.waterPrice * roomData.person);
          const servicePrice = roomData.garbagePrice;
          const vehiclePrice = (roomData.wifiPrice * roomData.vihicle);
          const roomPrice = (resData.room.price / dayOfMon) * numberDayStay;
          const wifiPriceN = roomData.wifiPriceN * roomData.person;
          const amount = roomPrice + vehiclePrice + servicePrice + waterPrice + electricPrice + wifiPriceN;


  
          // console.log("BỘ BỘ: hihi", (checkOutDay.clone().startOf("month")));
          // console.log("BỘ BỘ: endTime", endTime)
          const orderData = await orderModel.create({
            user: resData.user,
            job: resData._id,
            isCompleted: false,
            electricNumber: electricNumber,
            electricPrice: electricPrice,
            numberDayStay: numberDayStay,
            waterPrice: waterPrice,
            servicePrice: servicePrice,
            vehiclePrice: vehiclePrice,
            roomPrice: roomPrice,
            wifiPrice: wifiPriceN,
            description: `Tiền phòng tháng ${checkOutDay.month() + 1}/${checkOutDay.year()}`,
            amount: amount,
            type: "monthly",
            startTime: startTime.clone().toDate(),
            endTime: endTime.clone().toDate(),
            expireTime: expireTime.clone().toDate(),
          });

          await totalKwhModel.create({
            order: orderData._id,
            kWhData: kWhData,
            labelTime: labelTime,
          });
  
          resData = await jobModel.findOneAndUpdate(
            { _id: resData._id },
            {
              $addToSet: { orders: orderData._id },
              currentOrder: orderData._id,
              status: "pendingMonthlyPayment",
            },
            { new: true }
          );
  
          await global.agendaInstance.agenda.schedule(
            moment().add("2", 'minutes').toDate(), //note: 5
            "CheckOrderStatusForContractExpireIn1Or2Day_In2AfterDayExpireContract",
            { orderId: orderData._id }
          );
  
        }
      }
      done();
    } catch (err) {
      done();
    }
  });

  agenda.define("CheckOrderStatusForContractExpireIn1Or2Day_In2AfterDayExpireContract", async (job, done) => {
    try {
      // Init models
      const {
        order: orderModel,
        job: jobModel,
        room: roomModel,
        floor: floorModel,
        motelRoom: motelRoomModel,
        user: userModel, 
        payDepositList: payDepositListModel,
      } = global.mongoModel;

      let data = job.attrs.data;

      let orderData = await orderModel.findOne(job.attrs.data.orderId);

      if (orderData) {

        if(moment(orderData.expireTime).date() !== 6) {
          await orderModel.findOneAndUpdate(
            {_id: orderData._id},
            {expireTime: moment(orderData.expireTime).date(6).endOf('day').toDate()}
          )
        }
        const jobId = orderData.job;
        const userId = orderData.user._id;
        const jobData = await JobController.getJobNoImg(jobId);
        if (!orderData.isCompleted) {
          const userData = await userModel.findOne({ _id: userId })
            .lean()
            .exec();

          const checkInDay = jobData.checkInTime;
          const rentalPeriod = jobData.rentalPeriod;
          const checkOutDay = moment(checkInDay).add(rentalPeriod, "months").subtract(1, "days"); //  chính xác ngày ở cuối cùng
  
          if (moment().date() <= 6) {
            //gửi lần cuối vào đầu ngày cuối (lấy hiện tại trừ thời gian hết hạn)
            if (userData) {
              await NotificationController.createNotification({
                title: "Thông báo đóng tiền phòng",

                content: `Quý khách vui lòng đóng tiền phòng tháng ${checkOutDay.month() + 1}/${checkOutDay.year()} 
                cho phòng ${jobData.room.name} thuộc dãy ${jobData.motelRoom.name}. Hạn đóng tới hết ngày 
                06/${checkOutDay.month() + 1}/${checkOutDay.year()}. Lưu ý: Nếu không thực hiện đóng hóa đơn này, 
                quý khách sẽ không được hoàn trả tiền cọc.`,

                type: "monthly",
                user: jobData.user._id,
                isRead: false,
                url: `${process.env.BASE_PATH_CLINET3}job-detail/${jobData._id}/${jobData.room._id}`,
                tag: "Order",
                contentTag: orderData._id,
              });

              if (userData.email) {
                const transporter = nodemailer.createTransport({
                  service: 'gmail',
                  auth: {
                    user: `${process.env.Gmail_USER}`,
                    pass: `${process.env.Gmail_PASS}`
                  }
                });
    
                const mailOptions = {
                  from: `${process.env.Gmail_USER}`,
                  // to: 'quyetthangmarvel@gmail.com',
                  to: userData.email,
                  subject: `[${jobData.room.name}] THÔNG BÁO ĐÓNG TIỀN PHÒNG THÁNG ${checkOutDay.month() + 1}/${checkOutDay.year()}`,
                  text: `Quý khách vui lòng đóng tiền phòng tháng ${checkOutDay.month() + 1}/${checkOutDay.year()} cho phòng ${jobData.room.name} thuộc dãy ${jobData.motelRoom.name}. Hạn đóng tới hết ngày 06/${checkOutDay.month() + 1}/${checkOutDay.year()}. Lưu ý: Nếu không thực hiện đóng hóa đơn này, quý khách sẽ không được hoàn trả tiền cọc.`,
                };

  
                // Gửi email
                transporter.sendMail(mailOptions, function (error, info) {
                  if (error) {
                    console.error(error);
                  } else {
                    // console.log('Email đã được gửi: ' + info.response);
                  }
                });
  
                // console.log(`Gửi tới mail: ${userData.email}`);
              } else {
                console.log("Ở ĐÂYYY 1")
                await global.agendaInstance.agenda.schedule(
                  moment()
                    .add("1", "days")
                    .startOf("days")
                    .toDate(),
                  "CheckOrderStatusForContractExpireIn1Or2Day_In2AfterDayExpireContract",
                  { orderId: orderData._id }
                );
                done();
                return;
              }
            }

            console.log("Ở ĐÂYYY 2")
            await global.agendaInstance.agenda.schedule(
              moment()
                .add("1", "days")
                .startOf("days")
                .toDate(),
              "CheckOrderStatusForContractExpireIn1Or2Day_In2AfterDayExpireContract",
              { orderId: orderData._id }
            );

            done();
            return;
          } else {
            const jobDataAfterUpdate = await jobModel.findOneAndUpdate(
              { orders: orderData._id },
              {
                isActivated: false,
                isDeleted: true,
              },
              { new: true }
            );

            await payDepositListModel.create({
              room: jobDataAfterUpdate.room,
              user: jobDataAfterUpdate.user,
              job: jobDataAfterUpdate._id,
              ordersNoPay: orderData._id,
              type: "noPayDeposit",
              reasonNoPay: "noPayMonthly",
              amount: jobDataAfterUpdate.deposit + jobDataAfterUpdate.afterCheckInCost,
            });

            const roomDataN = await roomModel.findOne({_id: jobDataAfterUpdate.room}).lean().exec();
            const floorDataN = await floorModel.findOne({rooms: jobDataAfterUpdate.room}).lean().exec();
  
            const motelDataN = await motelRoomModel.findOne({floors: floorDataN._id}).lean().exec();
  

            if(userData.email) {
              const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                  user: `${process.env.Gmail_USER}`,
                  pass: `${process.env.Gmail_PASS}`
                }
              });
  
              const mailOptions = {
                from: `${process.env.Gmail_USER}`,
                // to: 'quyetthangmarvel@gmail.com',
                // to: "cr7ronadol12345@gmail.com",  // thay bằng mail admin
                to: userData.email,
                subject: `[${motelDataN.name}] - [${roomDataN.name}] THÔNG BÁO HỦY HỢP ĐỒNG`,
                text: `Phòng ${roomDataN.name} thuộc tòa nhà ${motelDataN.name} của quý khách đã bị hủy hợp đồng vì không thanh toán hóa đơn tháng ${moment(orderData.startTime).format("MM-YYYY")} đúng hạn. Quý khách sẽ không được hoàn các khoản cọc trước đó.`,
              };
      
              transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                  console.error(error);
                } else {
                  // console.log('Email đã được gửi: ' + info.response);
                }
              });
            }

            await NotificationController.createNotification({
              title: "Thông báo hủy hợp đồng",

              content: `Phòng ${roomDataN.name} thuộc tòa nhà ${motelDataN.name} 
              của quý khách đã bị hủy hợp đồng vì không thanh toán hóa đơn 
              tháng ${moment(orderData.startTime).format("MM-YYYY")} đúng hạn.
              Quý khách sẽ không được hoàn các khoản cọc trước đó.`,

              user: jobDataAfterUpdate.user,
              isRead: false,
              type: "cancelContract",
              url: `${process.env.BASE_PATH_CLINET3}pay-deposit-user`,
              tag: null,
              contentTag: null,
            });

            if (jobData) {
              let roomId = jobData.room;
              const roomInfor = await roomModel.findOne({ _id: roomId })
                .lean()
                .exec();

              const userId = roomInfor.rentedBy;

              await roomModel.findOneAndUpdate({ _id: roomId }, {
                status: "available",
                $unset: { rentedBy: 1 },
              })
                .exec()

              let floorData = await floorModel
                .findOne({ rooms: roomId })
                .populate("rooms")
                .lean()
                .exec();
  
              let motelRoomData = await motelRoomModel
                .findOne({ floors: floorData._id })
                .populate("floors")
                .lean()
                .exec();
  
              await RoomController.updateInforMotel(
                floorData,
                motelRoomData,
              );

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
          }
        } else {
          const jobDataAfterUpdate = await jobModel.findOneAndUpdate(
            { orders: orderData._id },
            {
              isActivated: false,
              isDeleted: true,
            },
            { new: true }
          );

          const payDepositListData = await payDepositListModel.create({
            room: jobDataAfterUpdate.room,
            user: jobDataAfterUpdate.user,
            job: jobDataAfterUpdate._id,
            type: "payDeposit",
            reasonNoPay: "unknown",
            amount: jobDataAfterUpdate.deposit + jobDataAfterUpdate.afterCheckInCost,
            //thêm hạn thanh toán: note
          });

          //user
          await NotificationController.createNotification({
            title: "Thông báo hết hợp đồng",

            content: `Phòng ${jobData.room.name} thuộc dãy ${jobData.motelRoom.name} 
            của quý khách đã hết thời hạn thuê. Hợp đồng đã hết hạn, bạn vui lòng truy cập 
            đường dẫn bên dưới để theo dõi khoản trả cọc.`,

            type: "payDeposit",
            user: jobDataAfterUpdate.user,
            isRead: false,
            url: `${process.env.BASE_PATH_CLINET3}pay-deposit-user/`,
            tag: "payDepositList",
            contentTag: payDepositListData._id,
          });

          //admin
          const adminData = await userModel.findOne({
            role: { $in: ['master']}
          }).lean().exec();

          await NotificationController.createNotification({
            title: "Thông báo thực hiện trả cọc",

            content: `Phòng ${jobData.room.name} thuộc dãy ${jobData.motelRoom.name} 
            đã hết hợp đồng thuê. Vui lòng truy cập đường dẫn bên dưới để thực hiện trả 
            cọc cho người dùng.`,

            type: "payDeposit",
            user: adminData._id,
            isRead: false,
            url: `${process.env.BASE_PATH_CLINET3}manage-deposit/pay-deposit/${jobData.motelRoom._id}`,
            tag: "payDepositList",
            contentTag: payDepositListData._id,
          });

          const userData = await userModel.findOne({_id: jobDataAfterUpdate.user}).lean().exec();

          if (userData.email) {
            const transporter = nodemailer.createTransport({
              service: 'gmail',
              auth: {
                user: `${process.env.Gmail_USER}`,
                pass: `${process.env.Gmail_PASS}`
              }
            });

            const mailOptions = {
              from: `${process.env.Gmail_USER}`,
              // to: 'quyetthangmarvel@gmail.com',
              to: userData.email,
              subject: `[${jobData.room.name}] THÔNG BÁO HẾT HẠN HỢP ĐỒNG CHO THUÊ`, //tháng trước
              text: `Hợp đồng cho thuê phòng ${jobData.room.name} thuộc dãy ${jobData.motelRoom.name} của quý khách đã hết hạn. Vui lòng truy cập vào đường dẫn ${process.env.BASE_PATH_CLINET3}pay-deposit-user/ , đăng nhập tài khoản để theo dõi thông tin về hoàn trả các khoản tiền cọc.`,
            };

            // Gửi email
            transporter.sendMail(mailOptions, function (error, info) {
              if (error) {
                console.error(error);
              } else {
                // console.log('Email đã được gửi: ' + info.response);
              }
            });
          }

          if (jobData) {
            let roomId = jobData.room;
            const roomInfor = await roomModel.findOne({ _id: roomId })
              .lean()
              .exec();

            const userId = roomInfor.rentedBy;

            await roomModel.findOneAndUpdate({ _id: roomId }, {
              status: "available",
              $unset: { rentedBy: 1 },
            })
              .exec()

            let floorData = await floorModel
              .findOne({ rooms: roomId })
              .populate("rooms")
              .lean()
              .exec();

            let motelRoomData = await motelRoomModel
              .findOne({ floors: floorData._id })
              .populate("floors")
              .lean()
              .exec();

            await RoomController.updateInforMotel(
              floorData,
              motelRoomData,
            );

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
        }
      }
      done();
    } catch (err) {
      done();
    }
  });


  //áp dụng cho các phòng có hợp đồng còn hạn qua tháng
  agenda.define("RemindUserMonthly15EveryDay_ExpireNextMonth", async (job, done) => {
    try {
      let data = job.attrs.data;

      const {
        order: orderModel,
        job: jobModel,
        room: roomModel,
        floor: floorModel,
        motelRoom: motelRoomModel,
        user: userModel, 
        payDepositList: payDepositListModel,
        totalKwh: totalKwhModel,
      } = global.mongoModel;

      const orderData = await orderModel.findOne({ _id: job.attrs.data.orderId })
        .lean()
        .exec();

      if (orderData) {
        const jobId = orderData.job;
        const userId = orderData.user._id;

        if (orderData.isCompleted === false) {

          const userData = await userModel.findOne({ _id: userId })
            .lean()
            .exec();

          const jobData = await JobController.getJobNoImg(jobId);

          if (moment().date() <= 15) { //note gốc là: 15
            if (userData) {
              await NotificationController.createNotification({
                title: "Thông báo đóng tiền phòng",

                content: `Quý khách vui lòng đóng tiền phòng tháng ${moment().month()}/${moment().year()} 
                cho phòng ${jobData.room.name} thuộc dãy ${jobData.motelRoom.name}. Hạn đóng tới hết 
                ngày 15/${moment().month() + 1}/${moment().year()}. Lưu ý: Nếu không hoàn thành đúng hạn, 
                quý khách sẽ bị hủy phòng và mất cọc.`,

                type: "monthly",
                user: jobData.user._id,
                isRead: false,
                url: `${process.env.BASE_PATH_CLINET3}job-detail/${jobData._id}/${jobData.room._id}`, 
                tag: "Order",
                contentTag: orderData._id,
              });

              if (userData.email) {
                const transporter = nodemailer.createTransport({
                  service: 'gmail',
                  auth: {
                    user: `${process.env.Gmail_USER}`,
                    pass: `${process.env.Gmail_PASS}`
                  }
                });
  
                const mailOptions = {
                  from: `${process.env.Gmail_USER}`,
                  // to: 'quyetthangmarvel@gmail.com',
                  to: userData.email,
                  subject: `[${jobData.room.name}] THÔNG BÁO ĐÓNG TIỀN PHÒNG THÁNG ${moment().month()}/${moment().year()}`, //tháng trước
                  text: `Quý khách vui lòng đóng tiền phòng tháng ${moment().month()}/${moment().year()} cho phòng ${jobData.room.name} thuộc dãy ${jobData.motelRoom.name}. Hạn đóng tới hết ngày 15/${moment().month() + 1}/${moment().year()}. Lưu ý: Nếu không hoàn thành đúng hạn, quý khách sẽ bị hủy phòng và mất cọc.`,
                };
  
                // Gửi email
                transporter.sendMail(mailOptions, function (error, info) {
                  if (error) {
                    console.error(error);
                  } else {
                    // console.log('Email đã được gửi: ' + info.response);
                  }
                });
  
              } else {
                console.log("LAANFNNN 1")
                await global.agendaInstance.agenda.schedule(
                  moment()
                    .add(1, "days")
                    .startOf("day")
                    .toDate(),
                  "RemindUserMonthly15EveryDay_ExpireNextMonth",
                  { orderId: job.attrs.data.orderId }
                );
                done();
              }
            }

            console.log("LAANFNNN 2")

            await global.agendaInstance.agenda.schedule(
              moment()
                .add(1, "days")
                .startOf("day")
                .toDate(),
              "RemindUserMonthly15EveryDay_ExpireNextMonth",
              { orderId: job.attrs.data.orderId }
            );
            done();
          } else {
            const payDeposit = await payDepositListModel.create({
              room: jobData.room,
              user: jobData.user,
              job: jobData._id,
              ordersNoPay: orderData._id,
              type: "noPayDeposit",
              reasonNoPay: "noPayMonthly",
              amount: jobData.deposit + jobData.afterCheckInCost,
              //thêm hạn thanh toán: note
            });

            const roomDataN = await roomModel.findOne({_id: jobData.room}).lean().exec();
            const floorDataN = await floorModel.findOne({rooms: jobData.room}).lean().exec();
  
            const motelDataN = await motelRoomModel.findOne({floors: floorDataN._id}).lean().exec();
  

            if(userData.email) {
              const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                  user: `${process.env.Gmail_USER}`,
                  pass: `${process.env.Gmail_PASS}`
                }
              });
  
              const mailOptions = {
                from: `${process.env.Gmail_USER}`,
                // to: 'quyetthangmarvel@gmail.com',
                // to: "cr7ronadol12345@gmail.com",  // thay bằng mail admin
                to: userData.email,
                subject: `[${motelDataN.name}] - [${roomDataN.name}] THÔNG BÁO HỦY HỢP ĐỒNG`,
                text: `Phòng ${roomDataN.name} thuộc tòa nhà ${motelDataN.name} của quý khách đã bị hủy hợp đồng vì không thanh toán hóa đơn tháng ${moment(orderData.startTime).format("MM-YYYY")} đúng hạn. Quý khách sẽ không được hoàn các khoản cọc trước đó.`,
              };
      
              transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                  console.error(error);
                } else {
                  // console.log('Email đã được gửi: ' + info.response);
                }
              });
            }

            await NotificationController.createNotification({
              title: "Thông báo hủy hợp đồng",

              content: `Phòng ${roomDataN.name} thuộc tòa nhà ${motelDataN.name} 
              của quý khách đã bị hủy hợp đồng vì không thanh toán hóa đơn tháng
              ${moment(orderData.startTime).format("MM-YYYY")} đúng hạn.
              Quý khách sẽ không được hoàn các khoản cọc trước đó.`,

              user: jobData.user._id,
              isRead: false,
              type: "cancelContract",
              url: `${process.env.BASE_PATH_CLINET3}pay-deposit-user`,
              tag: null,
              contentTag: null,
            });

            const startTime = moment().startOf("months").startOf("day");
            const start = startTime.format("YYYY-MM-DD");
            const monInEnd = (moment().month() + 1) < 10 ? ("0" + (moment().month() + 1)) : (moment().month() + 1);
            const endTime = moment(`${moment().year()}-${monInEnd}-15`).endOf("day");
            const end = moment().year() + "-" + monInEnd + "-" + "15";

            const expireTime = endTime.clone().add(15, "days");

            // let electricNumber = await EnergyController.countElectricV2(jobData._id, start, end);
            const roomId = jobData.room;
            let dataElectricAll = await EnergyController.calculateElectricUsedDayToDayHaveLabelTime(roomId, start, end);

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
            
            const roomData = await roomModel.findOne({_id: roomId})
                                                                        .lean()
                                                                        .exec();
            const electricityPricePerKwh = roomData.electricityPrice;
            const electricPrice = electricNumber * electricityPricePerKwh;

            const dayOfMon = moment().daysInMonth(); // số ngày của tháng
            const numberDayStay = 15; 
            const waterPrice = (roomData.waterPrice * roomData.person);
            const servicePrice = roomData.garbagePrice;
            const vehiclePrice = (roomData.wifiPrice * roomData.vihicle);
            const roomPrice = (jobData.room.price / dayOfMon) * numberDayStay;
            const wifiPriceN = roomData.wifiPriceN * roomData.person;
            const amount = roomPrice + vehiclePrice + servicePrice + waterPrice + electricPrice + wifiPriceN;

            //oder  những ngày của tháng mới
            const orderDataNoPay = await orderModel.create({
              user: jobData.user,
              job: jobData._id,
              isCompleted: false,
              electricNumber: electricNumber,
              electricPrice: electricPrice,
              numberDayStay: numberDayStay,
              waterPrice: waterPrice,
              servicePrice: servicePrice,
              vehiclePrice: vehiclePrice,
              roomPrice: roomPrice,
              wifiPrice: wifiPriceN,
              description: `Tiền phòng tháng ${moment().month() + 1}/${moment().year()}`,
              amount: amount,
              type: "monthly",
              startTime: startTime.clone().toDate(),
              endTime: endTime.clone().toDate(),
              expireTime: expireTime.clone().toDate(),
            });

            await totalKwhModel.create({
              order: orderData._id,
              kWhData: kWhData,
              labelTime: labelTime,
            });

            const jobDataAfterUpdate = await jobModel.findOneAndUpdate(
              { orders: orderData._id },
              {
                $addToSet: { orders: orderDataNoPay._id },
                isActivated: false,
                isDeleted: true,
              },
              { new: true }
            );
            //Thêm order chưa được trả
            await payDepositListModel.findOneAndUpdate(
              {_id : payDeposit._id},
              {
                $addToSet: { ordersNoPay: orderDataNoPay._id },
              },
              { new: true }
            )

            const roomInfor = await roomModel.findOne({ _id: roomId })
              .lean()
              .exec();

            const userId = roomInfor.rentedBy;

            await roomModel.findOneAndUpdate({ _id: roomId }, {
              status: "available",
              $unset: { rentedBy: 1 },
            })
              .exec()

            let floorData = await floorModel
              .findOne({ rooms: roomId })
              .populate("rooms")
              .lean()
              .exec();

            let motelRoomData = await motelRoomModel
              .findOne({ floors: floorData._id })
              .populate("floors")
              .lean()
              .exec();

            await RoomController.updateInforMotel(
              floorData,
              motelRoomData,
            );

            //Xóa job khỏi user
            let userUpdateData = {
              $pull: {
                jobs: jobData._id,
              },
            };

            await userModel
              .findOneAndUpdate({ _id: userId }, userUpdateData, { new: true })
              .exec();

            if(userData) {
              await NotificationController.createNotification({
                title: "Thông báo hủy hợp đồng",

                content: `Hợp đồng cho thuê phòng ${jobData.room.name} thuộc dãy ${jobData.motelRoom.name} của 
                quý khách đã bị hủy vì quý khách chưa hoàn thành tiền phòng tháng ${moment().month()}/${moment().year()}.`,

                type: "cancelContract",
                user: jobData.user._id,
                isRead: false,
                url: `${process.env.BASE_PATH_CLINET3}pay-deposit-user/`,
                tag: null,
                contentTag: null,
              });

              if (userData.email) {
                const transporter = nodemailer.createTransport({
                  service: 'gmail',
                  auth: {
                    user: `${process.env.Gmail_USER}`,
                    pass: `${process.env.Gmail_PASS}`
                  }
                });
  
                const mailOptions = {
                  from: `${process.env.Gmail_USER}`,
                  // to: 'quyetthangmarvel@gmail.com',
                  to: userData.email,
                  subject: `[${jobData.room.name}] THÔNG BÁO HỦY HỢP ĐỒNG CHO THUÊ`, //tháng trước
                  text: `Hợp đồng cho thuê phòng ${jobData.room.name} thuộc dãy ${jobData.motelRoom.name} của quý khách đã bị hủy vì quý khách chưa hoàn thành tiền phòng tháng ${moment().month()}/${moment().year()}.`,
                };

                
  
                // Gửi email
                transporter.sendMail(mailOptions, function (error, info) {
                  if (error) {
                    console.error(error);
                  } else {
                    // console.log('Email đã được gửi: ' + info.response);
                  }
                });
  
              }
            }
            done();
          }
        } else {
          // Đã thanh toán, cuối tháng tạo bill mới
          await global.agendaInstance.agenda.schedule(
            moment()
              .startOf("month")
              .add(1, "months")
              .toDate(),
            "CreateOrderForNextMonth",
            { jobId: jobId }
          );
          done();
        }
      }

    } catch (err) {
      done();
    }
  });

  //áp dụng cho các phòng sẽ hết hợp đồng trong tháng, hết từ ngày 15 đổ về trước
  agenda.define("RemindUserMonthlyToExpireDay_ExpireThisMonth", async (job, done) => {
    try {
      let data = job.attrs.data;

      const {
        order: orderModel,
        job: jobModel,
        room: roomModel,
        floor: floorModel,
        motelRoom: motelRoomModel,
        user: userModel, 
        payDepositList: payDepositListModel,
        totalKwh: totalKwhModel,
      } = global.mongoModel;

      const orderData = await orderModel.findOne({ _id: job.attrs.data.orderId })
        .lean()
        .exec();

      if (orderData) {
        const jobId = orderData.job;
        const userId = orderData.user._id;

        if (orderData.isCompleted === false) { 

          const userData = await userModel.findOne({ _id: userId })
            .lean()
            .exec();

          const jobData = await JobController.getJobNoImg(jobId);

          const checkInDay = jobData.checkInTime;
          const rentalPeriod = jobData.rentalPeriod;
          const checkOutDay = moment(jobData.checkInTime).add(rentalPeriod, "months").subtract(1, "days"); // chính xác ngày cuối cùng còn được ở
          const timeCal = moment().subtract(1, "months"); // tháng trước

          if(moment(orderData.expireTime).date() !== checkOutDay.date()) {
            await orderModel.findOneAndUpdate(
              {_id: orderData._id},
              {expireTime: checkOutDay.clone().endOf('day').toDate()}
            )
          }

          if (moment().date() <= checkOutDay.date()) { //lập lịch cho sau ngày hết hạn để hủy, không còn gửi mail
            if (userData) {
              await NotificationController.createNotification({
                title: "Thông báo đóng tiền phòng",

                content: `Quý khách vui lòng đóng tiền phòng tháng ${timeCal.month() + 1}/${timeCal.year()} cho phòng 
                ${jobData.room.name} thuộc dãy ${jobData.motelRoom.name}. 
                Hạn đóng tới hết ngày ${checkOutDay.format("DD-MM-YYYY")}. 
                Lưu ý: Nếu không hoàn thành đúng hạn, quý khách sẽ bị hủy phòng và mất cọc.`,

                type: "monthly",
                user: jobData.user._id,
                isRead: false,
                url: `${process.env.BASE_PATH_CLINET3}job-detail/${jobData._id}/${jobData.room._id}`,
                tag: "Order",
                contentTag: orderData._id,
              });

              if (userData.email) {
                const transporter = nodemailer.createTransport({
                  service: 'gmail',
                  auth: {
                    user: `${process.env.Gmail_USER}`,
                    pass: `${process.env.Gmail_PASS}`
                  }
                });
    
                const mailOptions = {
                  from: `${process.env.Gmail_USER}`,
                  // to: 'quyetthangmarvel@gmail.com',
                  to: userData.email,
                  subject: `[${jobData.room.name}] THÔNG BÁO ĐÓNG TIỀN PHÒNG THÁNG ${timeCal.month() + 1}/${timeCal.year()}`,
                  text: `Quý khách vui lòng đóng tiền phòng tháng ${timeCal.month() + 1}/${timeCal.year()} cho phòng ${jobData.room.name} thuộc dãy ${jobData.motelRoom.name}. Hạn đóng tới hết ngày ${checkOutDay.format("DD-MM-YYYY")}. Lưu ý: Nếu không hoàn thành đúng hạn, quý khách sẽ bị hủy phòng và mất cọc.`,
                };

                
  
                // Gửi email
                transporter.sendMail(mailOptions, function (error, info) {
                  if (error) {
                    console.error(error);
                  } else {
                    // console.log('Email đã được gửi: ' + info.response);
                  }
                });
  
                // console.log(`Gửi tới mail: ${userData.email}`);
              } else {
                await global.agendaInstance.agenda.schedule(
                  moment()
                    .add(1, "days").startOf("days")
                    .toDate(),
                  "RemindUserMonthlyToExpireDay_ExpireThisMonth",
                  { orderId: job.attrs.data.orderId }
                );
              }

              done();
            }

            await global.agendaInstance.agenda.schedule(
              moment()
                .add(1, "days").startOf("days")
                .toDate(),
              "RemindUserMonthlyToExpireDay_ExpireThisMonth",
              { orderId: job.attrs.data.orderId }
            );

            done();

          } else {
            const payDeposit = await payDepositListModel.create({
              room: jobData.room,
              user: jobData.user,
              job: jobData._id,
              ordersNoPay: orderData._id,
              type: "noPayDeposit",
              reasonNoPay: "noPayMonthly",
              amount: jobData.deposit + jobData.afterCheckInCost,
              //thêm hạn thanh toán: note
            });

            const roomDataN = await roomModel.findOne({_id: jobData.room}).lean().exec();
            const floorDataN = await floorModel.findOne({rooms: jobData.room}).lean().exec();
  
            const motelDataN = await motelRoomModel.findOne({floors: floorDataN._id}).lean().exec();

            if(userData.email) {
              const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                  user: `${process.env.Gmail_USER}`,
                  pass: `${process.env.Gmail_PASS}`
                }
              });
  
              const mailOptions = {
                from: `${process.env.Gmail_USER}`,
                // to: 'quyetthangmarvel@gmail.com',
                // to: "cr7ronadol12345@gmail.com",  // thay bằng mail admin
                to: userData.email,
                subject: `[${motelDataN.name}] - [${roomDataN.name}] THÔNG BÁO HỦY HỢP ĐỒNG`,
                text: `Phòng ${roomDataN.name} thuộc tòa nhà ${motelDataN.name} của quý khách đã bị hủy hợp đồng vì không thanh toán hóa đơn tháng ${moment(orderData.startTime).format("MM-YYYY")} đúng hạn. Quý khách sẽ không được hoàn các khoản cọc trước đó.`,
              };
      
              transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                  console.error(error);
                } else {
                  // console.log('Email đã được gửi: ' + info.response);
                }
              });
            }

            await NotificationController.createNotification({
              title: "Thông báo hủy hợp đồng",

              content: `Phòng ${roomDataN.name} thuộc tòa nhà ${motelDataN.name} 
              của quý khách đã bị hủy hợp đồng vì không thanh toán hóa đơn tháng
              ${moment(orderData.startTime).format("MM-YYYY")} đúng hạn. 
              Quý khách sẽ không được hoàn các khoản cọc trước đó.`,

              user: jobData.user._id,
              isRead: false,
              type: "cancelContract",
              url: `${process.env.BASE_PATH_CLINET3}pay-deposit-user`,
              tag: null,
              contentTag: null,
            });

            const startTime =  moment().startOf("months").startOf("day");
            const start = startTime.format("YYYY-MM-DD");
            const endTime = checkOutDay.clone().endOf("day");
            const end = endTime.format("YYYY-MM-DD");

            const expireTime = endTime.clone().add(15, "days");

            // let electricNumber = await EnergyController.countElectricV2(jobData._id, start, end);
            const roomId = jobData.room;
            let dataElectricAll = await EnergyController.calculateElectricUsedDayToDayHaveLabelTime(roomId, start, end);

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

            const roomData = await roomModel.findOne({_id: roomId})
                                                                        .lean()
                                                                        .exec();
            const electricityPricePerKwh = roomData.electricityPrice;
            const electricPrice = electricNumber * electricityPricePerKwh;

            const dayOfMon = moment().daysInMonth(); // số ngày của tháng
            const numberDayStay = (Math.abs(checkOutDay.clone().diff(checkOutDay.clone().startOf("month"), "days")) + 1); //cộng 1: tính cả ngày checkIn
            const waterPrice = (roomData.waterPrice * roomData.person);
            const servicePrice = roomData.garbagePrice;
            const vehiclePrice = (roomData.wifiPrice * roomData.vihicle);
            const roomPrice = (jobData.room.price / dayOfMon) * numberDayStay;
            const wifiPriceN = roomData.wifiPriceN * roomData.person;
            const amount = roomPrice + vehiclePrice + servicePrice + waterPrice + electricPrice + wifiPriceN;

            //oder  những ngày của tháng mới
            const orderDataNoPay = await orderModel.create({
              user: jobData.user,
              job: jobData._id,
              isCompleted: false,
              electricNumber: electricNumber,
              electricPrice: electricPrice,
              numberDayStay: numberDayStay,
              waterPrice: waterPrice,
              servicePrice: servicePrice,
              vehiclePrice: vehiclePrice,
              roomPrice: roomPrice,
              wifiPrice: wifiPriceN,
              description: `Tiền phòng tháng ${moment().month() + 1}/${moment().year()}`,
              amount: amount,
              type: "monthly",
              startTime: startTime.clone().toDate(),
              endTime: endTime.clone().toDate(),
              expireTime: expireTime.clone().toDate(),
            });

            await totalKwhModel.create({
              order: orderData._id,
              kWhData: kWhData,
              labelTime: labelTime,
            });

            const jobDataAfterUpdate = await jobModel.findOneAndUpdate(
              { orders: orderData._id },
              {
                $addToSet: { orders: orderDataNoPay._id },
                isActivated: false,
                isDeleted: true,
              },
              { new: true }
            );

            //Thêm order chưa được trả
            await payDepositListModel.findOneAndUpdate(
              {_id : payDeposit._id},
              {
                $addToSet: { ordersNoPay: orderDataNoPay._id },
              },
              { new: true }
            )

            if (jobData) {
              let roomId = jobData.room;
              const roomInfor = await roomModel.findOne({ _id: roomId })
                .lean()
                .exec();

              const userId = roomInfor.rentedBy;

              await roomModel.findOneAndUpdate({ _id: roomId }, {
                status: "available",
                $unset: { rentedBy: 1 },
              })
                .exec()

              let floorData = await floorModel
                .findOne({ rooms: roomId })
                .populate("rooms")
                .lean()
                .exec();
  
              let motelRoomData = await motelRoomModel
                .findOne({ floors: floorData._id })
                .populate("floors")
                .lean()
                .exec();
  
              await RoomController.updateInforMotel(
                floorData,
                motelRoomData,
              );

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

            if(userData) {
              await NotificationController.createNotification({
                title: "Thông báo hủy hợp đồng",

                content: `Hợp đồng cho thuê phòng ${jobData.room.name} thuộc dãy ${jobData.motelRoom.name} của 
                quý khách đã bị hủy vì quý khách chưa hoàn thành tiền phòng tháng ${moment().month()}/${moment().year()}.`,

                type: "cancelContract",
                user: jobData.user._id,
                isRead: false,
                url: `${process.env.BASE_PATH_CLINET3}pay-deposit-user/`,
                tag: null,
                contentTag: null,
              });

              if (userData.email) {
                const transporter = nodemailer.createTransport({
                  service: 'gmail',
                  auth: {
                    user: `${process.env.Gmail_USER}`,
                    pass: `${process.env.Gmail_PASS}`
                  }
                });
  
                const mailOptions = {
                  from: `${process.env.Gmail_USER}`,
                  // to: 'quyetthangmarvel@gmail.com',
                  to: userData.email,
                  subject: `[${jobData.room.name}] THÔNG BÁO HỦY HỢP ĐỒNG CHO THUÊ`, //tháng trước
                  text: `Hợp đồng cho thuê phòng ${jobData.room.name} thuộc dãy ${jobData.motelRoom.name} của quý khách đã bị hủy vì quý khách chưa hoàn thành tiền phòng tháng ${moment().month()}/${moment().year()}.`,
                };

                
  
                // Gửi email
                transporter.sendMail(mailOptions, function (error, info) {
                  if (error) {
                    console.error(error);
                  } else {
                    // console.log('Email đã được gửi: ' + info.response);
                  }
                });
              }
            }
          }
        } else {
          // Đã thanh toán, Tạo bill mới những ngày còn lại của tháng
          const jobData = await JobController.getJobNoImg(jobId);

          const checkInDay = jobData.checkInTime;
          const rentalPeriod = jobData.rentalPeriod;
          const checkOutDay = moment(checkInDay).add(rentalPeriod, "months").subtract(1, "days"); //  chính xác ngày ở cuối cùng
          
          //note: trường hợp không thanh toán, vậy order này không được tạo
          //vậy tổng 2 order sẽ không được thanh toán là tháng trước và những ngày còn lại
          // của tháng hiện tại
          //nếu người dùng thanh toán vào ngày cuối cùng - nghĩa là task kiểm tra vào đầu ngày sau  
          //ngày hết hạn, cần tạo task tạo order này cách thời gian kiểm tra ra (2 tiếng)
          await global.agendaInstance.agenda.schedule(
            checkOutDay.clone().add(1, "days").add(2, "hours").toDate(),
            "CreateOrderForRestDayInMonBeforeExpireContract",
            { jobId: jobId }
          );

          done();
          return;

        }
      }

    } catch (err) {
      done();
    }
  });


  //áp dụng cho các phòng sẽ hết hợp đồng trong tháng, hết sau ngày 15
  agenda.define("RemindUserMonthlyToDay15_ExpireThisMonth", async (job, done) => {
    try {
      let data = job.attrs.data;

      const {
        order: orderModel,
        job: jobModel,
        room: roomModel,
        floor: floorModel,
        motelRoom: motelRoomModel,
        user: userModel, 
        payDepositList: payDepositListModel,
        totalKwh: totalKwhModel,
      } = global.mongoModel;

      const orderData = await orderModel.findOne({ _id: job.attrs.data.orderId })
        .lean()
        .exec();

      if (orderData) {
        const jobId = orderData.job;
        const userId = orderData.user._id;

        const jobData = await JobController.getJobNoImg(jobId);

        if (orderData.isCompleted === false) {

          const userData = await userModel.findOne({ _id: userId })
            .lean()
            .exec();

          const checkInDay = jobData.checkInTime;
          const rentalPeriod = jobData.rentalPeriod;
          const checkOutDay = moment(jobData.checkInTime).add(rentalPeriod, "months").subtract(1, "days"); // chính xác ngày cuối cùng còn được ở
          const timeCal = moment().subtract(1, "months"); // tháng trước

          if(moment(orderData.expireTime).date() !== 15) {
            await orderModel.findOneAndUpdate(
              {_id: orderData._id},
              {expireTime: checkOutDay.clone().date(15).endOf('day').toDate()}
            )
          }

          if (moment().date() <= 15) {
            if (userData) {
              await NotificationController.createNotification({
                title: "Thông báo đóng tiền phòng",

                content: `Quý khách vui lòng đóng tiền phòng tháng ${timeCal.month() + 1}/${timeCal.year()} 
                cho phòng ${jobData.room.name} thuộc dãy ${jobData.motelRoom.name}. 
                Hạn đóng tới hết ngày 15/${moment().month() + 1}/${moment().year()}. 
                Lưu ý: Nếu không hoàn thành đúng hạn, quý khách sẽ bị hủy phòng và mất cọc.`,

                type: "monthly",
                user: jobData.user._id,
                isRead: false,
                url: `${process.env.BASE_PATH_CLINET3}job-detail/${jobData._id}/${jobData.room._id}`,
                tag: "Order",
                contentTag: orderData._id,
              });

              if (userData.email) {
                const transporter = nodemailer.createTransport({
                  service: 'gmail',
                  auth: {
                    user: `${process.env.Gmail_USER}`,
                    pass: `${process.env.Gmail_PASS}`
                  }
                });
  
                const mailOptions = {
                  from: `${process.env.Gmail_USER}`,
                  // to: 'quyetthangmarvel@gmail.com',
                  to: userData.email,
                  subject: `[${jobData.room.name}] THÔNG BÁO ĐÓNG TIỀN PHÒNG THÁNG ${timeCal.month() + 1}/${timeCal.year()}`,
                  text: `Quý khách vui lòng đóng tiền phòng tháng ${timeCal.month() + 1}/${timeCal.year()} cho phòng ${jobData.room.name} thuộc dãy ${jobData.motelRoom.name}. Hạn đóng tới hết ngày 15/${moment().month() + 1}/${moment().year()}. Lưu ý: Nếu không hoàn thành đúng hạn, quý khách sẽ bị hủy phòng và mất cọc.`,
                };

                
  
                // Gửi email
                transporter.sendMail(mailOptions, function (error, info) {
                  if (error) {
                    console.error(error);
                  } else {
                    // console.log('Email đã được gửi: ' + info.response);
                  }
                });
  
                // console.log(`Gửi tới mail: ${userData.email}`);
              } else {
                await global.agendaInstance.agenda.schedule(
                  moment()
                    .add(1, "days")
                    .startOf("days")
                    .toDate(),
                  "RemindUserMonthlyToDay15_ExpireThisMonth",
                  { orderId: job.attrs.data.orderId }
                );
                done();
              }
            }

            await global.agendaInstance.agenda.schedule(
              moment()
                .add(1, "days")
                .startOf("days")
                .toDate(),
              "RemindUserMonthlyToDay15_ExpireThisMonth",
              { orderId: job.attrs.data.orderId }
            );
            done();
          } else {
            const payDeposit = await payDepositListModel.create({
              room: jobData.room,
              user: jobData.user,
              job: jobData._id,
              ordersNoPay: orderData._id,
              type: "noPayDeposit",
              reasonNoPay: "noPayMonthly",
              amount: jobData.deposit + jobData.afterCheckInCost,
              //thêm hạn thanh toán: note
            });

            const roomDataN = await roomModel.findOne({_id: jobData.room}).lean().exec();
            const floorDataN = await floorModel.findOne({rooms: jobData.room}).lean().exec();
  
            const motelDataN = await motelRoomModel.findOne({floors: floorDataN._id}).lean().exec();
  

            if(userData.email) {
              const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                  user: `${process.env.Gmail_USER}`,
                  pass: `${process.env.Gmail_PASS}`
                }
              });
  
              const mailOptions = {
                from: `${process.env.Gmail_USER}`,
                // to: 'quyetthangmarvel@gmail.com',
                // to: "cr7ronadol12345@gmail.com",  // thay bằng mail admin
                to: userData.email,
                subject: `[${motelDataN.name}] - [${roomDataN.name}] THÔNG BÁO HỦY HỢP ĐỒNG`,
                text: `Phòng ${roomDataN.name} thuộc tòa nhà ${motelDataN.name} của quý khách đã bị hủy hợp đồng vì không thanh toán hóa đơn tháng ${moment(orderData.startTime).format("MM-YYYY")} đúng hạn. Quý khách sẽ không được hoàn các khoản cọc trước đó.`,
              };
      
              transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                  console.error(error);
                } else {
                  // console.log('Email đã được gửi: ' + info.response);
                }
              });
            }

            await NotificationController.createNotification({
              title: "Thông báo hủy hợp đồng",

              content: `Phòng ${roomDataN.name} thuộc tòa nhà ${motelDataN.name} 
              của quý khách đã bị hủy hợp đồng vì không thanh toán hóa đơn tháng 
              ${moment(orderData.startTime).format("MM-YYYY")} đúng hạn. 
              Quý khách sẽ không được hoàn các khoản cọc trước đó.`,

              user: jobData.user._id,
              isRead: false,
              type: "cancelContract",
              url: `${process.env.BASE_PATH_CLINET3}pay-deposit-user`,
              tag: null,
              contentTag: null,
            });

            const startTime = moment().startOf("months").startOf("day");
            const start = moment().startOf("months").format("YYYY-MM-DD");
            const monInEnd = (moment().month() + 1) < 10 ? ("0" + (moment().month() + 1)) : (moment().month() + 1);
            const endTime = moment(`${moment().year()}-${monInEnd}-15`).endOf("day");
            const end = moment().year() + "-" + monInEnd + "-" + "15";

            const expireTime = endTime.clone().add(15, "days");

            // let electricNumber = await EnergyController.countElectricV2(jobData._id, start, end);
            const roomId = jobData.room;
            let dataElectricAll = await EnergyController.calculateElectricUsedDayToDayHaveLabelTime(roomId, start, end);

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
                  
            const roomData = await roomModel.findOne({_id: roomId})
                                                                        .lean()
                                                                        .exec();
            const electricityPricePerKwh = roomData.electricityPrice;
            const electricPrice = electricNumber * electricityPricePerKwh;

            const dayOfMon = moment().daysInMonth(); // số ngày của tháng
            const numberDayStay = 15; 
            const waterPrice = (roomData.waterPrice * roomData.person);
            const servicePrice = roomData.garbagePrice;
            const vehiclePrice = (roomData.wifiPrice * roomData.vihicle);
            const roomPrice = (jobData.room.price / dayOfMon) * numberDayStay;
            const wifiPriceN = roomData.wifiPriceN * roomData.person;
            const amount = roomPrice + vehiclePrice + servicePrice + waterPrice + electricPrice + wifiPriceN;

            //order  những ngày của tháng mới
            const orderDataNoPay = await orderModel.create({
              user: jobData.user,
              job: jobData._id,
              isCompleted: false,
              electricNumber: electricNumber,
              electricPrice: electricPrice,
              numberDayStay: numberDayStay,
              waterPrice: waterPrice,
              servicePrice: servicePrice,
              vehiclePrice: vehiclePrice,
              roomPrice: roomPrice,
              wifiPrice: wifiPriceN,
              description: `Tiền phòng tháng ${moment().month() + 1}/${moment().year()}`,
              amount: amount,
              type: "monthly",
              startTime: startTime.clone().toDate(),
              endTime: endTime.clone().toDate(),
              expireTime: expireTime.clone().toDate(),
            });

            await totalKwhModel.create({
              order: orderData._id,
              kWhData: kWhData,
              labelTime: labelTime,
            });

            const jobDataAfterUpdate = await jobModel.findOneAndUpdate(
              { orders: orderData._id },
              {
                $addToSet: { orders: orderDataNoPay._id },
                isActivated: false,
                isDeleted: true,
              },
              { new: true }
            );
            //Thêm order chưa được trả
            await payDepositListModel.findOneAndUpdate(
              {_id : payDeposit._id},
              {
                $addToSet: { ordersNoPay: orderDataNoPay._id },
              },
              { new: true }
            )

            if (jobData) {
              let roomId = jobData.room;
              const roomInfor = await roomModel.findOne({ _id: roomId })
                .lean()
                .exec();

              const userId = roomInfor.rentedBy;

              await roomModel.findOneAndUpdate({ _id: roomId }, {
                status: "available",
                $unset: { rentedBy: 1 },
              })
                .exec()

              let floorData = await floorModel
                .findOne({ rooms: roomId })
                .populate("rooms")
                .lean()
                .exec();
  
              let motelRoomData = await motelRoomModel
                .findOne({ floors: floorData._id })
                .populate("floors")
                .lean()
                .exec();
  
              await RoomController.updateInforMotel(
                floorData,
                motelRoomData,
              );

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

            if(userData) {
              await NotificationController.createNotification({
                title: "Thông báo hủy hợp đồng",

                content: `Hợp đồng cho thuê phòng ${jobData.room.name} thuộc dãy ${jobData.motelRoom.name} của 
                quý khách đã bị hủy vì quý khách chưa hoàn thành tiền phòng tháng ${moment().month()}/${moment().year()}.`,

                type: "cancelContract",
                user: jobData.user._id,
                isRead: false,
                url: `${process.env.BASE_PATH_CLINET3}pay-deposit-user/`,
                tag: null,
                contentTag: null,
              });

              if (userData.email) {
                const transporter = nodemailer.createTransport({
                  service: 'gmail',
                  auth: {
                    user: `${process.env.Gmail_USER}`,
                    pass: `${process.env.Gmail_PASS}`
                  }
                });
  
                const mailOptions = {
                  from: `${process.env.Gmail_USER}`,
                  // to: 'quyetthangmarvel@gmail.com',
                  to: userData.email,
                  subject: `[${jobData.room.name}] THÔNG BÁO HỦY HỢP ĐỒNG CHO THUÊ`, //tháng trước
                  text: `Hợp đồng cho thuê phòng ${jobData.room.name} thuộc dãy ${jobData.motelRoom.name} của quý khách đã bị hủy vì quý khách chưa hoàn thành tiền phòng tháng ${moment().month()}/${moment().year()}.`,
                };

                
  
                // Gửi email
                transporter.sendMail(mailOptions, function (error, info) {
                  if (error) {
                    console.error(error);
                  } else {
                    // console.log('Email đã được gửi: ' + info.response);
                  }
                });
              }
            }
            done();
          }
        } else {
          // Đã thanh toán, Tạo bill mới những ngày còn lại của tháng
          const checkInDay = jobData.checkInTime;
          const rentalPeriod = jobData.rentalPeriod;
          const checkOutDay = moment(checkInDay).add(rentalPeriod, "months").subtract(1, "days"); //  chính xác ngày ở cuối cùng

          if (checkOutDay.year() > moment().year()) {
            // ĐÃ GIAN HẠN
            await global.agendaInstance.agenda.schedule(
              moment()
                .startOf("month")
                .add("1", "months")
                .toDate(),
              "CreateOrderForNextMonth",
              { jobId: jobId }
            );
            done();
          } else if (checkOutDay.year() === moment().year()) {
            if (checkOutDay.month() > moment().month()) {
              // ĐÃ GIAN HẠN
              await global.agendaInstance.agenda.schedule(
                moment()
                  .startOf("month")
                  .add("1", "months")
                  .toDate(),
                "CreateOrderForNextMonth",
                { jobId: jobId }
              );
            } else if (checkOutDay.month() === moment().month()) {
              //TH1: khách còn thời gian để gia hạn
              //note: checking
              if ((checkOutDay.date() - moment().date()) >= 15) {
                console.log("BỊ NHẢY VÀO ĐÂY 1");
                const resDayExpire = checkOutDay.date() - moment().date() - 15;
                await global.agendaInstance.agenda.schedule(
                  moment()
                    .add(resDayExpire + 1, "days")
                    .startOf("days") //kiểm tra vào ngày đã hết hạn gia hạn tính tới thời điểm hiện tại
                    .toDate(),
                  "PendingCheckDayExpireContract",
                  { jobId: jobId }
                );
                done();
              } else {
                //TH2: khách đã hết thời gian để gia hạn
                //checked
                console.log("BỊ NHẢY VÀO ĐÂY 2");
                await global.agendaInstance.agenda.schedule(
                  checkOutDay.clone().endOf("days").toDate(), //note: 5
                  "CreateOrderForRestDayInMonBeforeExpireContract",
                  { jobId: jobId }
                );
                // await global.agendaInstance.agenda.schedule(
                //   moment().add("2", 'minutes').toDate(), //note: 5
                //   "CreateOrderForRestDayInMonBeforeExpireContract",
                //   { jobId: jobId }
                // );
                done();
              }
            } else {
              //Không thể xảy ra
            }
          } else {
            // Không thể xảy ra
          }
        }
      }

    } catch (err) {
      done();
    }
  });

  agenda.define("CreateOrderForRestDayInMonBeforeExpireContract", async (job, done) => {
    try {
      console.log("CreateOrderForRestDayInMonBeforeExpireContract");
      // Init models
      const { order: orderModel, job: jobModel, room: roomModel, totalKwh: totalKwhModel } = global.mongoModel;

      let data = job.attrs.data;

      let resData = await JobController.getJobNoImg(job.attrs.data.jobId);

      if (resData) {
        if (resData.isActived && !(resData.isDeleted)) {
          const checkInDay = resData.checkInTime;
          const rentalPeriod = resData.rentalPeriod;
          const checkOutDay = moment(checkInDay).add(rentalPeriod, "months").subtract(1, "days"); //  chính xác ngày ở cuối 

          const startTime = checkOutDay.clone().startOf("months");
          const start = startTime.clone().format("YYYY-MM-DD");
          const endTime = checkOutDay.clone().endOf("day");
          const end = endTime.clone().format("YYYY-MM-DD");

          const expireTime = endTime.clone().add(15, "days");
          
          // let electricNumber = await EnergyController.countElectricV2(job.attrs.data.jobId, start, end);
          const roomId = resData.room;
          let dataElectricAll = await EnergyController.calculateElectricUsedDayToDayHaveLabelTime(roomId, start, end);

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
  
          const roomData = await roomModel.findOne({_id: roomId})
                                                                      .lean()
                                                                      .exec();
          const electricityPricePerKwh = roomData.electricityPrice;
  
          const electricPrice = electricNumber * electricityPricePerKwh;

          const dayOfMon = moment(checkOutDay).daysInMonth(); // số ngày của tháng
          const numberDayStay = (Math.abs(endTime.clone().diff(startTime.clone(), "days")) + 1); //cộng 1: tính cả ngày checkIn
          const waterPrice = (roomData.waterPrice * roomData.person);
          const servicePrice = roomData.garbagePrice;
          const vehiclePrice = (roomData.wifiPrice * roomData.vihicle);
          const roomPrice = (resData.room.price / dayOfMon) * numberDayStay;
          const wifiPriceN = roomData.wifiPriceN * roomData.person;
          const amount = roomPrice + vehiclePrice + servicePrice + waterPrice + electricPrice + wifiPriceN;  
  
          const orderData = await orderModel.create({
            user: resData.user,
            job: resData._id,
            isCompleted: false,
            electricNumber: electricNumber,
            electricPrice: electricPrice,
            numberDayStay: numberDayStay,
            waterPrice: waterPrice,
            servicePrice: servicePrice,
            vehiclePrice: vehiclePrice,
            roomPrice: roomPrice,
            wifiPrice: wifiPriceN,
            description: `Tiền phòng tháng ${checkOutDay.month() + 1}/${checkOutDay.year()}`,
            amount: amount,
            type: "monthly",
            startTime: startTime.clone().toDate(),
            endTime: endTime.clone().toDate(),
            expireTime: expireTime.clone().toDate(),
          });

          await totalKwhModel.create({
            order: orderData._id,
            kWhData: kWhData,
            labelTime: labelTime,
          });
  
          resData = await jobModel.findOneAndUpdate(
            { _id: resData._id },
            {
              $addToSet: { orders: orderData._id },
              currentOrder: orderData._id,
              status: "pendingMonthlyPayment",
            },
            { new: true }
          );
  
          await global.agendaInstance.agenda.schedule(
            moment().add("2", 'minutes').toDate(), //note: 5
            "CheckOrderStatus_In3LastDayExpireContract",
            { orderId: orderData._id }
          );

          done();
          return;
  
        } 
      }
      done();
    } catch (err) {
      done();
    }
  });


  agenda.define("CheckOrderStatus_In3LastDayExpireContract", async (job, done) => {
    try {
      // Init models
      const {
        order: orderModel,
        job: jobModel,
        room: roomModel,
        floor: floorModel,
        motelRoom: motelRoomModel,
        user: userModel,
        payDepositList: payDepositListModel,
      } = global.mongoModel;

      let data = job.attrs.data;

      let orderData = await orderModel.findOne(job.attrs.data.orderId);

      if (orderData) {
        const jobId = orderData.job;
        const userId = orderData.user._id;
        const jobData = await JobController.getJobNoImg(jobId);
        if (!orderData.isCompleted) {
          const userData = await userModel.findOne({ _id: userId })
            .lean()
            .exec();

          const checkInDay = jobData.checkInTime;
          const rentalPeriod = jobData.rentalPeriod;

          const checkOutDay = moment(checkInDay).add(rentalPeriod, "months").subtract(1, "days"); //  chính xác ngày ở cuối cùng
          const checkOutDayPlus3 = checkOutDay.clone().add(3, "days");// số ngày để đóng hóa đơn cuối (3 ngày: ngày hiện tại + 2 ngày)

          if(moment(orderData.expireTime).date() !== checkOutDayPlus3.date()) {
            await orderModel.findOneAndUpdate(
              {_id: orderData._id},
              {expireTime: checkOutDayPlus3.clone().endOf('day').toDate()}
            )
          }

          if (moment().startOf("days").diff(checkOutDayPlus3.clone().startOf("days")) <= 0) {
            await global.agendaInstance.agenda.schedule(
              moment()
                .add("1", "days")
                .startOf("days")
                .toDate(),
              "CheckOrderStatus_In3LastDayExpireContract",
              { orderId: orderData._id }
            );

            //gửi lần cuối vào đầu ngày cuối (lấy hiện tại trừ thời gian hết hạn)
            if (userData) {
              await NotificationController.createNotification({
                title: "Thông báo đóng tiền phòng",

                content: `Quý khách vui lòng đóng tiền phòng tháng ${checkOutDay.month() + 1}/${checkOutDay.year()} 
                cho phòng ${jobData.room.name} thuộc dãy ${jobData.motelRoom.name}. 
                Hạn đóng tới hết ngày ${checkOutDayPlus3.format("DD-MM-YYYY")}. 
                Lưu ý: Nếu không thực hiện đóng hóa đơn này, quý khách sẽ không được hoàn trả tiền cọc.`,

                type: "monthly",
                user: jobData.user._id,
                isRead: false,
                url: `${process.env.BASE_PATH_CLINET3}job-detail/${jobData._id}/${jobData.room._id}`,
                tag: "Order",
                contentTag: orderData._id,
              });

              if (userData.email) {
                const transporter = nodemailer.createTransport({
                  service: 'gmail',
                  auth: {
                    user: `${process.env.Gmail_USER}`,
                    pass: `${process.env.Gmail_PASS}`
                  }
                });
    
                const mailOptions = {
                  from: `${process.env.Gmail_USER}`,
                  // to: 'quyetthangmarvel@gmail.com',
                  to: userData.email,
                  subject: `[${jobData.room.name}] THÔNG BÁO ĐÓNG TIỀN PHÒNG THÁNG ${checkOutDay.month() + 1}/${checkOutDay.year()}`,
                  text: `Quý khách vui lòng đóng tiền phòng tháng ${checkOutDay.month() + 1}/${checkOutDay.year()} cho phòng ${jobData.room.name} thuộc dãy ${jobData.motelRoom.name}. Hạn đóng tới hết ngày ${checkOutDayPlus3.format("DD-MM-YYYY")}. Lưu ý: Nếu không thực hiện đóng hóa đơn này, quý khách sẽ không được hoàn trả tiền cọc.`,
                };

                
  
                // Gửi email
                transporter.sendMail(mailOptions, function (error, info) {
                  if (error) {
                    console.error(error);
                  } else {
                    // console.log('Email đã được gửi: ' + info.response);
                  }
                });
  
                // console.log(`Gửi tới mail: ${userData.email}`);
              } else {
                await global.agendaInstance.agenda.schedule(
                  moment()
                    .add("1", "days")
                    .startOf("days")
                    .toDate(),
                  "CheckOrderStatus_In3LastDayExpireContract",
                  { orderId: orderData._id }
                );
              }
            }
          } else {
            const jobDataAfterUpdate = await jobModel.findOneAndUpdate(
              { orders: orderData._id },
              {
                isActivated: false,
                isDeleted: true,
              },
              { new: true }
            );

            await payDepositListModel.create({
              room: jobDataAfterUpdate.room,
              user: jobDataAfterUpdate.user,
              job: jobDataAfterUpdate._id,
              ordersNoPay: orderData._id,
              type: "noPayDeposit",
              reasonNoPay: "noPayMonthly",
              amount: jobDataAfterUpdate.deposit + jobDataAfterUpdate.afterCheckInCost,
              //thêm hạn thanh toán: note
            });

            const roomDataN = await roomModel.findOne({_id: jobData.room}).lean().exec();
            const floorDataN = await floorModel.findOne({rooms: jobData.room}).lean().exec();
  
            const motelDataN = await motelRoomModel.findOne({floors: floorDataN._id}).lean().exec();
  

            if(userData.email) {
              const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                  user: `${process.env.Gmail_USER}`,
                  pass: `${process.env.Gmail_PASS}`
                }
              });
  
              const mailOptions = {
                from: `${process.env.Gmail_USER}`,
                // to: 'quyetthangmarvel@gmail.com',
                // to: "cr7ronadol12345@gmail.com",  // thay bằng mail admin
                to: userData.email,
                subject: `[${motelDataN.name}] - [${roomDataN.name}] THÔNG BÁO HỦY HỢP ĐỒNG`,
                text: `Phòng ${roomDataN.name} thuộc tòa nhà ${motelDataN.name} của quý khách đã bị hủy hợp đồng vì không thanh toán hóa đơn tháng ${moment(orderData.startTime).format("MM-YYYY")} đúng hạn. Quý khách sẽ không được hoàn các khoản cọc trước đó.`,
              };
      
              transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                  console.error(error);
                } else {
                  // console.log('Email đã được gửi: ' + info.response);
                }
              });
            }

            await NotificationController.createNotification({
              title: "Thông báo hủy hợp đồng",

              content: `Phòng ${roomDataN.name} thuộc tòa nhà ${motelDataN.name} 
              của quý khách đã bị hủy hợp đồng vì không thanh toán hóa đơn tháng 
              ${moment(orderData.startTime).format("MM-YYYY")} đúng hạn. 
              Quý khách sẽ không được hoàn các khoản cọc trước đó.`,

              user: jobData.user._id,
              isRead: false,
              type: "cancelContract",
              url: `${process.env.BASE_PATH_CLINET3}pay-deposit-user`,
              tag: null,
              contentTag: null,
            });

            if (jobData) {
              let roomId = jobData.room;
              const roomInfor = await roomModel.findOne({ _id: roomId })
                .lean()
                .exec();

              const userId = roomInfor.rentedBy;

              await roomModel.findOneAndUpdate({ _id: roomId }, {
                status: "available",
                $unset: { rentedBy: 1 },
              })
                .exec()

              let floorData = await floorModel
                .findOne({ rooms: roomId })
                .populate("rooms")
                .lean()
                .exec();
  
              let motelRoomData = await motelRoomModel
                .findOne({ floors: floorData._id })
                .populate("floors")
                .lean()
                .exec();
  
              await RoomController.updateInforMotel(
                floorData,
                motelRoomData,
              );

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
          }

        } else {
          const jobDataAfterUpdate = await jobModel.findOneAndUpdate(
            { orders: orderData._id },
            {
              isActivated: false,
              isDeleted: true,
            },
            { new: true }
          );

          const payDepositListData = await payDepositListModel.create({
            room: jobDataAfterUpdate.room,
            user: jobDataAfterUpdate.user,
            job: jobDataAfterUpdate._id,
            type: "payDeposit",
            reasonNoPay: "unknown",
            amount: jobDataAfterUpdate.deposit + jobDataAfterUpdate.afterCheckInCost,
            //thêm hạn thanh toán: note
          });

          //user
          await NotificationController.createNotification({
            title: "Thông báo hết hợp đồng",

            content: `Phòng ${jobData.room.name} thuộc dãy ${jobData.motelRoom.name} 
            của quý khách đã hết thời hạn thuê. Hợp đồng đã hết hạn, bạn vui lòng truy cập 
            đường dẫn bên dưới để theo dõi khoản trả cọc.`,

            type: "payDeposit",
            user: jobDataAfterUpdate.user,
            isRead: false,
            url: `${process.env.BASE_PATH_CLINET3}pay-deposit-user/`,
            tag: "payDepositList",
            contentTag: payDepositListData._id,
          });

          //admin
          const adminData = await userModel.findOne({
            role: { $in: ['master']}
          }).lean().exec();

          await NotificationController.createNotification({
            title: "Thông báo thực hiện trả cọc",

            content: `Phòng ${jobData.room.name} thuộc dãy ${jobData.motelRoom.name} 
            đã hết hợp đồng thuê. Vui lòng truy cập đường dẫn bên dưới để thực hiện trả 
            cọc cho người dùng.`,

            type: "payDeposit",
            user: adminData._id,
            isRead: false,
            url: `${process.env.BASE_PATH_CLINET3}manage-deposit/pay-deposit/${jobData.motelRoom._id}`,
            tag: "payDepositList",
            contentTag: payDepositListData._id,
          });

          const userData = await userModel.findOne({_id: jobDataAfterUpdate.user}).lean().exec();

          if (userData.email) {
            const transporter = nodemailer.createTransport({
              service: 'gmail',
              auth: {
                user: `${process.env.Gmail_USER}`,
                pass: `${process.env.Gmail_PASS}`
              }
            });

            const mailOptions = {
              from: `${process.env.Gmail_USER}`,
              // to: 'quyetthangmarvel@gmail.com',
              to: userData.email,
              subject: `[${jobData.room.name}] THÔNG BÁO HẾT HẠN HỢP ĐỒNG CHO THUÊ`, //tháng trước
              text: `Hợp đồng cho thuê phòng ${jobData.room.name} thuộc dãy ${jobData.motelRoom.name} của quý khách đã hết hạn. Vui lòng truy cập vào đường dẫn ${process.env.BASE_PATH_CLINET3}pay-deposit-user/ , đăng nhập tài khoản để theo dõi thông tin về hoàn trả các khoản tiền cọc.`,
            };

            // Gửi email
            transporter.sendMail(mailOptions, function (error, info) {
              if (error) {
                console.error(error);
              } else {
                // console.log('Email đã được gửi: ' + info.response);
              }
            });
          }

          if (jobData) {
            let roomId = jobData.room;
            const roomInfor = await roomModel.findOne({ _id: roomId })
              .lean()
              .exec();

            const userId = roomInfor.rentedBy;

            await roomModel.findOneAndUpdate({ _id: roomId }, {
              status: "available",
              $unset: { rentedBy: 1 },
            })
              .exec()

            let floorData = await floorModel
              .findOne({ rooms: roomId })
              .populate("rooms")
              .lean()
              .exec();

            let motelRoomData = await motelRoomModel
              .findOne({ floors: floorData._id })
              .populate("floors")
              .lean()
              .exec();

            await RoomController.updateInforMotel(
              floorData,
              motelRoomData,
            );

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
        }
      }
      done();
    } catch (err) {
      done();
    }
  });

  agenda.define("PendingCheckDayExpireContract", async (job, done) => {
    try {
      const jobId = job.attrs.data.jobId;
      const jobData = await JobController.getJobNoImg(job.attrs.data.jobId);

      if (jobData) {
        const checkInDay = jobData.checkInTime;
        const rentalPeriod = jobData.rentalPeriod;
        const checkOutDay = moment(checkInDay).add(rentalPeriod, "months").subtract(1, "days"); //  chính xác ngày ở cuối cùng

        if (checkOutDay.year() > moment().year()) {
          //ĐÃ GIAN HẠN
          console.log("PendingCheckDayExpireContract đã gia hạn 1")
          await global.agendaInstance.agenda.schedule(
            moment()
              .startOf("month")
              .add("1", "months")
              .toDate(),
            "CreateOrderForNextMonth",
            { jobId: jobId }
          );
          done();
        } else if (checkOutDay.year() === moment().year()) {
          if (checkOutDay.month() > moment().month()) {
            // ĐÃ GIAN HẠN
            console.log("PendingCheckDayExpireContract đã gia hạn 2")
            await global.agendaInstance.agenda.schedule(
              moment()
                .startOf("month")
                .add("1", "months")
                .toDate(),
              "CreateOrderForNextMonth",
              { jobId: jobId }
            );
            done();
          } else if (checkOutDay.month() === moment().month()) {
            //Hết thời gian gia hạn, hết hợp đồng
            console.log("PendingCheckDayExpireContract không gia hạn")
            await global.agendaInstance.agenda.schedule(
              // moment().add("2", 'minutes').toDate(), //note: 5
              checkOutDay.clone().endOf("days").toDate(),
              "CreateOrderForRestDayInMonBeforeExpireContract",
              { jobId: jobId }
            );
            done();
          } 
        } 
      }

      done();
    } catch (err) {
      console.log({ err });
      done();
    }
  });


  //Gọi lúc kích hoạt xong, lúc user gia hạn hợp đồng xong
  agenda.define("RemindUserRenewContractAndChangeStatusRoomBeforeOneMonth", async (job, done) => {
    try {
      const {
        user: userModel,
        order: orderModel,
        job: jobModel,
        room: roomModel,
        totalKwh: totalKwhModel,
        floor: floorModel,
        motelRoom: motelRoomModel,
      } = global.mongoModel;

      let data = job.attrs.data;
      let resData = await JobController.getJobNoImg(job.attrs.data.jobId);

      if(resData) {
        const checkInDay = resData.checkInTime;
        const rentalPeriod = resData.rentalPeriod;
        const checkOutDay = moment(checkInDay).add(rentalPeriod, "months").subtract(1, "days"); //  chính xác ngày ở cuối 
        
        if (resData.isActived && !(resData.isDeleted)) {
          if(checkOutDay.clone().diff(moment(), "months") < 1) {
            const userData = await userModel.findOne({
              _id: resData.user._id
            }).lean().exec();

            console.log({userData});

            if(userData) {
              await NotificationController.createNotification({
                title: "Thông báo gia hạn hợp đồng",
                
                content: `Phòng ${resData.room.name} thuộc dãy ${resData.motelRoom.name} của 
                quý khách sẽ hết hợp đồng vào ${checkOutDay.clone().format("DD-MM-YYYY")}.
                Nếu tiếp tục ở, vui lòng truy cập được dẫn bên dưới để gia hạn thêm hợp đồng. 
                Lưu ý: Hợp đồng chỉ có thể gia hạn trước thời gian hết hạn 15 ngày.`,

                type: "remindRenewContract",
                user: userData._id,
                isRead: false,
                url: `${process.env.BASE_PATH_CLINET3}job-detail/${resData._id}/${resData.room._id}`,
                tag: "Job",
               contentTag: resData._id,
              });
              
              //Gửi mail nhắc nhở
              if(userData.email) {
                console.log("email: ", userData.email);
                const transporter = nodemailer.createTransport({
                  service: 'gmail',
                  auth: {
                      user: `${process.env.Gmail_USER}`,
                      pass: `${process.env.Gmail_PASS}`
                  }
                });

                const mailOptions = {
                    from: `${process.env.Gmail_USER}`,
                    to: userData.email,
                    subject: `[${resData.room.name}] THÔNG BÁO GIA HẠN HỢP ĐỒNG TRỌ`,
                    text: `Phòng ${resData.room.name} thuộc dãy ${resData.motelRoom.name} của quý khách sẽ hết hợp đồng vào ${checkOutDay.clone().format("DD-MM-YYYY")}. Vui lòng truy cập trang web: ${process.env.BASE_PATH_CLINET1} thực hiện đăng nhập rồi vào đường dẫn ${process.env.BASE_PATH_CLINET3}job-detail/${resData._id}/${resData.room._id} để gian hạn hợp đồng. Lưu ý: Hợp đồng chỉ có thể gia hạn trước thời gian hết hạn 15 ngày.`,
                };

                

                transporter.sendMail(mailOptions, function (error, info) {
                  if (error) {
                      console.error(error);
                  } else {
                      console.log('Email đã được gửi: ' + info.response);
                  }
                });
                
                console.log(`Gửi tới mail: ${userData.email}`);
              } else {
                console.log(`User id: ${userData.user} không được tìm thấy hoặc chưa cập nhật email`);

                await global.agendaInstance.agenda.schedule(
                  moment().add(1, "days").startOf("day").toDate(),
                  "RemindUserRenewContractAndChangeStatusRoomBeforeOneMonth",
                  { jobId: resData._id }
                );
              }
            }

            //thay đổi trạng thái phòng
            {
              await roomModel.findOneAndUpdate({_id: resData.room}, {
                status: 'soonExpireContract',
              })
  
              // cập nhật lại floor
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
                soonExpireContractRoom: lodash.sumBy(motelRoomData.floors, "soonExpireContractRoom"),
              };
  
              await motelRoomModel
                .findOneAndUpdate({ _id: motelRoomData._id }, updateData)
                .exec();
            }
            done();
          } else {
            await global.agendaInstance.agenda.schedule(
              checkOutDay.clone().subtract(1, "months").startOf("day").toDate(),
              "RemindUserRenewContractAndChangeStatusRoomBeforeOneMonth",
              { jobId: resData._id }
            );
          }
          done();
        } 
      }
      done();
    } catch (err) {
      done();
    }
  });

  agenda.define("CreateAllOrderForQuickRentManyRoomsByAdmin", async(job, done) => {
    try {
      const {
        user: userModel,
        room: roomModel,
        floor: floorModel,
        motelRoom: motelRoomModel,
        transactions: transactionsModel,
        job: jobModel,
        order: orderModel,
        banking: bankingModel,
        bill: billModel,
      } = global.mongoModel;

      const cleanArray = job.attrs.data.data;
      const bankId = job.attrs.data.bankId;
      const data = job.attrs.data;
      const userId = job.attrs.data.userId;

      for(let i = 0; i < cleanArray.length; i++) {
        const checkInDay = moment(cleanArray[i][7], "DD/MM/YYYY").startOf("days");
        const timeMoment = moment();

        const phoneNumber = cleanArray[i][6];
        const phoneNumberObect = {
          countryCode: "+84",
          number: helpers.stripeZeroOut(phoneNumber),
        };

        let userDataN = await userModel.findOne({phoneNumber: phoneNumberObect})
        .lean()
        .exec();

        if(!userDataN) {
          let dataSignUp = {
            firstName: cleanArray[i][5],
            lastName: cleanArray[i][4],
            phoneNumber: phoneNumberObect,
            email: cleanArray[i][9],
            password: cleanArray[i][10],
            confirmPassword: cleanArray[i][10],
            role: ['customer'],
          }

          console.log("dataSignUp out", dataSignUp);
          console.log({phoneNumber});

          userDataN = await createAccountForUser(
            dataSignUp,
            phoneNumber,
          );
        }

        const roomDataN = await roomModel.findOne({_id: cleanArray[i][2]}).lean().exec();

        const floorDataN = await floorModel
          .findOne({ rooms: roomDataN._id })
          .populate("rooms")
          .lean()
          .exec();

        const motelRoomDataN = await motelRoomModel
          .findOne({ floors: floorDataN._id })
          .populate("floors owner address")
          .lean()
          .exec();

          console.log({motelRoomDataN})

        let price = roomDataN.price;
        let bail =  roomDataN.depositPrice === 0 ? roomDataN.price : roomDataN.depositPrice;
        let deposit = Number(price) / 2;
        let afterCheckInCost = Number(price) * 0.5 + Number(bail);
        let total = Number(price) + Number(bail);

        let resData = await jobModel.create({
          checkInTime: moment(cleanArray[i][7],  "DD/MM/YYYY").startOf("days").toDate(),
          user: userDataN._id,
          room: roomDataN._id,
          price: price,
          bail: bail,
          total: total,
          afterCheckInCost: afterCheckInCost,
          deposit: deposit,
          // rentalPeriod: parseInt(cleanArray[i][8]),
          rentalPeriod: typeof cleanArray[i][8] === 'string' ? parseInt(cleanArray[i][8]) : cleanArray[i][8],
          status: "pendingActivated",
          
          fullName: userDataN.lastName + " " + userDataN.firstName,
          phoneNumber: userDataN.phoneNumber.countryCode +  userDataN.phoneNumber.number,
        });

        let userUpdateData = {
          $addToSet: {
            jobs: resData._id,
          },
        };

        await userModel
          .findOneAndUpdate({ _id: userDataN._id }, userUpdateData, { new: true })
          .exec();

        //order, transaction, bill of deposit
        const orderDataDeposit = await orderModel.create({
          user: userDataN._id,
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
          user: userDataN._id,
          keyPayment: getRandomHex2(),
          keyOrder: orderDataDeposit.keyOrder,
          description:  `Tiền cọc phòng tháng ${moment(resData.checkInTime).format("MM/YYYY")}`,
          amount: orderDataDeposit.amount,
          status: "success",
          paymentMethod: "cash",
          order: orderDataDeposit._id,
          banking: bankId,
          type: "deposit",
          motel: motelRoomDataN._id,
          room: roomDataN._id,
        });

        const bankData = await bankingModel.findOne({_id: bankId}).lean().exec();

        await billModel.create({
          order: orderDataDeposit._id,
          idBill: orderDataDeposit.keyOrder,
          dateBill: moment().format("DD/MM/YYYY"),
          nameMotel: motelRoomDataN.name,
          addressMotel: motelRoomDataN.address.address,
          nameRoom: roomDataN.name,

          nameUser: userDataN.lastName + " " + userDataN.firstName,
          phoneUser: userDataN.phoneNumber.countryCode + userDataN.phoneNumber.number,
          addressUser: userDataN.address,
          emailUser: userDataN.email,

          nameOwner: motelRoomDataN.owner.lastName + motelRoomDataN.owner.firstName,
          emailOwner: motelRoomDataN.owner.email,
          phoneOwner: 
            motelRoomDataN.owner.phoneNumber.countryCode 
            + motelRoomDataN.owner.phoneNumber.number,
          addressOwner: motelRoomDataN.owner.address,
          nameBankOwner: bankData ? bankData.nameTkLable : "Chưa thêm tài khoản",
          numberBankOwner: bankData ? bankData.stk : "Chưa thêm tài khoản",
          nameOwnerBankOwner: bankData ? bankData.nameTk : "Chưa thêm tài khoản",

          totalAll: orderDataDeposit.amount.toFixed(2),
          totalAndTaxAll: orderDataDeposit.amount.toFixed(2),
          totalTaxAll: 0,
          typeTaxAll: 0,

          description: orderDataDeposit.description,

          user: userDataN._id,
          motel: motelRoomDataN._id,
          roomRented: roomDataN._id,

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
          user: userDataN._id,
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
          motel: motelRoomDataN._id,
          room: roomDataN._id,
        });

        await billModel.create({
          order: orderDataAfterCheckInCost._id,
          idBill: orderDataAfterCheckInCost.keyOrder,
          dateBill: moment().format("DD/MM/YYYY"),
          nameMotel: motelRoomDataN.name,
          addressMotel: motelRoomDataN.address.address,
          nameRoom: roomDataN.name,

          nameUser: userDataN.lastName + " " + userDataN.firstName,
          phoneUser: userDataN.phoneNumber.countryCode + userDataN.phoneNumber.number,
          addressUser: userDataN.address,
          emailUser: userDataN.email,

          nameOwner: motelRoomDataN.owner.lastName + motelRoomDataN.owner.firstName,
          emailOwner: motelRoomDataN.owner.email,
          phoneOwner: 
            motelRoomDataN.owner.phoneNumber.countryCode 
            + motelRoomDataN.owner.phoneNumber.number,
          addressOwner: motelRoomDataN.owner.address,
          nameBankOwner: bankData ? bankData.nameTkLable : "Chưa thêm tài khoản",
          numberBankOwner: bankData ? bankData.stk : "Chưa thêm tài khoản",
          nameOwnerBankOwner: bankData ? bankData.nameTk : "Chưa thêm tài khoản",

          totalAll: orderDataAfterCheckInCost.amount.toFixed(2),
          totalAndTaxAll: orderDataAfterCheckInCost.amount.toFixed(2),
          totalTaxAll: 0,
          typeTaxAll: 0,

          description: orderDataAfterCheckInCost.orderData,

          user: userDataN._id,
          motel: motelRoomDataN._id,
          roomRented: roomDataN._id,

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
              roomDataN,
              motelRoomDataN,
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
                roomDataN,
                motelRoomDataN,
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
          { _id: roomDataN._id },
          { status: "rented", rentedBy: userDataN._id },
          { new: true }
        )
        .exec();

        await RoomController.updateInforMotel(
          floorDataN,
          motelRoomDataN,
        );
  
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
          ${ roomDataN.name} thuộc tòa nhà ${motelRoomDataN.name}, hạn cuối tới ngày ${activeExpireTime}.`,
  
          user: resData.user._id,
          isRead: false,
          type: "activeJob",
          url: `${process.env.BASE_PATH_CLINET3}job-detail/${resData._id}/${roomDataN._id}`,
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

        await global.agendaInstance.agenda.schedule(
          moment()
          .add(1, "days")
          .toDate(),
          "CheckImgForJobQuickRent",
          { jobId: resData._id, userId: userId}
        );
      }

      await NotificationController.createNotification({
        title: "Thông báo thuê nhiều phòng",
        content: `Hoàn thành việc thuê nhanh bằng file`,

        user: userId,
        isRead: false,
        type: null,
        url: null,
        tag: null,
        contentTag: null,
      });
      done();
    } catch (error) {
      done()
    }
  });

  agenda.define("CreateAllOrderDepositForQuickDepositManyRoomsByAdmin", async(job, done) => {
    try {
      const {
        user: userModel,
        room: roomModel,
        floor: floorModel,
        motelRoom: motelRoomModel,
        transactions: transactionsModel,
        job: jobModel,
        order: orderModel,
        banking: bankingModel,
        bill: billModel,
      } = global.mongoModel;

      const cleanArray = job.attrs.data.data;
      const bankId = job.attrs.data.bankId;
      const data = job.attrs.data;
      const userId = job.attrs.data.userId;

      for(let i = 0; i < cleanArray.length; i++) {
        const phoneNumber = cleanArray[i][6];
        const phoneNumberObect = {
          countryCode: "+84",
          number: helpers.stripeZeroOut(phoneNumber),
        };

        let userDataN = await userModel.findOne({phoneNumber: phoneNumberObect})
        .lean()
        .exec();

        if(!userDataN) {
          let dataSignUp = {
            firstName: cleanArray[i][5],
            lastName: cleanArray[i][4],
            phoneNumber: phoneNumberObect,
            email: cleanArray[i][9],
            password: cleanArray[i][10],
            confirmPassword: cleanArray[i][10],
            role: ['customer'],
          }

          userDataN = await createAccountForUser(
            dataSignUp,
            phoneNumber,
          );
        }

        const roomDataN = await roomModel.findOne({_id: cleanArray[i][2]}).lean().exec();

        const floorDataN = await floorModel
          .findOne({ rooms: roomDataN._id })
          .populate("rooms")
          .lean()
          .exec();

        const motelRoomDataN = await motelRoomModel
          .findOne({ floors: floorDataN._id })
          .populate("floors owner address")
          .lean()
          .exec();

        let price = roomDataN.price;
        let bail =  roomDataN.depositPrice === 0 ? roomDataN.price : roomDataN.depositPrice;
        let deposit = Number(price) / 2;
        let afterCheckInCost = Number(price) * 0.5 + Number(bail);
        let total = Number(price) + Number(bail);

        let resData = await jobModel.create({
          checkInTime: moment(cleanArray[i][7],  "DD/MM/YYYY").startOf("days").toDate(),
          user: userDataN._id,
          room: roomDataN._id,
          price: price,
          bail: bail,
          total: total,
          afterCheckInCost: afterCheckInCost,
          deposit: deposit,
          // rentalPeriod: parseInt(cleanArray[i][8]),
          rentalPeriod: typeof cleanArray[i][8] === 'string' ? parseInt(cleanArray[i][8]) : cleanArray[i][8],
          status: "pendingActivated",
          
          fullName: userDataN.lastName + " " + userDataN.firstName,
          phoneNumber: userDataN.phoneNumber.countryCode +  userDataN.phoneNumber.number,
        });

        let userUpdateData = {
          $addToSet: {
            jobs: resData._id,
          },
        };

        //order, transaction, bill of deposit
        const orderData = await orderModel.create({
          user: userDataN._id,
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
          user: userDataN._id,
          keyPayment: getRandomHex2(),
          keyOrder: orderData.keyOrder,
          description:  `Tiền cọc phòng tháng ${moment(resData.checkInTime).format("MM/YYYY")}`,
          amount: orderData.amount,
          status: "success",
          paymentMethod: "cash",
          order: orderData._id,
          banking: bankId,
          type: "deposit",
          motel: motelRoomDataN._id,
          room: roomDataN._id,
        });

        const bankData = await bankingModel.findOne({_id: bankId}).lean().exec();

        await billModel.create({
          order: orderData._id,
          idBill: orderData.keyOrder,
          dateBill: moment().format("DD/MM/YYYY"),
          nameMotel: motelRoomDataN.name,
          addressMotel: motelRoomDataN.address.address,
          nameRoom: roomDataN.name,

          nameUser: userDataN.lastName + " " + userDataN.firstName,
          phoneUser: userDataN.phoneNumber.countryCode + userDataN.phoneNumber.number,
          addressUser: userDataN.address,
          emailUser: userDataN.email,

          nameOwner: motelRoomDataN.owner.lastName + motelRoomDataN.owner.firstName,
          emailOwner: motelRoomDataN.owner.email,
          phoneOwner: 
            motelRoomDataN.owner.phoneNumber.countryCode 
            + motelRoomDataN.owner.phoneNumber.number,
          addressOwner: motelRoomDataN.owner.address,
          nameBankOwner: bankData ? bankData.nameTkLable : "Chưa thêm tài khoản",
          numberBankOwner: bankData ? bankData.stk : "Chưa thêm tài khoản",
          nameOwnerBankOwner: bankData ? bankData.nameTk : "Chưa thêm tài khoản",

          totalAll: orderData.amount.toFixed(2),
          totalAndTaxAll: orderData.amount.toFixed(2),
          totalTaxAll: 0,
          typeTaxAll: 0,

          description: orderData.description,

          user: userDataN._id,
          motel: motelRoomDataN._id,
          roomRented: roomDataN._id,

          type: "deposit",
        });

        await userModel
        .findOneAndUpdate({ _id: userDataN._id }, userUpdateData, { new: true })
        .exec();

        await roomModel
        .findOneAndUpdate(
          { _id: roomDataN._id },
          { status: "deposited", rentedBy: userDataN._id },
          { new: true }
        )
        .exec();

        // const roomGroup = lodash.groupBy(floorDataN.rooms, (room) => {
        //   return room.status;
        // });
  
        // await floorModel
        //   .findOneAndUpdate(
        //     { _id: floorDataN._id },
        //     {
        //       availableRoom: roomGroup["available"]
        //         ? roomGroup["available"].length
        //         : 0,
        //       rentedRoom: roomGroup["rented"]
        //         ? roomGroup["rented"].length
        //         : 0,
        //       depositedRoom: roomGroup["deposited"]
        //         ? roomGroup["deposited"].length
        //         : 0,
        //     }
        //   )
        //   .exec();
  
        // let updateData = {
        //   availableRoom: lodash.sumBy(motelRoomDataN.floors, "availableRoom"),
        //   rentedRoom: lodash.sumBy(motelRoomDataN.floors, "rentedRoom"),
        //   depositedRoom: lodash.sumBy(motelRoomDataN.floors, "depositedRoom"),
        // };
  
        // await motelRoomModel
        //   .findOneAndUpdate({ _id: motelRoomDataN._id }, updateData)
        //   .exec();

        await RoomController.updateInforMotel(
          floorDataN,
          motelRoomDataN,
        );
  
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
          ${ roomDataN.name} thuộc tòa nhà ${motelRoomDataN.name}, hạn cuối tới ngày ${activeExpireTime}.`,
  
          user: resData.user._id,
          isRead: false,
          type: "activeJob",
          url: `${process.env.BASE_PATH_CLINET3}job-detail/${resData._id}/${roomDataN._id}`,
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
      }

      await NotificationController.createNotification({
        title: "Thông báo đặt cọc nhiều phòng",
        content: `Hoàn thành việc đặt cọc nhanh bằng file`,

        user: userId,
        isRead: false,
        type: null,
        url: null,
        tag: null,
        contentTag: null,
      });
      done();
    } catch (error) {
      done();
    }
  });

  agenda.define("CreateAllOrderMonthlyForQuickRentOneRoomByAdmin", async(job, done) => {
    try {
      const {
        room: roomModel,
        motelRoom: motelRoomModel,
        job: jobModel,
      } = global.mongoModel;

      const jobId = job.attrs.data.jobId;
      const roomId = job.attrs.data.roomId;
      const motelRoomId = job.attrs.data.motelRoomId;
      const bankId = job.attrs.data.bankId;
      const checkInDay = moment(job.attrs.data.checkInDay);
      const timeMoment = moment(job.attrs.data.timeMoment);

      const resData = await jobModel.findOne({_id: jobId}).lean().exec();
      const roomData = await roomModel.findOne({_id: roomId}).lean().exec();
      const motelRoomData = await motelRoomModel.findOne({_id: motelRoomId})
        .populate("floors owner address")
        .lean().exec();

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

          let orderDataMonthly = await RoomController.createOrderHistory(
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

            let orderDataMonthly = await RoomController.createOrderHistory(
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

        }
      }

      done();
    } catch (error) {
      done();
    }
  });

  agenda.define("CheckImgForJobQuickRent", async(job, done) => {
    try {
      const { 
        job: jobModel,
        room: roomModel,
        floor: floorModel,
        motelRoom: motelRoomModel,
      } = global.mongoModel;
      const jobId = job.attrs.data.jobId;
      const userId = job.attrs.data.userId;

      const jobData = await jobModel.findOne({_id: jobId}).lean().exec();
      if(!jobData) {
        done();
      }

      const roomId = jobData.room;
      const roomData = await roomModel.findOne({_id: roomId}).lean().exec();
      if(!roomData) {
        done();
      }

      const floorData = await floorModel.findOne({rooms: roomData._id}).lean().exec();
      if(!floorData) {
        done();
      }

      const motelRoomData = await motelRoomModel.findOne({floors: floorData._id}).lean().exec();
      if(!motelRoomData) {
        done();
      }
      if(jobData.images) {
        if(jobData.images.length < 2) {
          await NotificationController.createNotification({
            title: "Thông báo cập nhật ảnh cho hợp đồng",

            content: `Phòng ${roomData.name} thuộc tòa nhà ${motelRoomData.name} được 
            thuê nhanh ngày ${moment(jobData.checkInTime).format("DD-MM-YYYY")} 
            chưa cập nhật ảnh CCCD`,

            user: jobData.user._id,
            isRead: false,
            type: "updateImgForJob",
            url: `${process.env.BASE_PATH_CLINET3}room-detail-update/${roomData._id}`,
            tag: "Job",
            contentTag: userId,
          });
        } else {
          await global.agendaInstance.agenda.schedule(
            moment()
            .add(1, "days")
            .toDate(),
            "CheckImgForJobQuickRent",
            { jobId: jobId, userId: userId}
          );
        }
      }
      done();
    } catch (error) {
      done();
    }
  });


  agenda.define("Test1", async (job, done) => {
    try {
      console.log("Test1");

      const { order: orderModel } = global.mongoModel;

      const orderData = await orderModel.create({
        user: "test1",
        job: "test1",
        isCompleted: false,
        //Thêm trường điện nước
        description: `Tiền phòng tháng ${moment().month()}/${moment().year()}`, //vì là tháng trước đó
        // amount:
        //   (resData.room.price / 30) *
        //   moment(resData.checkInTime)
        //     .endOf("month")
        //     .diff(moment(resData.checkInTime), "days"),
        amount: 0,
        type: "monthly",
      });

      await global.agendaInstance.agenda.schedule(
        new Date(),
        "Test2",
        { idOrder: orderData._id }
      );

      done();
    } catch (err) {
      done();
    }
  });

  agenda.define("Test2", async (job, done) => {
    try {
      const { order: orderModel } = global.mongoModel;
      console.log("Test2");

      const orderDate = await orderModel.findOne(job.attrs.data.idOrder)

      console.log({ orderDate });

      await global.agendaInstance.agenda.schedule(
        moment().add("1", "minutes").toDate(),
        "Test3",
        { idOrder: 1 }
      );

      done();
    } catch (err) {
      done();
    }
  });

  agenda.define("Test3", async (job, done) => {
    try {
      console.log("Test3");

      done();
    } catch (err) {
      done();
    }
  });


  // (async function () {
  //   await agenda.start();

  // await agenda.schedule('in 2 minutes', 'AutoChangeStatusRoom');


  // await agenda.schedule('in 2 minutes', 'CreateOrder');
  // await agenda.every('0 0 * * *', 'AutoChangeStatusRoomExpireDeposit');

  // await agenda.schedule('in 2 minutes', 'CreateOrder');
  // })();

};

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

// the data signup validated
async function createAccountForUser(
  data: any,
  phoneNumber,
): Promise<any> {
  let dataSignUp = {
    firstName: data.firstName,
    lastName: data.lastName,
    phoneNumber: data.phoneNumber,
    email: data.email,
    password: data.password,
    confirmPassword: data.confirmPassword,
    role: ['customer'],
    active: true,
  }

  const {
    user: userModel,
  } = global.mongoModel;

  // active
  dataSignUp["active"] = true;

  if (!dataSignUp.role.includes("customer")) {
    dataSignUp.role.push("customer");
  }

  let userData = new userModel(dataSignUp);
  console.log({dataSignUp})
  userData.phoneNumberFull = phoneNumber;

  // Generate jwt token
  userData.token = jwtHelper.signToken(userData._id, "local");

  let resData = await userData.save();
  console.log({ resData, userData });
  resData = resData.toObject();

  // Remove password property
  delete resData.password;
  delete resData.social;

  return userData;
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
    expireTime: expireTime.clone().toDate(),
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


