import * as moment from "moment";
import * as lodash from "lodash";

var nodemailer = require('nodemailer');

import JobController from "../../../controllers/homeKey/job.controller";
import EnergyController from "../../../controllers/homeKey/energy.controller";
import NotificationController from "../../../controllers/homeKey/notification";

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
            startTime: startTime.toDate(),
            endTime: endTime.toDate(),
            expireTime: expireTime.toDate(),
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

          const expireTime = endTime.add(15, "days");
  
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
            startTime: startTime.toDate(),
            endTime: endTime.toDate(),
            expireTime: expireTime.toDate(),
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

            //cập nhật lại motel

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

          //cập nhật lại floor
          let floorData = await floorModel
            .findOne({ rooms: roomId })
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

          //cập nhật lại motel

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

              //cập nhật lại floor
              let floorData = await floorModel
                .findOne({ rooms: roomId })
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

              //cập nhật lại motel

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

            //cập nhật lại floor
            let floorData = await floorModel
              .findOne({ rooms: roomId })
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

            //cập nhật lại motel

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
            const endTime = checkOutTime.endOf("day");
            const end = endTime.format("YYYY-MM-DD");
            const expireTime = endTime.add(15, "days");

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
              startTime: startTime.toDate(),
              endTime: endTime.toDate(),
              expireTime: expireTime.toDate(),
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

              //cập nhật lại floor
              let floorData = await floorModel
                .findOne({ rooms: roomId })
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

              //cập nhật lại motel

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
          // console.log("BỘ BỘ: checkOutDay", checkOutDay)

          const startTime = checkOutDay.clone().startOf("months").startOf("day");
          // console.log("BỘ BỘ: startTime", startTime)
          // console.log("BỘ BỘ: checkOutDay", checkOutDay)
          const start = startTime.format("YYYY-MM-DD");
          const endTime = checkOutDay.clone().endOf("day");
          // console.log("BỘ BỘ: endTime", endTime)
          const end = endTime.clone().format("YYYY-MM-DD");
          // console.log("BỘ BỘ: checkOutDay", checkOutDay)

          const expireTime = endTime.clone().date(6).endOf('day');
          // console.log("BỘ BỘ: expireTime", expireTime)
          
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
            startTime: startTime.toDate(),
            endTime: endTime.toDate(),
            expireTime: expireTime.toDate(),
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

              //cập nhật lại floor
              let floorData = await floorModel
                .findOne({ rooms: roomId })
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

              //cập nhật lại motel

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

            //cập nhật lại floor
            let floorData = await floorModel
              .findOne({ rooms: roomId })
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

            //cập nhật lại motel

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

            const expireTime = endTime.add(15, "days");

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
              startTime: startTime.toDate(),
              endTime: endTime.toDate(),
              expireTime: expireTime.toDate(),
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

            //cập nhật lại floor
            let floorData = await floorModel
              .findOne({ rooms: roomId })
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

            //cập nhật lại motel

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
          // const checkOutDay = new Date(checkInDay);
          // checkOutDay.setMonth(checkOutDay.getMonth() + rentalPeriod);
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
            const endTime = checkOutDay.endOf("day");
            const end = endTime.format("YYYY-MM-DD");

            const expireTime = endTime.add(15, "days");

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
            const numberDayStay = (Math.abs(checkOutDay.diff(checkOutDay.startOf("month"), "days")) + 1); //cộng 1: tính cả ngày checkIn
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
              startTime: startTime.toDate(),
              endTime: endTime.toDate(),
              expireTime: expireTime.toDate(),
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

              //cập nhật lại floor
              let floorData = await floorModel
                .findOne({ rooms: roomId })
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

              //cập nhật lại motel

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
          // const checkOutDay = new Date(checkInDay);
          
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
              {expireTime: checkOutDay.date(15).endOf('day').toDate()}
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

            const expireTime = endTime.add(15, "days");

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
              startTime: startTime.toDate(),
              endTime: endTime.toDate(),
              expireTime: expireTime.toDate(),
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

              //cập nhật lại floor
              let floorData = await floorModel
                .findOne({ rooms: roomId })
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

              //cập nhật lại motel

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
                  checkOutDay.endOf("days").toDate(), //note: 5
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

          console.log("HHHHH: checkOutDay", checkOutDay);

          const startTime = checkOutDay.clone().startOf("months");
          console.log("HHHHH: startTime", startTime);
          const start = startTime.clone().format("YYYY-MM-DD");
          const endTime = checkOutDay.clone().endOf("day");
          console.log("HHHHH: endTime", endTime);
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

          console.log("HHHHH: GGG", endTime);
  
  
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
            startTime: startTime.toDate(),
            endTime: endTime.toDate(),
            expireTime: expireTime.toDate(),
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
          console.log("NGÀY HẾT HẠN checkOutDay: ", checkOutDay);
          const checkOutDayPlus3 = checkOutDay.clone().add(3, "days");// số ngày để đóng hóa đơn cuối (3 ngày: ngày hiện tại + 2 ngày)
          console.log("NGÀY HẾT HẠN: ", checkOutDayPlus3);

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

              //cập nhật lại floor
              let floorData = await floorModel
                .findOne({ rooms: roomId })
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

              //cập nhật lại motel

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

            //cập nhật lại floor
            let floorData = await floorModel
              .findOne({ rooms: roomId })
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

            //cập nhật lại motel

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
              checkOutDay.endOf("days").toDate(),
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
        // console.log("RemindUserRenewContractAndChangeStatusRoomBeforeOneMonth checkOutDay", checkOutDay);
        // console.log("RemindUserRenewContractAndChangeStatusRoomBeforeOneMonth moment", moment());
        // console.log("RemindUserRenewContractAndChangeStatusRoomBeforeOneMonth sub", checkOutDay.clone().diff(moment(), "months"));
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


