import axios, { AxiosResponse } from "axios";
import env from "../../../constants/env";

export default (agenda) => {
  // agenda.define("backupDataPerHour", async (job, done) => {
  //   const { electrics: ElectricsModel } = global.mongoModel;
  //   const urlDevices = `${env().homelandsBaseUrl}/v1/devices/`;
  //   const resListDevice: AxiosResponse = await axios.get(urlDevices);
  //   const countDevice = resListDevice.data.length;

  //   for (let i = 0; i < countDevice; i++) {
  //     let urlData = `${env().homelandsBaseUrl}/v1/devices/${
  //       resListDevice.data[i].Id
  //     }/data?limit=1`;
  //     const resData: AxiosResponse = await axios.get(urlData);
  //     try {
  //       for (let i = 0; i < countDevice; i++) {
  //         let urlData = `http://homeland-2.ddns.net:8005/api/v1/devices/${resListDevice.data[i].Id}/data?limit=1`;
  //         const resData: AxiosResponse = await axios.get(urlData);

  //         const dataGet = resData.data.Records[0];

  //         let originTime = new Date(dataGet.Time);
  //         originTime.setHours(originTime.getHours() + 7);

  //         await ElectricsModel.create({
  //           IdDevice: dataGet.DeviceId,
  //           NameRoom: resListDevice.data[i].Name,
  //           Time: originTime,
  //           Total_kWh: dataGet.Value.Total_kWh,
  //           Export_kWh: dataGet.Value.Export_kWh,
  //           Import_kWh: dataGet.Value.Import_kWh,
  //           Voltage: dataGet.Value.Voltage,
  //           Current: dataGet.Value.Current,
  //           Active_Power: dataGet.Value.Active_Power,
  //           Reactive_Power: dataGet.Value.Reactive_Power,
  //           Power_Factor: dataGet.Value.Power_Factor,
  //           Frequency: dataGet.Value.Frequency,
  //         });
  //       }
  //       const day = new Date();
  //       console.log("day", day);
  //       console.log("GetAndSaveEnergy success");
  //       done();
  //     } catch (err) {
  //       console.log("GetAndSaveEnergy faild");
  //       done();
  //     }
  //   }
  // });

  // history energy per mon
  // agenda.define("SaveHistoryEnergy", async (job, done) => {
  //   console.log("Call SaveHistoryEnergy");

  //   // Init models
  //   const {
  //     historyEnergy: HistoryEnergyModel,
  //     room: RoomModel,
  //   } = global.mongoModel;
  //   try {
  //     const today = new Date();
  //     today.setMonth(today.getMonth() - 1);
  //     console.log("today", today);

  //     const year = today.getFullYear();
  //     const month = today.getMonth() + 1;

  //     console.log("year", year);
  //     console.log("month", month);

  //     const formattedMonth = month < 10 ? `0${month}` : month;
  //     console.log("formattedMonth", formattedMonth);

  //     const startOfMonth = new Date(`${year}-${formattedMonth}-01T00:00:00Z`);
  //     const endOfMonth = new Date(
  //       new Date(startOfMonth).setMonth(startOfMonth.getMonth() + 1) - 1
  //     );

  //     console.log("startOfMonth", startOfMonth);
  //     console.log("endOfMonth", endOfMonth);

  //     const listRoom = await RoomModel.find()
  //       .lean()
  //       .exec();

  //     console.log("listRoom", listRoom.length);

  //     const { electrics: ElectricsModel } = global.mongoModel;

  //     const lengthListRoom = listRoom.length;

  //     for (let i = 0; i < lengthListRoom; i++) {
  //       if (listRoom[i].idElectricMetter) {
  //         const queryOneBeforeMon = {
  //           IdDevice: listRoom[i].idElectricMetter,
  //           Time: { $lt: startOfMonth },
  //         };

  //         let dataBeforeMon = await ElectricsModel.findOne(queryOneBeforeMon)
  //           .sort({ Time: -1 })
  //           .lean()
  //           .exec();
  //         console.log("dataBeforeMon", dataBeforeMon);
  //         const queryOneLastMon = {
  //           IdDevice: listRoom[i].idElectricMetter,
  //           Time: { $lt: endOfMonth },
  //         };
  //         let dataLastMon = await ElectricsModel.findOne(queryOneLastMon)
  //           .sort({ Time: -1 })
  //           .lean()
  //           .exec();
  //         console.log("dataLastMon", dataLastMon);

  //         if (dataLastMon !== null && dataBeforeMon !== null) {
  //           const result = await HistoryEnergyModel.create({
  //             IdDevice: listRoom[i].idElectricMetter,
  //             TotalKWh: dataLastMon.Total_kWh - dataBeforeMon.Total_kWh,
  //             Water: 0,
  //             FromTime: startOfMonth,
  //             ToTime: endOfMonth,
  //           });
  //         }
  //       }
  //     }

  //     done();
  //   } catch (err) {
  //     done();
  //   }
  // });

  (async function() {
    await agenda.start();
    // mỗi tiếng chạy 1 lần
    // await agenda.every("0 * * * *", "backupDataPerHour");
    
    // await agenda.schedule('in 2 minutes', 'SaveHistoryEnergy');
    // cuối mỗi tháng, lúc 0h00 của ngày đầu tiên tháng tiếp theo
    // await agenda.every("0 0 1 * *", "SaveHistoryEnergy");

    // await agenda.every('* * * * *', 'SaveHistoryEnergy');
  })();
};
