import { NextFunction, Request, Response } from "express";
import axios, { AxiosResponse } from "axios";
import HttpResponse from "../../services/response";
import { default as env } from "../../constants/env";
import JobController from "./job.controller";
import { ChartCallback, ChartJSNodeCanvas } from "chartjs-node-canvas";
import { ChartConfiguration } from "chart.js";
import "jspdf-autotable";
import { PDFDocument, rgb } from 'pdf-lib';
import * as PdfPrinter from "pdfmake";
import moment = require("moment");
import { json, raw } from "body-parser";
var nodemailer = require("nodemailer");
import * as lodash from "lodash";
import { start } from "repl";
import room from "services/agenda/jobs/room";
import { FloorModel } from "models/homeKey/floor";
import { time } from "console";
import electric from "services/agenda/jobs/electric";

import { helpers } from "../../utils";
import { UserModel } from "models/user";

const width = 595;
const height = 400;

const chartCallback: ChartCallback = (ChartJS) => {
  ChartJS.defaults.responsive = true;
  ChartJS.defaults.maintainAspectRatio = false;
};
const chartJSNodeCanvas = new ChartJSNodeCanvas({
  width,
  height,
  chartCallback,
});

type historyEnergyPerMonth = {
    labelMonth: string,
    value: number
}

export default class EnergyController {
  static async exportPdf(req: Request, res: Response, next: NextFunction) {
    const configuration: ChartConfiguration = {
      type: "bar",
      data: {
        labels: ["Red", "Blue", "Yellow", "Green", "Purple", "Orange"],
        datasets: [
          {
            label: "# of Votes",
            data: [12, 19, 3, 5, 2, 3],
            backgroundColor: [
              "rgba(255, 99, 132, 0.2)",
              "rgba(54, 162, 235, 0.2)",
              "rgba(255, 206, 86, 0.2)",
              "rgba(75, 192, 192, 0.2)",
              "rgba(153, 102, 255, 0.2)",
              "rgba(255, 159, 64, 0.2)",
            ],
            borderColor: [
              "rgba(255,99,132,1)",
              "rgba(54, 162, 235, 1)",
              "rgba(255, 206, 86, 1)",
              "rgba(75, 192, 192, 1)",
              "rgba(153, 102, 255, 1)",
              "rgba(255, 159, 64, 1)",
            ],
            borderWidth: 1,
          },
        ],
      },
      options: {},
      plugins: [
        {
          id: "background-colour",
          beforeDraw: (chart) => {
            const ctx = chart.ctx;
            ctx.save();
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
          },
        },
        {
          id: "chart-data-labels",
          afterDatasetsDraw: (chart, args, options) => {
            const { ctx } = chart;
            ctx.save();

            // Configure data labels here
            const dataLabels = chart.data.datasets.map((dataset, i) => {
              const meta = chart.getDatasetMeta(i);
              return meta.data.map((element, index) => {
                const model = element;
                return element;
                // return {
                //   x: model.x,
                //   y: model.y,
                //   text: dataset.data[index], // You can customize this based on your data
                //   font: "12px Arial", // Example font setting
                //   fillStyle: "black", // Example color setting
                //   textAlign: "center", // Example alignment setting
                // };
              });
            });
            // .flat();

            // dataLabels.forEach((label) => {
            //   ctx.fillStyle = label.fillStyle;
            //   ctx.font = label.font;
            //   ctx.textAlign = label.textAlign;
            //   ctx.fillText(label.text, label.x, label.y);
            // });

            ctx.restore();
          },
        },
      ],
    };

    const buffer = await chartJSNodeCanvas.renderToBuffer(configuration);
    res.contentType("png");
    res.send(buffer);

    return HttpResponse.returnSuccessResponse(res, {
      message: "Export successfully!",
    });
  }
  /**
   * @swagger
   * tags:
   *   - name: Energy/Device
   *     description: Energy
   */

  /**
   * @swagger
   * /v1/homeKey/energy/devices:
   *   get:
   *     description: Get all devices
   *     tags: [Energy/Device]
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
  static async getAllDevice(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const url = `${env().homelandsBaseUrl}/v1/devices`;
      const res2: AxiosResponse = await axios.get(url);

      const listDevice = res2.data;
      return HttpResponse.returnSuccessResponse(res, listDevice);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * tags:
   *   - name: Energy/Device
   *     description: Energy
   */

  /**
   * @swagger
   * /v1/homeKey/energy/devices/{deviceId}/data:
   *   get:
   *     description: Get device by id
   *     tags: [Energy/Device]
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: deviceId
   *         in: path
   *         required: true
   *         type: string
   *         description: Device id
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
  static async getDeviceDataV1(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    const deviceId = req.params.id;
    try {
      const url = `${env().homelandsBaseUrl}/v1/devices/${deviceId}/data`;
      const res2: AxiosResponse = await axios.get(url);

      const dataDevice = res2.data;

      return HttpResponse.returnSuccessResponse(res, dataDevice);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * tags:
   *   - name: Energy/Device
   *     description: Energy
   */

  /**
   * @swagger
   * /v1/homeKey/energy/devices/{deviceId}/data:
   *   get:
   *     description: Get latest device by id
   *     tags: [Energy/Device]
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: deviceId
   *         in: path
   *         required: true
   *         type: string
   *         description: Device id
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
  static async getLatestDeviceDataV1(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    const deviceId = req.params.id;
    try {
      const url = `${env().homelandsBaseUrl
        }/v1/devices/${deviceId}/data?limit=1&page=1`;
      const res2: AxiosResponse = await axios.get(url);

      const latestDataDevice = res2.data;

      return HttpResponse.returnSuccessResponse(res, latestDataDevice);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * tags:
   *   - name: Energy/Device
   *     description: Energy
   */

  /**
   * @swagger
   * /v1/homeKey/energy/devices/{deviceId}/data:
   *   get:
   *     description: Get the data for the current day per hour.
   *     tags: [Energy/Device]
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: deviceId
   *         in: path
   *         required: true
   *         type: string
   *         description: Device id
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
  // static async getCurrentDayDataPerHourV1(
  //   req: Request,
  //   res: Response,
  //   next: NextFunction
  // ): Promise<any> {
  //   const deviceId: string = req.params.id;

  //   // Get YYYY-MM-DD
  //   let currentDay: Date = new Date();
  //   currentDay.setHours(currentDay.getHours() + 7);
  //   let currentDayString = currentDay.toISOString().slice(0, -14);
  //   console.log({ currentDay, currentDayString });

  //   // CHÚ Ý: CHƯA SET NGÀY TRƯỚC ĐÓ KHÔNG CÓ DỮ LIỆU, ĐỢI CÓ DB THÌ DỄ SORT HƠN
  //   try {
  //     const url1 = `${env().homelandsBaseUrl
  //       }/v1/devices/${deviceId}/data?from_time=${currentDayString}T00:00:00.000&to_time=${currentDayString}T23:59:59.999&limit=100&page=1`;
  //     const res1: AxiosResponse = await axios.get(url1);

  //     const rawData1 = res1.data.Records;
  //     // const rawData1 = res1.data;

  //     interface DataEntry {
  //       Time: string;
  //       Total_kWh: number;
  //     }

  //     // LẤY MỖI GIỜ 1 LẦN
  //     function getLastObjectPerHour(data: DataEntry[]): (DataEntry | null)[] {
  //       const lastObjectPerHour: { [key: number]: DataEntry } = {};

  //       for (const entry of data) {
  //         // Chuyển đổi chuỗi thời gian thành đối tượng Date
  //         const time = new Date(entry.Time);

  //         // Lấy giờ từ đối tượng Date
  //         const hour = time.getHours();

  //         // Nếu đối tượng không tồn tại hoặc là đối tượng cuối cùng của giờ hiện tại
  //         if (
  //           !lastObjectPerHour[hour] ||
  //           time > new Date(lastObjectPerHour[hour].Time)
  //         ) {
  //           lastObjectPerHour[hour] = entry;
  //         }
  //       }

  //       // Chuyển đổi dictionary thành mảng
  //       const result: (DataEntry | null)[] = Array.from(
  //         { length: 24 },
  //         (_, hour) => lastObjectPerHour[hour] || null
  //       );

  //       return result;
  //     }

  //     const latestDataDevice: (DataEntry | null)[] = getLastObjectPerHour(
  //       rawData1
  //     );

  //     const url2 = `${env().homelandsBaseUrl
  //       }/v1/devices/${deviceId}/lastedtotime?to_time=${currentDayString}T00:00:00.000`;
  //     const res2: AxiosResponse = await axios.get(url2);
  //     const lastDataBeforeDay = res2.data;

  //     const kWhData = [];
  //     let lastValue = 0;
  //     let activePowerPerHour = [];
  //     let electricPerHour = [];

  //     if (lastDataBeforeDay !== undefined) {
  //       lastValue = lastDataBeforeDay.value.Total_kWh;

  //       const kWhArr = latestDataDevice.map((item) =>
  //         item !== null ? item.Total_kWh : null
  //       );

  //       activePowerPerHour = latestDataDevice.map((item) =>
  //         item !== null ? item.value.Active_Power * 1000 : null
  //       );
  //       electricPerHour = latestDataDevice.map((item) =>
  //         item !== null ? item.value.Current : null
  //       );

  //       for (let i = 0; i < kWhArr.length; i++) {
  //         if (kWhArr[i] === null) {
  //           kWhData.push(null);
  //         } else {
  //           let result = kWhArr[i] - lastValue;
  //           // kWhData.push(result);
  //           // lastValue = kWhArr[i];
  //           if (result < 0) {
  //             kWhData.push(null);
  //             lastValue = kWhArr[i];
  //           } else {
  //             kWhData.push(result);
  //             lastValue = kWhArr[i];
  //           }
  //         }
  //       }
  //     }

  //     let totalkWhDay = kWhData.reduce((acc, curr) => acc + curr, 0);

  //     const resultData = {
  //       electricPerHour: electricPerHour,
  //       activePowerPerHour: activePowerPerHour,
  //       totalkWhDay: totalkWhDay,
  //       kWhData: kWhData,
  //       lastDataBeforeDay: lastDataBeforeDay,
  //       latestDataDevice: latestDataDevice,
  //     };

  //     return HttpResponse.returnSuccessResponse(res, resultData);
  //   } catch (e) {
  //     next(e);
  //   }
  // }

  /**
   * @swagger
   * tags:
   *   - name: Energy/Device
   *     description: Energy
   */

  /**
   * @swagger
   * /v1/homeKey/energy/devices/{deviceId}/data:
   *   get:
   *     description: Get the data for the current month per day.
   *     tags: [Energy/Device]
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: deviceId
   *         in: path
   *         required: true
   *         type: string
   *         description: Device id
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
  // static async getCurrentMonDataPerDayV1(
  //   req: Request,
  //   res: Response,
  //   next: NextFunction
  // ): Promise<any> {
  //   try {
  //     const deviceId = req.params.id;

  //     let currentTime = new Date();

  //     currentTime.setHours(currentTime.getHours() + 7);

  //     const nowYear = currentTime.getFullYear();

  //     let nowMon = currentTime.getMonth() + 1;
  //     let nowMonApi = "";
  //     if (nowMon < 10) {
  //       nowMonApi = "0" + nowMon.toString();
  //     } else {
  //       nowMonApi = nowMon.toString();
  //     }
  //     const nowDay = currentTime.getDate();
  //     let nowDayApi = "";
  //     if (nowDay < 10) {
  //       nowDayApi = "0" + nowDay.toString();
  //     } else {
  //       nowDayApi = nowDay.toString();
  //     }
  //     const nowHour = currentTime.getHours() - 7;
  //     const currentTimeViet = currentTime.toISOString().slice(0, -1);
  //     console.log({
  //       currentTimeViet,
  //       nowDay,
  //       nowMon,
  //       nowHour,
  //       nowYear,
  //     });

  //     let resultDataPerDay = [];

  //     for (let i = nowDay; i > 0; i--) {
  //       let nowDayApi = i.toString();
  //       if (i < 10) {
  //         nowDayApi = "0" + i.toString();
  //       }
  //       const url = `${env().homelandsBaseUrl
  //         }/v1/devices/${deviceId}/data?from_time=${nowYear}-${nowMonApi}-${nowDayApi}T00:00:00.000&to_time=${nowYear}-${nowMonApi}-${nowDayApi}T23:59:59.999&limit=1`;
  //       const respone: AxiosResponse = await axios.get(url);
  //       if (respone.data.Records.length !== 0) {
  //         resultDataPerDay.push(respone.data.Records[0]);
  //       } else {
  //         resultDataPerDay.push(null);
  //       }

  //       console.log("Day", i);
  //     }

  //     resultDataPerDay = resultDataPerDay.reverse();

  //     const url2 = `${env().homelandsBaseUrl
  //       }/v1/devices/${deviceId}/lastedtotime?to_time=${nowYear}-${nowMonApi}-01T00:00:00.000`;
  //     const res2: AxiosResponse = await axios.get(url2);

  //     let lastDataBeforeMon = [];
  //     const kWhData = [];
  //     let lastValue = 0;
  //     let activePowerPerHour = [];
  //     let electricPerHour = [];
  //     let totalkWhMon = -1;

  //     if (res2.status === 200) {
  //       lastDataBeforeMon = res2.data;
  //       lastValue = lastDataBeforeMon.value.Total_kWh;

  //       const kWhArr = resultDataPerDay.map((item) =>
  //         item !== null ? item.Value.Total_kWh : null
  //       );
  //       for (let i = 0; i < kWhArr.length; i++) {
  //         if (kWhArr[i] === null) {
  //           kWhData.push(null);
  //         } else {
  //           let result = kWhArr[i] - lastValue;
  //           // Trường hợp thay đồng hồ khác có chỉ số nhỏ hơn chỉ số cũ, nếu ngày đó thay đồng hồ thì chấp nhận mất dữ liệu của ngày đó
  //           if (result < 0) {
  //             kWhData.push(null);
  //             lastValue = kWhArr[i];
  //           } else {
  //             kWhData.push(result);
  //             lastValue = kWhArr[i];
  //           }
  //         }
  //       }

  //       totalkWhMon = kWhData.reduce((acc, curr) => acc + curr, 0);
  //     }

  //     const resultData = {
  //       totalkWhMon: totalkWhMon,
  //       kWhData: kWhData,
  //       lastDataBeforeMon: lastDataBeforeMon,
  //       resultDataPerDay: resultDataPerDay,
  //     };

  //     return HttpResponse.returnSuccessResponse(res, resultData);
  //   } catch (e) {
  //     next(e);
  //   }
  // }

  //////////////////////////////////////////////////////////////////////////
  /////////////////////////NEW////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////

  static async getCurrentDayDataPerHour(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    const deviceId = req.params.id;
    try {
      const { electrics: ElectricsModel } = global.mongoModel;

      const currentDate = new Date();
      // console.log("currentDate", currentDate);
      // console.log("currentDate", typeof(currentDate));

      // Đặt thời điểm về 0h00p00s
      currentDate.setHours(7, 0, 0, 0);
      // currentDate.setHours(-14, 0, 0, 0);
      const startOfDayCurrent = new Date(currentDate);

      // Đặt thời điểm về 23h59p59.999s
      currentDate.setHours(30, 59, 59, 999);
      // currentDate.setHours(10, 59, 59, 999);
      const endOfDayCurrent = new Date(currentDate);

      // console.log("startOfDayCurrent", startOfDayCurrent);
      // console.log("endOfDayCurrent", endOfDayCurrent);

      // const a = new Date('2024-01-23T10:55:18');
      // const b = new Date('2023-12-30T01:55:50');
      // a.setHours(a.getHours() + 7);
      // b.setHours(b.getHours() + 7);

      // console.log("a", a);
      // console.log("b", b);

      const queryInDay = {
        IdDevice: deviceId,
        Time: { $gte: startOfDayCurrent, $lt: endOfDayCurrent },
      };
      let dataInDay = await ElectricsModel.find(queryInDay)
        .lean()
        .exec();
      // console.log("dataInDay", dataInDay);

      // console.log("resData", dataInDay);
      // console.log("resData", dataInDay.length);

      const queryOneBeforeDay = {
        IdDevice: deviceId,
        Time: { $lt: startOfDayCurrent },
      };
      const dataBeforeDay = await ElectricsModel.findOne(queryOneBeforeDay)
        .sort({ Time: -1 })
        .lean()
        .exec();

      // Xử lý với các khung giờ bị mất thành null
      // const hourIntervals: Date[] = [];
      // let currentHourInterval = new Date(startOfDayCurrent);

      // while (currentHourInterval <= endOfDayCurrent) {
      //   hourIntervals.push(new Date(currentHourInterval));
      //   currentHourInterval.setHours(currentHourInterval.getHours() + 1);
      // }

      // // Kiểm tra và thêm dữ liệu hoặc null vào mảng
      // const dataWithNulls = hourIntervals.map(interval => {
      //   const query = {
      //     IdDevice: deviceId,
      //     Time: { $gte: interval, $lt: new Date(interval.getTime() + 3600000) } // 3600000 milliseconds = 1 hour
      //   };

      //   const data = dataInDay.find(item => interval.getTime() <= new Date(item.Time).getTime() && new Date(item.Time).getTime() < interval.getTime() + 3600000);
      //   return data || null;
      // });

      const hourIntervals: Date[] = [];
      let currentHourInterval = new Date(startOfDayCurrent);

      while (currentHourInterval <= endOfDayCurrent) {
        hourIntervals.push(new Date(currentHourInterval));
        currentHourInterval.setHours(currentHourInterval.getHours() + 1);
      }

      // Kiểm tra và thêm dữ liệu hoặc null vào mảng
      const dataWithNulls = hourIntervals.map((interval) => {
        const query = {
          IdDevice: deviceId,
          Time: { $gte: interval, $lt: new Date(interval.getTime() + 3600000) }, // 3600000 milliseconds = 1 hour
        };

        // Sắp xếp dataInDay theo thứ tự giảm dần của thời gian
        const sortedData = dataInDay.sort(
          (a, b) => new Date(b.Time).getTime() - new Date(a.Time).getTime()
        );

        // Tìm kiếm đối tượng dữ liệu đầu tiên trong khoảng thời gian
        const data = sortedData.find(
          (item) =>
            interval.getTime() <= new Date(item.Time).getTime() &&
            new Date(item.Time).getTime() < interval.getTime() + 3600000
        );

        return data || null;
      });

      // console.log('Data with nulls:', dataWithNulls);

      const kWhData = [];
      let lastValue = 0;
      let activePowerPerHour = [];
      let electricPerHour = [];
      let totalkWhDay = -1;

      if (dataBeforeDay !== null) {
        lastValue = dataBeforeDay.Total_kWh;
      } else {
        lastValue = 0;
      }

      activePowerPerHour = dataWithNulls.map((item) =>
        item !== null ? item.Active_Power : null
      );
      electricPerHour = dataWithNulls.map((item) =>
        item !== null ? item.Current : null
      );

      const kWhArr = dataWithNulls.map((item) =>
        item !== null ? item.Total_kWh : null
      );
      for (let i = 0; i < kWhArr.length; i++) {
        if (kWhArr[i] === null) {
          kWhData.push(null);
        } else {
          let result = kWhArr[i] - lastValue;
          // Trường hợp thay đồng hồ khác có chỉ số nhỏ hơn chỉ số cũ, nếu ngày đó thay đồng hồ thì chấp nhận mất dữ liệu của ngày đó
          if (result < 0) {
            kWhData.push(null);
            lastValue = kWhArr[i];
          } else {
            kWhData.push(result);
            lastValue = kWhArr[i];
          }
        }
      }

      totalkWhDay = kWhData.reduce((acc, curr) => acc + curr, 0);

      const resultData = {
        totalkWhDay: totalkWhDay,
        kWhData: kWhData,
        dataBeforeDay: dataBeforeDay,
        dataInDay: dataWithNulls,
        activePowerPerHour: activePowerPerHour,
        electricPerHour: electricPerHour,
      };
      return HttpResponse.returnSuccessResponse(res, resultData);
    } catch (e) {
      next(e);
    }
  }

  static async getDataInDayPerHourByTime(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    const deviceId = req.params.id;
    const time = req.params.time;
    console.log("time", time);
    try {
      const { electrics: ElectricsModel } = global.mongoModel;

      const currentDate = new Date(time);
      // console.log("currentDate", currentDate);
      // console.log("currentDate", typeof(currentDate));

      // Đặt thời điểm về 0h00p00s
      currentDate.setHours(7, 0, 0, 0);
      // currentDate.setHours(-14, 0, 0, 0);
      const startOfDayCurrent = new Date(currentDate);

      // Đặt thời điểm về 23h59p59.999s
      currentDate.setHours(30, 59, 59, 999);
      // currentDate.setHours(10, 59, 59, 999);
      const endOfDayCurrent = new Date(currentDate);

      console.log("startOfDayCurrent", startOfDayCurrent);
      console.log("endOfDayCurrent", endOfDayCurrent);

      // const a = new Date('2024-01-23T10:55:18');
      // const b = new Date('2023-12-30T01:55:50');
      // a.setHours(a.getHours() + 7);
      // b.setHours(b.getHours() + 7);

      // console.log("a", a);
      // console.log("b", b);

      const queryInDay = {
        IdDevice: deviceId,
        Time: { $gte: startOfDayCurrent, $lt: endOfDayCurrent },
      };
      let dataInDay = await ElectricsModel.find(queryInDay)
        .lean()
        .exec();
      // console.log("dataInDay", dataInDay);

      // console.log("resData", dataInDay);
      // console.log("resData", dataInDay.length);

      const queryOneBeforeDay = {
        IdDevice: deviceId,
        Time: { $lt: startOfDayCurrent },
      };
      const dataBeforeDay = await ElectricsModel.findOne(queryOneBeforeDay)
        .sort({ Time: -1 })
        .lean()
        .exec();

      const hourIntervals: Date[] = [];
      let currentHourInterval = new Date(startOfDayCurrent);

      while (currentHourInterval <= endOfDayCurrent) {
        hourIntervals.push(new Date(currentHourInterval));
        currentHourInterval.setHours(currentHourInterval.getHours() + 1);
      }

      // Kiểm tra và thêm dữ liệu hoặc null vào mảng
      const dataWithNulls = hourIntervals.map((interval) => {
        const query = {
          IdDevice: deviceId,
          Time: { $gte: interval, $lt: new Date(interval.getTime() + 3600000) }, // 3600000 milliseconds = 1 hour
        };

        // Sắp xếp dataInDay theo thứ tự giảm dần của thời gian
        const sortedData = dataInDay.sort(
          (a, b) => new Date(b.Time).getTime() - new Date(a.Time).getTime()
        );

        // Tìm kiếm đối tượng dữ liệu đầu tiên trong khoảng thời gian
        const data = sortedData.find(
          (item) =>
            interval.getTime() <= new Date(item.Time).getTime() &&
            new Date(item.Time).getTime() < interval.getTime() + 3600000
        );

        return data || null;
      });

      // console.log('Data with nulls:', dataWithNulls);

      const kWhData = [];
      let lastValue = 0;
      let activePowerPerHour = [];
      let electricPerHour = [];
      let totalkWhDay = -1;

      if (dataBeforeDay !== null) {
        lastValue = dataBeforeDay.Total_kWh;
      } else {
        lastValue = 0;
      }

      activePowerPerHour = dataWithNulls.map((item) =>
        item !== null ? item.Active_Power : null
      );
      electricPerHour = dataWithNulls.map((item) =>
        item !== null ? item.Current : null
      );

      const kWhArr = dataWithNulls.map((item) =>
        item !== null ? item.Total_kWh : null
      );
      for (let i = 0; i < kWhArr.length; i++) {
        if (kWhArr[i] === null) {
          kWhData.push(null);
        } else {
          let result = kWhArr[i] - lastValue;
          // Trường hợp thay đồng hồ khác có chỉ số nhỏ hơn chỉ số cũ, nếu ngày đó thay đồng hồ thì chấp nhận mất dữ liệu của ngày đó
          if (result < 0) {
            kWhData.push(null);
            lastValue = kWhArr[i];
          } else {
            kWhData.push(result);
            lastValue = kWhArr[i];
          }
        }
      }

      totalkWhDay = kWhData.reduce((acc, curr) => acc + curr, 0);

      const resultData = {
        totalkWhDay: totalkWhDay,
        kWhData: kWhData,
        dataBeforeDay: dataBeforeDay,
        dataInDay: dataWithNulls,
        activePowerPerHour: activePowerPerHour,
        electricPerHour: electricPerHour,
      };
      return HttpResponse.returnSuccessResponse(res, resultData);
    } catch (e) {
      next(e);
    }
  }

  static async getCurrentMonDataPerDay(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    const { electrics: ElectricsModel } = global.mongoModel;

    const deviceId = req.params.id;
    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);

    // console.log("deviceId", deviceId);
    // console.log("year", year);
    // console.log("month", month);
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: "Invalid year or month input." });
    }

    // Format the month with a leading zero if it's a single digit
    const formattedMonth = month < 10 ? `0${month}` : month;

    const startOfMonth = new Date(`${year}-${formattedMonth}-01T00:00:00Z`);
    const endOfMonth = new Date(
      new Date(startOfMonth).setMonth(startOfMonth.getMonth() + 1) - 1
    );

    const resultArray = []; // Array to store query results

    try {
      for (
        let currentDay = new Date(startOfMonth);
        currentDay <= endOfMonth;
        currentDay.setDate(currentDay.getDate() + 1)
      ) {
        const startOfDay = new Date(currentDay);
        const endOfDay = new Date(currentDay);
        endOfDay.setHours(30, 59, 59);

        // console.log("startOfDay", startOfDay);
        // console.log("endOfDay", endOfDay);

        const query = {
          IdDevice: deviceId,
          Time: { $gte: startOfDay, $lt: endOfDay },
        };

        const dataInMon = await ElectricsModel.findOne(query)
          .sort({ Time: -1 })
          .lean()
          .exec();

        // console.log("dataInMon", dataInMon);
        resultArray.push(dataInMon !== null ? dataInMon : null);
      }

      const queryOneBeforeMon = {
        IdDevice: deviceId,
        Time: { $lt: startOfMonth },
      };

      let dataBeforeMon = await ElectricsModel.findOne(queryOneBeforeMon)
        .sort({ Time: -1 })
        .lean()
        .exec();
      // console.log("dataBeforeMon", dataBeforeMon);

      const kWhData = [];
      let lastValue = 0;
      let totalkWhMon = -1;

      if (dataBeforeMon !== null) {
        lastValue = dataBeforeMon.Total_kWh;
      } else {
        lastValue = 0;
      }

      const kWhArr = resultArray.map((item) =>
        item !== null ? item.Total_kWh : null
      );
      for (let i = 0; i < kWhArr.length; i++) {
        if (kWhArr[i] === null) {
          kWhData.push(null);
        } else {
          let result = kWhArr[i] - lastValue;
          // Trường hợp thay đồng hồ khác có chỉ số nhỏ hơn chỉ số cũ, nếu ngày đó thay đồng hồ thì chấp nhận mất dữ liệu của ngày đó
          if (result < 0) {
            kWhData.push(null);
            lastValue = kWhArr[i];
          } else {
            kWhData.push(result);
            lastValue = kWhArr[i];
          }
        }
      }

      totalkWhMon = kWhData.reduce((acc, curr) => acc + curr, 0);

      const resultData = {
        totalkWhMon: totalkWhMon,
        dataBeforeMon: dataBeforeMon,
        kWhData: kWhData,
        dataInMon: resultArray,
      };
      return HttpResponse.returnSuccessResponse(res, resultData);
    } catch (e) {
      next(e);
    }
  }
  static async getCurrentMonDataPerDayV2(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const jobId = req.params.id;
      const { room: roomModel, job: jobModel } = global.mongoModel;

      const jobData = await jobModel.findOne({_id: jobId}).lean().exec();

      const roomId = jobData.room;
      const checkInDay = jobData.checkInTime;

      const checkInYear: string = moment(checkInDay).format("YYYY");
      const checkInMonth: string = moment(checkInDay).format("MM");
      let start: string = '';
      const end: string = moment().format("YYYY-MM-DD");
      if (checkInYear === moment().format("YYYY") && checkInMonth === moment().format("YY")) {
        start = moment(checkInDay).format("YYYY-MM-DD");
      }
      start = moment().startOf("month").format("YYYY-MM-DD");

      const totalkWhTime = await EnergyController.calculateElectricUsedDayToDay(
        roomId,
        start,
        end
      );

      console.log({totalkWhTime});

      return HttpResponse.returnSuccessResponse(res, totalkWhTime);

    } catch (error) {
      next(error);
    }
  }

  //get all data of all devices by year and month
  static async getAllDataByYearMonth(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const { electrics: ElectricsModel, motelRoom: motelRoomModel, floor: floorModel, room: roomModel } = global.mongoModel;
  
      const year: number = parseInt(req.params.year, 10);
      const month: number = parseInt(req.params.month, 10);
      const motelId: string = req.params.motelId;
  
      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return res.status(400).json({ error: "Invalid year or month input." });
      }
  
      const formattedMonth = month < 10 ? `0${month}` : month;
  
      const startOfMonth = moment(`${year}-${formattedMonth}-01T00:00:00`).startOf('month');
      const endOfMonth = moment(startOfMonth).endOf('month');
  
      const motelData = await motelRoomModel.findOne({ _id: motelId }).lean().exec();
      if (!motelData) {
        return res.status(404).json({ error: "Motel not found." });
      }
  
      const floors = motelData.floors;
      if (!floors) {
        return res.status(404).json({ error: "Floors not found." });
      }
  
      const floorData = await floorModel.find({ _id: { $in: floors } }).lean().exec();
      if (!floorData) {
        return res.status(404).json({ error: "Floor not found." });
      } else {
        const resultArray = [];
        for (const floor of floorData) {
          const rooms = await roomModel.find({ _id: { $in: floor.rooms } }).lean().exec();
          for (const room of rooms) {
            const roomData = await roomModel.findOne({ _id: room._id }).lean().exec();
            let electricMeterValues = [];
            let electricData = [];
            if (roomData.listIdElectricMetter && roomData.listIdElectricMetter.length > 0) {
              roomData.listIdElectricMetter.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

              const electricMeterValues = roomData.listIdElectricMetter.map(meter => meter.value);
              console.log("Check id: ", electricMeterValues);
              
              electricData = await this.getElectricV2(
                startOfMonth,
                endOfMonth,
                electricMeterValues,
                'Total kWh',
                'MONTH',
                1,
                'MAX'
              );

              console.log({electricData});
            }
  
            // Thêm thông tin phòng và dữ liệu điện vào mảng kết quả
            resultArray.push({
              roomId: roomData._id,
              roomName: roomData.name,
              electricMeterValues: electricMeterValues,
              electricData: electricData
            });
          }
        }
        return res.json(resultArray);
      }
    } catch (error) {
      next(error);
    }
  }

  static async getAllDataByYearMonthV2(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    const { 
      motelRoom: motelRoomModel,
      room: roomModel,
     } = global.mongoModel;

    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);
    const motelId = req.params.motelId;

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: "Invalid year or month input." });
    }

    const formattedMonth = month < 10 ? `0${month}` : month;

    const startOfMonth = moment(`${year}-${formattedMonth}`).startOf("month").format("YYYY-MM-DD");
    const endOfMonth = moment(`${year}-${formattedMonth}`).endOf("month").format("YYYY-MM-DD")

    console.log({startOfMonth})
    console.log({endOfMonth})
    const resultArray = [];
    let simplifiedRoomData = [];
    let latestDataBeforeMonth= null;

    try {
      const motelData = await motelRoomModel.findOne({
        _id: motelId
      }).populate("floors").lean().exec();
      console.log("tới 1")

      if(!motelData) {
        return HttpResponse.returnSuccessResponse(res, []);
      }
      console.log("tới 2")
      if(!motelData.floors) {
        return HttpResponse.returnSuccessResponse(res, []);
      }
      console.log("tới 3")
      if(motelData.floors.length === 0) {
        return HttpResponse.returnSuccessResponse(res, []);
      }
      console.log("tới 4")
      function getLastNonNullValue(arr) {
        for (let i = arr.length - 1; i >= 0; i--) {
          if (arr[i] !== null) {
            return arr[i];
          }
        }
        return null;
      }

      for(let i = 0; i < motelData.floors.length; i++) {
        if(motelData.floors[i].rooms) {
          if(motelData.floors[i].rooms.length > 0) {
            for(let j = 0; j < motelData.floors[i].rooms.length; j++) {
              let roomData = await roomModel.findOne({_id: motelData.floors[i].rooms[j]}).lean().exec();
              if(!roomData) {
                continue;
              }
              if(!roomData.listIdElectricMetter) {
                continue;
              }
              if(roomData.listIdElectricMetter.length === 0) {
                continue;
              }
              const tempStart = moment(startOfMonth).subtract(1, "days").startOf("month");
              const tempEnd = moment(startOfMonth).subtract(1, "days").endOf("month");
              // const result = await checkRangeTimeForIdMetter(roomData.listIdElectricMetter, tempStart, tempEnd);
              // if(result) {
              //   if(result.length > 0){
                  
              //   }
              // }
              const dataCountOneMonthBefore = await EnergyController.getElectricV2(
                tempStart,
                tempEnd,
                // result[result.length - 1].value,
                roomData.listIdElectricMetter[0].value,
                'Total kWh',
                'MONTH',
                1,
                'MAX',
              );

              if(dataCountOneMonthBefore) {
                if(dataCountOneMonthBefore.length > 0) {
                  latestDataBeforeMonth = dataCountOneMonthBefore[0].value;
                }
              }
              let data = await EnergyController.getElectricV2(
                moment(startOfMonth).startOf("day"),
                moment(endOfMonth).endOf("day"),
                // result[result.length - 1].value,
                roomData.listIdElectricMetter[0].value,
                'Total kWh',
                'MONTH',
                1,
                'MAX',
              );
              // let data = await EnergyController.calculateElectricUsedDayToDayHaveLabelTime(roomData._id, startOfMonth, endOfMonth);
              if(data.length !== 0) {
                // let latestDataCurrentMonth = getLastNonNullValue(data.kWhData)
                // let dataEnd = {
                //   latestDataCurrentMonth: latestDataCurrentMonth,
                //   latestDataBeforeMonth : latestDataBeforeMonth,
                // }
                roomData.latestDataCurrentMonth = data[0].value;
                roomData.latestDataBeforeMonth = latestDataBeforeMonth;
                roomData.idTemp = roomData.listIdElectricMetter[0].value;
                roomData.start = startOfMonth;
                roomData.end = endOfMonth;
                roomData.tempStart = tempStart.format("YYYY-MM-DD");
                roomData.tempEnd = tempEnd.format("YYYY-MM-DD");

                const simplifiedRoomData = {
                  name: roomData.name,
                  latestDataCurrentMonth: data[0].value,
                  latestDataBeforeMonth: latestDataBeforeMonth,
                  idTemp: roomData.listIdElectricMetter[0].value,
                  start: startOfMonth,
                  end: endOfMonth,
                  tempStart: tempStart.format("YYYY-MM-DD"),
                  tempEnd: tempEnd.format("YYYY-MM-DD")
                };
                
                console.log({simplifiedRoomData});
                
              
              // Thêm simplifiedRoomData vào resultArray
              resultArray.push(simplifiedRoomData);
                // resultArray.push(roomData);
              }
            }
          }
        }
        
      }
      console.log("tới 5")
      console.log({resultArray})

      return HttpResponse.returnSuccessResponse(res, resultArray);
    } catch (e) {
      next(e);
    }
  }


  static async getAllDataByYearMonthV3(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    const { 
      motelRoom: motelRoomModel,
      room: roomModel,
     } = global.mongoModel;

    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);
    const motelId = req.params.motelId;

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: "Invalid year or month input." });
    }

    const formattedMonth = month < 10 ? `0${month}` : month;

    const startOfMonth = moment(`${year}-${formattedMonth}`).startOf("month");
    const endOfMonth = moment(`${year}-${formattedMonth}`).endOf("month");

    const startBeforeMonth = moment(startOfMonth).subtract(1, "days").startOf("month");
    const endBeforeMonth = moment(startOfMonth).subtract(1, "days").endOf("month");

    const resultArray = [];
    let latestDataBeforeMonth= null;
    let latestDataCurrentMonth= null;
    let totalKwhCurrentMonth = null;

    try {
      const motelData = await motelRoomModel.findOne({
        _id: motelId
      }).populate("floors").lean().exec();
      console.log("tới 1")

      if(!motelData) {
        return HttpResponse.returnSuccessResponse(res, []);
      }
      console.log("tới 2")
      if(!motelData.floors) {
        return HttpResponse.returnSuccessResponse(res, []);
      }
      console.log("tới 3")
      if(motelData.floors.length === 0) {
        return HttpResponse.returnSuccessResponse(res, []);
      }
      console.log("tới 4")

      for(let i = 0; i < motelData.floors.length; i++) {
        if(motelData.floors[i].rooms) {
          if(motelData.floors[i].rooms.length > 0) {
            for(let j = 0; j < motelData.floors[i].rooms.length; j++) {
              let roomData = await roomModel.findOne({_id: motelData.floors[i].rooms[j]}).lean().exec();
              if(!roomData) {
                continue;
              }
              if(!roomData.listIdElectricMetter) {
                continue;
              }
              if(roomData.listIdElectricMetter.length === 0) {
                continue;
              }

              latestDataCurrentMonth = await getLatestEnergyDataDayToDayInMonth(roomData.listIdElectricMetter, startOfMonth, endOfMonth);
              latestDataBeforeMonth = await getLatestEnergyDataDayToDayInMonth(roomData.listIdElectricMetter, startBeforeMonth, endBeforeMonth);
              totalKwhCurrentMonth = await EnergyController.calculateElectricUsedDayToDay(roomData._id, startOfMonth.format("YYYY-MM-DD"), endOfMonth.format("YYYY-MM-DD"));
              const listIdMeter = await checkRangeTimeForIdMetter(roomData.listIdElectricMetter, startOfMonth, endOfMonth);

              if(latestDataBeforeMonth === null) {
                latestDataBeforeMonth = await getLatestEnergyDataDayToDayStartOfMonth(roomData.listIdElectricMetter, startOfMonth, endOfMonth);
              }

              const simplifiedRoomData = {
                name: roomData.name,
                totalKwhCurrentMonth: totalKwhCurrentMonth,
                latestDataCurrentMonth: latestDataCurrentMonth,
                latestDataBeforeMonth: latestDataBeforeMonth,
                idTemp: roomData.listIdElectricMetter[0].value,
                start: startOfMonth,
                end: endOfMonth,
                tempStart: startBeforeMonth,tempEnd: endBeforeMonth,
                numberOfMeter: listIdMeter.length,
              };
              resultArray.push(simplifiedRoomData);
            }
          }
        }
        
      }
      console.log("tới 5");
      return HttpResponse.returnSuccessResponse(res, resultArray);
    } catch (e) {
      next(e);
    }
  }
  
  
  
  
  

  //get last records of all devices from the previous month
  static async getLastRecordsOfPreviousMonth(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    const { electrics: ElectricsModel } = global.mongoModel;

    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: "Invalid year or month input." });
    }

    // Calculate the month before the specified month
    const previousMonth = month === 1 ? 12 : month - 1;
    const previousYear = month === 1 ? year - 1 : year;

    const formattedPreviousMonth =
      previousMonth < 10 ? `0${previousMonth}` : previousMonth;

    const startOfPreviousMonth = new Date(
      `${previousYear}-${formattedPreviousMonth}-01T00:00:00Z`
    );
    const endOfPreviousMonth = new Date(
      new Date(startOfPreviousMonth).setMonth(
        startOfPreviousMonth.getMonth() + 2
      ) - 1
    );

    const resultArray = [];

    try {
      // Iterate over devices
      const allDevices = await ElectricsModel.distinct("IdDevice");
      for (const deviceId of allDevices) {
        const query = {
          IdDevice: deviceId,
          Time: { $gte: startOfPreviousMonth, $lt: endOfPreviousMonth },
        };

        const dataInPreviousMonth = await ElectricsModel.findOne(query)
          .sort({ Time: -1 })
          .lean()
          .exec();

        resultArray.push(
          dataInPreviousMonth !== null ? dataInPreviousMonth : null
        );
      }

      const resultData = {
        dataInPreviousMonth: resultArray,
      };
      return res.status(200).json(resultData);
    } catch (e) {
      next(e);
    }
  }

  static async latestData(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    const id = req.params.id;
    const { electrics: ElectricsModel } = global.mongoModel;

    console.log("id", id);
    try {
      const currentDay = new Date();
      currentDay.setHours(currentDay.getHours() + 7);
      // console.log("currentDay", currentDay);
      const query = {
        IdDevice: id,
        Time: { $lt: currentDay },
      };

      const data = await ElectricsModel.findOne(query)
        .sort({ Time: -1 })
        .lean()
        .exec();
      const resultData = data;
      console.log("resultData", resultData);
      return HttpResponse.returnSuccessResponse(res, resultData);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /v1/homeKey/energy/device/backUpData/{startTime}/{endTime}:
   *   get:
   *     description: Back up data per day
   *     tags: [Energy/Device]
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: startTime
   *         in: path
   *         required: true
   *         type: string
   *         description: Start time
   *       - name: endTime
   *         in: path
   *         required: true
   *         type: string
   *         description: End time
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
  static async backUpDataPerDay(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    let startTime = req.params.startTime;
    const lastStartDay = new Date(startTime);
    startTime = startTime.slice(0, -1);

    let endTime = req.params.endTime;
    const lastEndDay = new Date(endTime);
    lastEndDay.setDate(lastEndDay.getDate() + 1);
    endTime = endTime.slice(0, -1);

    // CHÚ Ý: CHƯA SET NGÀY TRƯỚC ĐÓ KHÔNG CÓ DỮ LIỆU, ĐỢI CÓ DB THÌ DỄ SORT HƠN
    try {
      const { electrics: ElectricsModel } = global.mongoModel;
      const urlDevices = `${env().homelandsBaseUrl}/v1/devices`;
      const resListDevice: AxiosResponse = await axios.get(urlDevices);

      const countDevice = resListDevice.data.length;

      // dic chưa id và name
      const idNameDict: { [key: number]: string } = {};
      for (const item of resListDevice.data) {
        const id = item.Id;
        const name = item.Name;
        idNameDict[id] = name;
      }

      interface DataEntry {
        Time: string;
        Total_kWh: number;

      }

      // // LẤY MỖI GIỜ 1 LẦN
      function getLastObjectPerHour(data: DataEntry[]): (DataEntry | null)[] {
        const lastObjectPerHour: { [key: number]: DataEntry } = {};

        for (const entry of data) {
          // Chuyển đổi chuỗi thời gian thành đối tượng Date
          const time = new Date(entry.Time);

          // Lấy giờ từ đối tượng Date
          const hour = time.getHours();

          // Nếu đối tượng không tồn tại hoặc là đối tượng cuối cùng của giờ hiện tại
          if (
            !lastObjectPerHour[hour] ||
            time > new Date(lastObjectPerHour[hour].Time)
          ) {
            lastObjectPerHour[hour] = entry;
          }
        }

        // Chuyển đổi dictionary thành mảng
        const result: (DataEntry | null)[] = Array.from(
          { length: 24 },
          (_, hour) => lastObjectPerHour[hour] || null
        );

        return result;
      }

      const tempDay = lastStartDay;

      while (tempDay < lastEndDay) {
        let yearQuery = tempDay.getFullYear();
        let dayQuery = "";
        if (tempDay.getDate() < 10) {
          dayQuery = "0" + tempDay.getDate();
        } else {
          dayQuery = tempDay.getDate().toString();
        }
        let monQuery = "";
        if (tempDay.getMonth() < 10) {
          monQuery = "0" + (tempDay.getMonth() + 1);
        } else {
          monQuery = (tempDay.getMonth() + 1).toString();
        }

        tempDay.setDate(tempDay.getDate() + 1);

        const dataDayAllDeivceList = [];
        for (let i = 0; i < countDevice; i++) {
          const urlData = `${env().homelandsBaseUrl}/v1/devices/${resListDevice.data[i].Id
            }/data?from_time=${yearQuery}-${monQuery}-${dayQuery}T00:00:00.000&to_time=${yearQuery}-${monQuery}-${dayQuery}T23:59:59.999&limit=100&page=1`;
          const resData: AxiosResponse = await axios.get(urlData);

          const dataGetList = resData.data.Records;

          const dataPerHourList: (DataEntry | null)[] = getLastObjectPerHour(
            dataGetList
          );

          dataDayAllDeivceList.push(dataPerHourList);

          console.log("DÂy", i);
        }

        const tempList: any[][] = dataDayAllDeivceList;
        //hạ cấp mảng
        const dataDayAllDeivceListFlat: any[] = tempList.reduce(
          (acc, curr) => acc.concat(curr.filter((item) => item !== null)),
          []
        );

        // sắp xếp theo thời gian tăng dần
        dataDayAllDeivceListFlat.sort((a, b) => {
          const timeA = new Date(a.Time).getTime();
          const timeB = new Date(b.Time).getTime();
          return timeA - timeB;
        });

        if (dataDayAllDeivceListFlat.length !== 0) {
          let dataGetLength = dataDayAllDeivceListFlat.length;
          let dataGet = dataDayAllDeivceListFlat;

          //backup
          for (let i = 0; i < dataGetLength; i++) {
            let originTime = new Date(dataGet[i].Time);
            originTime.setHours(originTime.getHours() + 7);
            // console.log("originTime", originTime);
            const electricData = await ElectricsModel.create({
              IdDevice: dataGet[i].DeviceId,
              NameRoom: idNameDict[dataGet[i].DeviceId],
              Time: originTime,
              Total_kWh: dataGet[i].Value.Total_kWh,
              Export_kWh: dataGet[i].Value.Export_kWh,
              Import_kWh: dataGet[i].Value.Import_kWh,
              Voltage: dataGet[i].Value.Voltage,
              Current: dataGet[i].Value.Current,
              Active_Power: dataGet[i].Value.Active_Power,
              Reactive_Power: dataGet[i].Value.Reactive_Power,
              Power_Factor: dataGet[i].Value.Power_Factor,
              Frequency: dataGet[i].Value.Frequency,
            });
          }
        }
      }

      //   const url2 = `http://homeland-2.ddns.net:8005/api/v1/devices/${deviceId}/lastedtotime?to_time=${currentDayString}T00:00:00.000`;
      //   const res2: AxiosResponse = await axios.get(url2);
      //   const lastDataBeforeDay = res2.data;

      const resultData = "backupSuccess";
      return HttpResponse.returnSuccessResponse(res, resultData);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * definitions:
   *   ClearData:
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
   * /v1/homeKey/energy/devices/clearData/{startTime}/{endTime}:
   *   post:
   *     description: Clear energy between start time and end time
   *     tags: [Energy/Device]
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: startTime
   *         in: path
   *         required: true
   *         type: string
   *         description: Start time
   *       - name: endTime
   *         in: path
   *         required: true
   *         type: string
   *         description: End time
   *       - in: body
   *         name: body
   *         description: Request body
   *         schema:
   *           $ref: '#definitions/ClearData'
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

  static async clearData(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    // input: 2024-01-24/2024-01-24: không cần giờ
    let startTime = req.params.startTime;
    let endTime = req.params.endTime;
    // Get user credentials
    const userInfoReq = req.body as { email: ""; password: "" };
    console.log({ startTime, endTime, userInfoReq });

    const lastStartDay = new Date(startTime);
    const lastEndDay = new Date(endTime);
    lastEndDay.setHours(30, 59, 59, 999);
    console.log({ lastStartDay, lastEndDay });

    const { electrics: ElectricsModel, user: UserModel } = global.mongoModel;
    try {
      // Validate userinfo
      const userDB = await UserModel.findOne({
        email: userInfoReq.email,
      })
        .lean()
        .exec();
      if (!userDB)
        return HttpResponse.returnBadRequestResponse(res, [
          "Email or password is not valid",
        ]);

      // Check if matched password
      const isMatch: boolean = await UserModel.validatePassword(
        userInfoReq.password,
        userDB.password
      );

      if (isMatch) {
        // Setup query
        const query = {
          Time: { $gte: lastStartDay, $lt: lastEndDay },
        };
        const data = await ElectricsModel.deleteMany(query);

        return HttpResponse.returnSuccessResponse(res, {
          message: "Clear energy successful",
        });
      }
      return HttpResponse.returnBadRequestResponse(res, [
        "Password is not match",
      ]);
    } catch (e) {
      next(e);
    }
  }

  static async getNameRoomById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    let idDevice = req.params.id;
    try {
      const url = "${env().homelandsBaseUrl}/v1/devices/";
      const res2: AxiosResponse = await axios.get(url);
      const listDevice = res2.data;
      const room = listDevice.find((item) => item.Id == idDevice);
      const roomName = room ? room.Name : null;

      const resultData = {
        idDevice: idDevice,
        roomName: roomName,
      };
      return HttpResponse.returnSuccessResponse(res, resultData);
    } catch (e) {
      next(e);
    }
  }

  // get data from time to time;
  /**
   * @swagger
   * /v1/homeKey/energy/device/getDataPerDayTimeToTime/{id}/{startTime}/{endTime}:
   *   get:
   *     description: Get data from time to time
   *     tags: [Energy/Device]
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         type: string
   *         description: id
   *       - name: startTime
   *         in: path
   *         required: true
   *         type: string
   *         description: start time
   *       - name: endTime
   *         in: path
   *         required: true
   *         type: string
   *         description: End time
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

  static async getDataTimeToTime(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    let id = req.params.id;

    // input: 2024-01-24/2024-01-24: không cần giờ
    let startTime = req.params.startTime;
    console.log("startTime", startTime);

    const lastStartDay = new Date(startTime);
    console.log("lastStartDay", lastStartDay);

    let endTime = req.params.endTime;
    console.log("endTime", endTime);
    const lastEndDay = new Date(endTime);
    lastEndDay.setHours(30, 59, 59, 999);

    console.log("lastEndDay", lastEndDay);

    console.log("Kết quả phép so sánh:", lastStartDay < lastEndDay);

    const { electrics: ElectricsModel } = global.mongoModel;

    try {
      if (lastStartDay > lastEndDay) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Thời gian bắt đầu lớn hơn thời gian kết thúc"
        );
      }
      const datesInRange: Date[] = [];
      let currentDate = new Date(lastStartDay);

      while (currentDate <= lastEndDay) {
        datesInRange.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const resultData = [];
      for (const date of datesInRange) {
        console.log("date", date);
        const endOfDay = new Date(date);
        console.log("endOfDay", endOfDay);
        endOfDay.setHours(30, 59, 59, 999);
        console.log("endOfDay", endOfDay);

        const query = {
          IdDevice: id,
          Time: {
            $gte: date,
            $lte: endOfDay,
          },
        };

        const result = await ElectricsModel.findOne(query)
          .sort({ Time: -1 })
          .lean()
          .exec();
        resultData.push(result);
        console.log(
          `Dữ liệu ${id} vào cuối ngày ${date.toISOString()}:`,
          result
        );
      }

      const totalKwhPerDay = resultData.map((item) =>
        item !== null ? item.Total_kWh : null
      );

      const labelTime: (string | null)[] = resultData.map((item) => {
        if (item !== null) {
          const date = new Date(item.Time);
          console.log("date", date);
          const formattedDate = date.toISOString().split("T")[0];
          return formattedDate;
        } else {
          return null;
        }
      });

      // const labelTime = [];
      console.log("labelTime", labelTime);

      const query = {
        IdDevice: id,
        Time: {
          $lte: lastStartDay,
        },
      };

      const dataBefore = await ElectricsModel.findOne(query)
        .sort({ Time: -1 })
        .lean()
        .exec();

      let kWhData = [];
      let lastValue = 0;
      if (dataBefore !== null) {
        lastValue = dataBefore.Total_kWh;
      }

      // const kWhArr = totalKwhPerDay.map(item => (item !== null ? item.Total_kWh : null));

      for (let i = 0; i < totalKwhPerDay.length; i++) {
        if (totalKwhPerDay[i] === null) {
          kWhData.push(null);
        } else {
          let result = totalKwhPerDay[i] - lastValue;
          // Trường hợp thay đồng hồ khác có chỉ số nhỏ hơn chỉ số cũ, nếu ngày đó thay đồng hồ thì chấp nhận mất dữ liệu của ngày đó
          if (result < 0) {
            kWhData.push(null);
            lastValue = totalKwhPerDay[i];
          } else {
            kWhData.push(result);
            lastValue = totalKwhPerDay[i];
          }
        }
      }

      const totalkWhTime = kWhData.reduce((acc, curr) => acc + curr, 0);

      const data = {
        totalkWhTime: totalkWhTime,
        labelTime: labelTime,
        kWhData: kWhData,
        totalKwhPerDay: totalKwhPerDay,
        dataBefore: dataBefore,
        rawData: resultData,
      };

      return HttpResponse.returnSuccessResponse(res, data);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /v1/homeKey/energy/device/historyDataPerMon/{id}:
   *   get:
   *     description: histortyDataEnergyPerMon
   *     tags: [Energy/Device]
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         type: string
   *         description: id
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

  static async historyDataEnergyPerMon(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    const id = req.params.id;
    console.log("id", id);
    

    const {
      historyEnergy: HistoryEnergyModel,
      room: RoomModel,
    } = global.mongoModel;

    try {
      // console.log("id", id);

      const room = await RoomModel.findOne({ _id: id, isDeleted: false })
        .lean()
        .exec();

      // console.log("room", room);

      let preHistory = [];

      if (room.idElectricMetter) {
        let idMetter: number = parseInt(room.idElectricMetter);
        // console.log("room.idElectricMetter", typeof(idMetter));
        // console.log("room.idElectricMetter", idMetter);
        preHistory = await HistoryEnergyModel.find({ IdDevice: idMetter })
          .lean()
          .exec();
      } else {
        preHistory = [];
      }

      let data = [];
      if (preHistory.length !== 0) {
        data = preHistory.map((item) => ({
          ...item,
          // FromTime: item.FromTime.getDate() + '/' + (item.FromTime.getMonth() + 1) + '/' + item.FromTime.getFullYear(),
          // ToTime: item.ToTime.getDate() + '/' + (item.ToTime.getMonth() + 1) + '/' + item.ToTime.getFullYear(),
        }));
      }

      return HttpResponse.returnSuccessResponse(res, data);
    } catch (e) {
      next(e);
    }
  }

  static async exportBillRoom(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    const idMotel = req.params.idMotel;
    const idRoom = req.params.idRoom;
    const startTime = req.params.startTime;
    const endTime = req.params.endTime;

    // const startTimeQuery = new Date(startTime);
    // const endTimeQuery = new Date(endTime);
    // endTimeQuery.setHours(30, 59, 59, 59);

    const startTimeQuery: string = moment(startTime).format("YYYY-MM-DD");
    const endTimeQuery: string = moment(endTime).format("YYYY-MM-DD");

    let dataEnergy: {
      totalkWhTime: number;
      labelTime: (string | null)[];
      kWhData: (number | null)[];
      totalKwhPerDay: (number | null)[];
      dataBefore: any;
      rawData: any[];
    };

    const resIdMotel: string = "65d426786415bc4a8ced1adf";
    const resIdRoom: string = "65d426776415bc4a8ced1adc";
    const resIdRoom2: string = "65d426776415bc4a8ced1add";
    const resIdRoom3: string = "65d426756415bc4a8ced1ac6"; // no id metter

    const getRandomInt = (min, max) =>
      Math.floor(Math.random() * (max - min)) + min;
      const getRandomString = (length, base) => {
      let result = "";
      const baseLength = base.length;

      // eslint-disable-next-line no-plusplus
      for (let i = 0; i < length; i++) {
        const randomIndex = getRandomInt(0, baseLength);
        result += base[randomIndex];
      }

      return result;
    };

    const getRandomHex2 = () => {
      const baseString =
        "0123456789QƯERTYUIOPASDFGHJKLZXCVBNMqưertyuiopasdfghjklzxcvbnm";
      const ma = `${getRandomString(6, baseString)}`;
      return ma;
    };

    const {
      motelRoom: motelRoomModel,
      room: roomModel,
      address: addressModel,
      user: userModel,
      banking: BankingModel,
      job: jobModel,
    } = global.mongoModel;

    try {
      const motelInfor = await motelRoomModel
        .findOne({ _id: idMotel })
        .lean()
        .exec();

      const nameMotel = motelInfor.name;
      const idAddress = motelInfor.address;

      const motelOwner = await userModel
        .findOne({ _id: motelInfor.owner })
        .lean()
        .exec();

      const emailOwner = motelOwner.email;
      const phoneOwner =
        motelOwner.phoneNumber.countryCode + motelOwner.phoneNumber.number;
      const addressOwner = motelOwner.address;

      const banking = await BankingModel.findOne({ user: motelInfor.owner })
        .lean()
        .exec();

      // console.log(motelInfor.address);
      const motelAddress = await addressModel
        .findOne({ _id: idAddress })
        .lean()
        .exec();

      const addressMotel = motelAddress.address;

      const roomInfor = await roomModel
        .findOne({ _id: idRoom })
        .lean()
        .exec();

      const nameRoom = roomInfor.name;

      //Thông số
      const expenseRoom: string = "Chi Phí Phòng";
      const expenseElectricity: string = "Chi Phí Điện";
      const expenseWater: string = "Chi Phí Nước";
      const expenseGarbage: string = "Phí Dịch Vụ";
      const expenseWifi: string = "Chi Phí Xe";
      const expenseOther: string = "Tiện Ích Khác";

      const unitPriceRoom = roomInfor.price;
      const unitPriceElectricity = roomInfor.electricityPrice;
      const unitPriceWater = roomInfor.waterPrice;
      const unitPriceGarbage = roomInfor.garbagePrice;
      const unitPriceWifi = roomInfor.wifiPrice;
      const unitPriceOther = 0;

      const typeRoom: number = 1;
      // const typeElectricity: number = roomInfor.electricityPrice; // PHÍA DƯỚI
      const typeWater: number = roomInfor.person;
      const typeGarbage: number = 1;
      const typeWifi: number = roomInfor.vihicle;
      const typeOther = 0;

      let typeElectricity: number = 0;

      const timeExport = new Date();
      timeExport.setHours(timeExport.getHours() + 7);
      const parsedTime = moment(timeExport).format("DD/MM/YYYY");

      const expireTime = moment(new Date(endTime)).format("DD/MM/YYYY");

      let json = {};

      if (roomInfor.rentedBy) {
        console.log("Phòng đã thuê", roomInfor.rentedBy);
        const userId = roomInfor.rentedBy;
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

        if(roomInfor.listIdElectricMetter) {
          if (roomInfor.listIdElectricMetter.length !== 0) {
            const jobData = await jobModel.findOne({
              room: roomInfor._id,
              isDeleted: false,
              isActived: true,
            }).lean().exec();

            if (!jobData) {
              const data = "No data in this time";
              return HttpResponse.returnSuccessResponse(res, data);
            }
            let startTimeQueryTemp: string = startTimeQuery;
            if (moment(startTimeQuery) < moment(jobData.checkInTime)) {
              //nếu thời gian query trước thời gian checkIn
              startTimeQueryTemp = moment(jobData.checkInTime).format("YYYY-MM-DD");
            }

            console.log({startTimeQueryTemp});
            console.log({endTimeQuery});

            const resResult = await EnergyController.calculateElectricUsedDayToDayHaveLabelTime(
              roomInfor._id,
              startTimeQueryTemp,
              endTimeQuery,
            );

            console.log("resResult", resResult);

            if (resResult === null) {
              const data = "No data in this time";
              return HttpResponse.returnSuccessResponse(res, data);
            }

            typeElectricity = resResult.totalkWhTime;

            const labelTime = resResult.labelTime;
            console.log("label Time", labelTime);
            const kWhData = resResult.kWhData;

            dataEnergy = {
              totalkWhTime: resResult.totalkWhTime,
              labelTime: resResult.labelTime,
              kWhData: resResult.kWhData,
              totalKwhPerDay: null,
              dataBefore: null,
              rawData: null,
            };

            // //chuyển string -> number
            // let idElectricMetterNumber: number = +roomInfor.idElectricMetter;
  
            // // input: 2024-01-24/2024-01-24: không cần giờ
            // console.log("startTime", startTimeQuery);
            // const lastStartDay = startTimeQuery;
  
            // console.log("endTime", endTimeQuery);
            // const lastEndDay = endTimeQuery;
  
            // console.log("Kết quả phép so sánh:", lastStartDay < lastEndDay);
            // const { electrics: ElectricsModel } = global.mongoModel;
  
            // if (lastStartDay > lastEndDay) {
            //   console.log("Thời gian bắt đầu lớn hơn thời gian kết thúc");
            // } else {
            //   const datesInRange: Date[] = [];
            //   let currentDate = new Date(lastStartDay);
  
            //   while (currentDate <= lastEndDay) {
            //     datesInRange.push(new Date(currentDate));
            //     currentDate.setDate(currentDate.getDate() + 1);
            //   }
  
            //   const resultData = [];
            //   for (const date of datesInRange) {
            //     const endOfDay = new Date(date);
            //     endOfDay.setHours(30, 59, 59, 999);
  
            //     const query = {
            //       IdDevice: roomInfor.idElectricMetter,
            //       Time: {
            //         $gte: date,
            //         $lte: endOfDay,
            //       },
            //     };
  
            //     const result = await ElectricsModel.findOne(query)
            //       .sort({ Time: -1 })
            //       .lean()
            //       .exec();
            //     resultData.push(result);
            //     console.log("resultttttttttttttttttttttttttttttttttt", result);
  
            //     console.log(
            //       `Dữ liệu ${idMotel} vào cuối ngày ${date.toISOString()}:`,
            //       result
            //     );
            //   }
  
            //   const totalKwhPerDay = resultData.map((item) =>
            //     item !== null ? item.Total_kWh : null
            //   );
  
            //   const labelTime: (string | null)[] = resultData.map((item) => {
            //     if (item !== null) {
            //       const date = new Date(item.Time);
            //       console.log("date", date);
            //       const formattedDate = date.toISOString().split("T")[0];
            //       return formattedDate;
            //     } else {
            //       return null;
            //     }
            //   });
  
            //   const query = {
            //     IdDevice: roomInfor.idElectricMetter,
            //     Time: {
            //       $lte: lastStartDay,
            //     },
            //   };
  
            //   const dataBefore = await ElectricsModel.findOne(query)
            //     .sort({ Time: -1 })
            //     .lean()
            //     .exec();
  
            //   let kWhData = [];
            //   let lastValue = 0;
            //   if (dataBefore !== null) {
            //     lastValue = dataBefore.Total_kWh;
            //   }
  
            //   for (let i = 0; i < totalKwhPerDay.length; i++) {
            //     if (totalKwhPerDay[i] === null) {
            //       kWhData.push(null);
            //     } else {
            //       let result = totalKwhPerDay[i] - lastValue;
            //       // Trường hợp thay đồng hồ khác có chỉ số nhỏ hơn chỉ số cũ, nếu ngày đó thay đồng hồ thì chấp nhận mất dữ liệu của ngày đó
            //       if (result < 0) {
            //         kWhData.push(null);
            //         lastValue = totalKwhPerDay[i];
            //       } else {
            //         kWhData.push(result);
            //         lastValue = totalKwhPerDay[i];
            //       }
            //     }
            //   }
  
            //   const totalkWhTime = kWhData.reduce((acc, curr) => acc + curr, 0);
  
            //   dataEnergy = {
            //     totalkWhTime: totalkWhTime,
            //     labelTime: labelTime,
            //     kWhData: kWhData,
            //     totalKwhPerDay: totalKwhPerDay,
            //     dataBefore: dataBefore,
            //     rawData: resultData,
            //   };
            // }
            // const lastedValueElectric = await ElectricsModel.findOne({
            //   IdDevice: idElectricMetterNumber,
            //   Time: { $lt: endTimeQuery },
            // })
            //   .sort({ Time: -1 })
            //   .lean()
            //   .exec();
  
            // const beforeValueElectric = await ElectricsModel.findOne({
            //   IdDevice: idElectricMetterNumber,
            //   Time: { $lt: startTimeQuery },
            // })
            //   .sort({ Time: -1 })
            //   .lean()
            //   .exec();
  
            // //note: CẦN XEM SUY NGHĨ THÊM VỀ CÁC CASE
            // if (beforeValueElectric) {
            //   typeElectricity = parseFloat(
            //     (
            //       lastedValueElectric.Total_kWh - beforeValueElectric.Total_kWh
            //     ).toFixed(3)
            //   );
            // } else {
            //   typeElectricity = parseFloat(lastedValueElectric.toFixed(3));
            // }
          } else {
            const data = "Room no id metter";
            return HttpResponse.returnSuccessResponse(res, data);
          }
        } else {
          const data = "Room no id metter";
          return HttpResponse.returnSuccessResponse(res, data);
        }
        

        json = {
          idBill: getRandomHex2(),
          phoneOwner,
          expireTime: expireTime,
          dateBill: parsedTime,
          nameMotel: nameMotel,
          addressMotel: addressMotel,
          nameRoom: nameRoom,
          nameUser: nameUser,
          phoneUser: phoneUser,
          addressUser: addressUser,
          imgRoom: "",
          addressOwner: addressOwner,
          emailUser: emailUser,
          emailOwner: emailOwner,

          totalAll:
            unitPriceRoom +
            typeElectricity * unitPriceElectricity +
            typeWater * unitPriceWater +
            typeGarbage * unitPriceGarbage +
            typeWifi * unitPriceWifi +
            typeOther * unitPriceOther,

          totalAndTaxAll:
            unitPriceRoom +
            typeElectricity * unitPriceElectricity +
            typeWater * unitPriceWater +
            typeGarbage * unitPriceGarbage +
            typeWifi * unitPriceWifi +
            typeOther * unitPriceOther,

          totalTaxAll: 0,
          typeTaxAll: 0,
          expenseRoom: "Chi Phí Phòng",
          typeRoom: typeRoom,
          unitPriceRoom: unitPriceRoom,
          totalRoom: unitPriceRoom,
          expenseElectricity: "Chi Phí Điện",
          typeElectricity: typeElectricity,
          unitPriceElectricity: unitPriceElectricity,
          totalElectricity: typeElectricity * unitPriceElectricity,
          expenseWater: "Chi Phí Nước",
          typeWater: typeWater,
          unitPriceWater: unitPriceWater,
          totalWater: typeWater * unitPriceWater,
          expenseGarbage: "Phí Dịch Vụ",
          typeGarbage: typeGarbage,
          unitPriceGarbage: unitPriceGarbage,
          totalGarbage: typeGarbage * unitPriceGarbage,
          expenseWifi: "Chi Phí Xe",
          typeWifi: typeWifi,
          unitPriceWifi: unitPriceWifi,
          totalWifi: typeWifi * unitPriceWifi,
          expenseOther: "Tiện Ích Khác",
          typeOther: typeOther,
          unitPriceOther: unitPriceOther,
          totalOther: typeOther * unitPriceOther,
        };

        const data = "exportBillSuccess";

        const buffer = await generatePDF(json, banking, dataEnergy);

        // Export chartjs to pdf
        const configuration: ChartConfiguration = {
          type: "line",
          data: {
            labels: dataEnergy.labelTime.map((item) =>
              item ? item : "Chưa có dữ liệu"
            ),
            datasets: [
              {
                label: `Tổng số điện từ ${startTime} đến ${endTime}`,
                data: dataEnergy.kWhData,
                backgroundColor: ["rgba(255, 99, 132, 0.2)"],
                borderColor: ["rgba(255,99,132,1)"],
                borderWidth: 1,
                tension: 0.01,
                fill: false,
              },
            ],
          },
          options: {
            scales: {
              x: {
                title: {
                  display: true,
                  text: "Thời gian",
                },
              },
              y: {
                title: {
                  display: true,
                  text: "Số KwH",
                },
              },
            },
          },
          plugins: [
            {
              id: "background-colour",
              beforeDraw: (chart) => {
                const ctx = chart.ctx;
                ctx.save();
                ctx.fillStyle = "white";
                ctx.fillRect(0, 0, width, height);
                ctx.restore();
              },
            },
            {
              id: "chart-data-labels",
              afterDatasetsDraw: (chart, args, options) => {
                const { ctx } = chart;
                ctx.save();

                // Configure data labels here
                chart.data.datasets.forEach((dataset, i) => {
                  const meta = chart.getDatasetMeta(i);
                  meta.data.forEach((element, index) => {
                    const model = element;
                    const x = model.x;
                    const y = model.y;
                    const text = dataset.data[index]
                      ? (+dataset.data[index].toString()).toFixed(2)
                      : ""; // You can customize this based on your data
                    const font = "12px Arial"; // Example font setting
                    const fillStyle = "black"; // Example color setting
                    const textAlign = "center"; // Example alignment setting

                    ctx.fillStyle = fillStyle;
                    ctx.font = font;
                    ctx.textAlign = textAlign;
                    ctx.fillText(text, x, y);
                  });
                });

                ctx.restore();
              },
            },
          ],
        };
        const chartBufferPNG = await chartJSNodeCanvas.renderToBuffer(
          configuration
        );
        const mergedBuffer = await mergeBuffer(buffer, chartBufferPNG);
        console.log({ mergedBuffer: Buffer.from(mergedBuffer) });

        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: "cr7ronadol12345@gmail.com",
            pass: "wley oiaw yhpl oupy",
          },
          tls: {
            rejectUnauthorized: false,
          },
        });

        const files = ["a.txt", "b.pdf", "c.png"];
        // thay email người nhận thành : emailOwner - chủ trọ
        const mailOptions = {
          from: "cr7ronadol12345@gmail.com",
          // to: listHost[i].email,
          // to: "quyetthangmarvel@gmail.com",
          // to: emailOwner,
          to: "nguyenhuuthiet01012002@gmail.com",
          subject: `[${nameMotel} - ${nameRoom}] HÓA ĐƠN TỪ ${startTime} ĐẾN ${endTime}`,
          text: `Phòng ${nameRoom}, dãy phòng ${nameMotel} địa chỉ ${motelAddress.address}`,
          attachments: [
            {
              filename: `Invoice - ${nameMotel} - ${nameRoom} from ${startTime} to ${endTime}.pdf`,
              content: Buffer.from(mergedBuffer),
            },
          ],
        };

        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            console.error(error);
          } else {
            console.log("Email đã được gửi: " + info.response);
          }
        });
      } else {
        const data = "Empty room";
        return HttpResponse.returnSuccessResponse(res, data);
      }

      const data = "exportBillSuccess";
      return HttpResponse.returnSuccessResponse(res, data);
    } catch (e) {
      console.log({ e });
      next(e);
    }
  }

  static async exportBillRoomPendingPayByOrder(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const idOrder = req.params.id;
      console.log("UUUUUU", req['userId']);
      console.log("UUUUUU", req);

      let dataEnergy: {
        totalkWhTime: number;
        labelTime: (string | null)[];
        kWhData: (number | null)[];
        totalKwhPerDay: (number | null)[];
        dataBefore: any;
        rawData: any[];
      };

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

      const orderData = await orderModel.findOne({_id: idOrder}).lean().exec();
      console.log({orderData});

      if(!orderData) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Không tìm thấy hóa đơn!!"
        );
      }

      const jobData = await jobModel.findOne({_id: orderData.job}).lean().exec();

      if (!jobData) {
        return HttpResponse.returnUnAuthorizeResponse(
          res,
          "Hợp đồng không tồn tại"
        )
      }

      const roomData = await roomModel.findOne({_id: jobData.room}).lean().exec();
      if(!roomData) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Phòng không tồn tại"
        )
      }

      const floorData = await floorModel.findOne({rooms: roomData._id}).lean().exec();
      if(!floorData) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Lầu không tồn tại"
        )
      }

      // const nameFile = `Invoice deposit`;
      //   let fileName = `${nameFile}.pdf`;

      //   // res.setHeader("Content-Type", "application/pdf");
      //   // res.setHeader("Content-Dispsition", "attachment;filename=" + fileName);

      //   const buffer = await await getBufferOrderAllType(
      //     orderData,
      //     jobData,
      //     roomData,
      //     floorData
      //   );
      //   res.send(buffer);
      //   console.log("XXXXXXXXX")
        
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

      if(orderData.type === "monthly")  {
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
        const unitPriceWifiN = roomData.wifiPriceN; // xe
        const unitPriceOther = 0;
  
        const typeRoom: number = orderData.numberDayStay;
        const typeWater: number = roomData.person;
        const typeGarbage: string = "1";
        const typeWifi: number = roomData.vihicle;
        const typeWifiN: number = roomData.person;
        const typeOther = 0;
        let typeElectricity: number = orderData.electricNumber;
  
        const totalAll = parseInt(orderData.amount);
        const totalAndTaxAll = parseInt(orderData.amount);
        const totalRoom = parseInt(orderData.roomPrice);
        const totalWifi = parseInt(orderData.vehiclePrice);
        const totalWifiN = parseInt(orderData.wifiPrice);
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

            expenseWifiN: "Chi Phí Wifi",
            typeWifiN: typeWifiN,
            unitPriceWifiN: unitPriceWifiN,
            totalWifiN: totalWifiN,
  
            expenseOther: "Tiện Ích Khác",
            typeOther: typeOther,
            unitPriceOther: unitPriceOther,
            totalOther: typeOther * unitPriceOther,
          };
  
          const nameFile = `Invoice - ${nameMotel} - ${nameRoom} from ${moment(new Date(orderData.startTime)).format("DD-MM-YYYY")} to ${moment(new Date(orderData.endTime)).format("DD-MM-YYYY")}`;
          let fileName = `${nameFile}.pdf`;
  
          res.setHeader("Content-Type", "application/pdf");
          res.setHeader("Content-Dispsition", "attachment;filename=" + fileName);
  
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
          res.send(buffer);
        } else {
          const data = "Empty room";
          return HttpResponse.returnSuccessResponse(res, data);
        }
      } else if(orderData.type === "afterCheckInCost") {
        const bankData = {
          nameBankOwner: banking[0].nameTkLable,
          nameOwnerBankOwner: banking[0].nameTk,
          numberBankOwner: banking[0].stk,
        };
        const idBill: string = orderData.keyOrder;

        const totalAll = parseInt(orderData.amount);
        const totalAndTaxAll = parseInt(orderData.amount);

        const expireTime = moment(new Date(orderData.expireTime)).format("DD/MM/YYYY");
        const startTime = moment(new Date(orderData.createdAt)).format("DD/MM/YYYY");

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

          let json = {};

          json = {
            idBill: idBill,
            phoneOwner: phoneOwner,
            expireTime: expireTime,
            dateBill: startTime,
            startTime: startTime,
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
          };

          console.log({json});

          // const nameFile = `Invoice - ${nameMotel} - ${nameRoom} deposit`;
          const nameFile = `Invoice deposit`;
          let fileName = `${nameFile}.pdf`;

          res.setHeader("Content-Type", "application/pdf");
          res.setHeader("Content-Dispsition", "attachment;filename=" + fileName);

          const buffer = await generateOrderDepositPendingPayPDF(json, bankData);
          res.send(buffer);

        } else {
          const data = "Empty room";
          return HttpResponse.returnSuccessResponse(res, data);
        }
      } else if(orderData.type === "deposit") {
        const bankData = {
          nameBankOwner: banking[0].nameTkLable,
          nameOwnerBankOwner: banking[0].nameTk,
          numberBankOwner: banking[0].stk,
        };
        const idBill: string = orderData.keyOrder;

        const totalAll = parseInt(orderData.amount);
        const totalAndTaxAll = parseInt(orderData.amount);

        const expireTime = moment(new Date(orderData.expireTime)).format("DD/MM/YYYY");
        const startTime = moment(new Date(orderData.createdAt)).format("DD/MM/YYYY");

        const userId = orderData.user;
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

        let json = {};

        json = {
          idBill: idBill,
          phoneOwner: phoneOwner,
          expireTime: expireTime,
          dateBill: startTime,
          startTime: startTime,
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
        };

        console.log({json});

        const nameFile = `Invoice - ${nameMotel} - ${nameRoom} deposit`;
        let fileName = `${nameFile}.pdf`;

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Dispsition", "attachment;filename=" + fileName);

        const buffer = await generateOrderDepositPendingPayPDF(json, bankData);
        res.send(buffer);
      }
      const data = "exportBillSuccess";
      return HttpResponse.returnSuccessResponse(res, data);
    } catch (e) {
      console.log({ e });
      next(e);
    }
  }

  static async exportAllBillRoomPendingPayByOrderToMail(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const { email, listIdOrder } = req.body;

      console.log({email});

      console.log({listIdOrder});

      if(listIdOrder.length === 0) {
        return HttpResponse.returnBadRequestResponse(
          res, 
          "Không có hóa đơn nào!"
        )
      }
      if(!email) {
        return HttpResponse.returnBadRequestResponse(
          res, 
          "Không có email!"
        )
      }

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

      const bufferList = [];

      const listIdOrderLength = listIdOrder.length;
      for(let i = 0; i < listIdOrderLength; i++ ) {
        
        const orderData = await orderModel.findOne({_id: listIdOrder[i]}).lean().exec();

        if(!orderData) {
          continue;
        }
        console.log("KJHDFALKSJDHF")

        const jobData = await jobModel.findOne({_id: orderData.job}).lean().exec();

        if (!jobData) {
          continue;
        }

        const roomData = await roomModel.findOne({_id: jobData.room}).lean().exec();
        if(!roomData) {
          continue;
        }

        const floorData = await floorModel.findOne({rooms: roomData._id}).lean().exec();
        if(!floorData) {
          continue;
        }
        

        let buffer = await getBufferOrderAllType(
          orderData,
          jobData,
          roomData,
          floorData
        );
        // bufferList.push(buffer);
        bufferList.push({ buffer: Buffer.from(buffer) });
      }

      console.log("eladfasd", bufferList.length);

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "cr7ronadol12345@gmail.com",
          pass: "wley oiaw yhpl oupy",
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      const mailOptions = {
        from: "cr7ronadol12345@gmail.com",
        to: email,
        subject: `HÓA ĐƠN XUẤT NGÀY ${moment().format("DD/MM/YYYY")}`,
        text: `HÓA ĐƠN XUẤT NGÀY ${moment().format("DD/MM/YYYY")}`,
        attachments: bufferList.map((result) => ({
          filename: `Invoice.pdf`,
          content: result.buffer,
        })),
      };

      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.error(error);
        } else {
          console.log("Email đã được gửi: " + info.response);
        }
      });
      
      const data = "exportBillSuccess";
      return HttpResponse.returnSuccessResponse(res, data);
    } catch (e) {
      console.log({ e });
      next(e);
    }
  }

  static async exportBillPaidByTransaction(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      console.log("innnnn")
      const idTransaction = req.params.id;
      // const idTransaction = "664d29894a755b6434ac92c3";

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
        bill: billModel,
        totalKwh: totalKwhModel,
      } = global.mongoModel;

      const transactionData = await TransactionsModel.findOne({_id: idTransaction}).populate("user order motel room").lean().exec();

      if(!transactionData) {
        return HttpResponse.returnBadRequestResponse(res,
          "Giao dịch không tồn tại"
        )
      }

      // const orderData = await orderModel.findOne({_id: idOrder}).lean().exec();
      // console.log({orderData});

      if(!transactionData.order) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Không tìm thấy hóa đơn!!"
        );
      }

      // const roomData = await roomModel.findOne({_id: jobData.room}).lean().exec();
      if(!transactionData.room) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Phòng không tồn tại"
        )
      }

      if(!transactionData.motel) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Toàn nhà không tồn tại"
        )
      }

      if (transactionData.order.type === "monthly") {
        const billData = await billModel.findOne({order: transactionData.order._id})
                                                            .populate("electricity garbage water wifi other room").lean().exec();
        if(!billData) {
          return HttpResponse.returnBadRequestResponse(
            res,
            "Hóa đơn chưa tồn tại"
          )
        }

        console.log("billDataaaa", billData);
        // const motelData = await motelRoomModel.findOne({floors: transactionData.motel._id}).populate("owner address").lean().exec();
        // console.log({motelData});

        const banking = {
          nameBankOwner: billData.nameBankOwner,
          nameOwnerBankOwner: billData.nameOwnerBankOwner,
          numberBankOwner: billData.numberBankOwner,
        };

        const emailOwner = billData.emailOwner;
        const phoneOwner = billData.phoneOwner;
        
        const addressOwner = billData.addressOwner;

        const nameMotel = billData.nameMotel;
        const motelAddress = billData.addressMotel;

        // const totalkWhTime = await EnergyController.calculateElectricUsedDayToDayHaveLabelTime(
        //   billData.roomRented,
        //   moment(new Date(transactionData.order.startTime)).format("YYYY-MM-DD"),
        //   moment(new Date(transactionData.order.endTime)).format("YYYY-MM-DD")
        // );

        const totalkWhTime = await totalKwhModel.findOne({
          order: transactionData.order._id,
        }).lean().exec();

        const nameRoom = billData.nameRoom;

        // // // //Thông số
        const idBill: string = billData.idBill;
        const numberDayStay = billData.room.type;

        const unitPriceRoom = billData.room.unitPrice;
        const unitPriceElectricity = billData.electricity.unitPrice;
        const unitPriceWater = billData.water.unitPrice;
        const unitPriceGarbage = billData.garbage.unitPrice; // dịch vụ
        const unitPriceWifi = billData.wifi.unitPrice; // xe
        const unitPriceWifiN = billData.vehicle.unitPrice; // xe
        const unitPriceOther = billData.other.unitPrice;

        const typeRoom: number =billData.room.type;
        const typeWater: number =  billData.water.type;
        const typeGarbage: string = billData.garbage.type;
        const typeWifi: number = billData.wifi.type;
        const typeWifiN: number = billData.vehicle.type;
        const typeOther = billData.other.type;
        let typeElectricity: number =  billData.electricity.type;

        const totalAll = parseInt(billData.totalAll);
        const totalAndTaxAll = parseInt(billData.totalAndTaxAll);
        const totalRoom = parseInt(billData.room.total);
        const totalWifi = parseInt(billData.wifi.total);
        const totalWifiN = parseInt(billData.vehicle.total);
        const totalGarbage = parseInt(billData.garbage.total); // service
        const totalWater = parseInt(billData.water.total);
        const totalElectricity = parseInt(billData.electricity.total);

        // // const timeExport = new Date();
        // // timeExport.setHours(timeExport.getHours() + 7);
        // // const parsedTime = moment(timeExport).format("DD/MM/YYYY");

        // // const expireTime = moment(new Date(endTime)).format("DD/MM/YYYY");
        const expireTime = moment(new Date(transactionData.order.expireTime)).format("DD/MM/YYYY");
        const startTime = transactionData.order.startTime;
        const dateBill = billData.dateBill;

        let json = {};

        const nameUser = billData.nameUser;
        const phoneUser = billData.phoneUser;
        const addressUser = billData.addressUser;
        const emailUser = billData.emailUser;

        json = {
          numberDayStay: numberDayStay,

          idBill: idBill, 
          phoneOwner: phoneOwner,
          expireTime: expireTime,
          dateBill: dateBill,
          startTime: startTime,
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

          // totalAll:
          //   unitPriceRoom +
          //   typeElectricity * unitPriceElectricity +
          //   typeWater * unitPriceWater +
          //   typeGarbage * unitPriceGarbage +
          //   typeWifi * unitPriceWifi +
          //   typeOther * unitPriceOther,

          totalAll: totalAll,

          totalAndTaxAll: totalAndTaxAll,
          // totalAndTaxAll:
          //   unitPriceRoom +
          //   typeElectricity * unitPriceElectricity +
          //   typeWater * unitPriceWater +
          //   typeGarbage * unitPriceGarbage +
          //   typeWifi * unitPriceWifi +
          //   typeOther * unitPriceOther,

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

          expenseWifiN: "Chi Phí Wifi",
          typeWifiN: typeWifiN,
          unitPriceWifiN: unitPriceWifiN,
          totalWifiN: totalWifiN,

          expenseOther: "Tiện Ích Khác",
          typeOther: typeOther,
          unitPriceOther: unitPriceOther,
          totalOther: typeOther * unitPriceOther,
        };

        console.log({totalkWhTime});

        const nameFile = `Invoice - ${nameMotel} - ${nameRoom} from ${moment(new Date(transactionData.order.startTime)).format("DD-MM-YYYY")} to ${moment(new Date(transactionData.order.endTime)).format("DD-MM-YYYY")}`;
        let fileName = `${nameFile}.pdf`;

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Dispsition", "attachment;filename=" + fileName);

        const buffer = await generateBillMonthlyPDF(json, banking, totalkWhTime);

        // Export chartjs to pdf
        const configuration: ChartConfiguration = {
          type: "line",
          data: {
            labels: totalkWhTime.labelTime.map((item) =>
              item ? item : "Chưa có dữ liệu"
            ),
            datasets: [
              {
                // label: `Tổng số điện từ ${startTime} đến ${endTime}`,
                label: `Tổng số điện từ ${moment(new Date(transactionData.order.startTime)).format("DD-MM-YYYY")} đến ${moment(new Date(transactionData.order.endTime)).format("DD-MM-YYYY")}`,
                data: totalkWhTime.kWhData,
                backgroundColor: ["rgba(255, 99, 132, 0.2)"],
                borderColor: ["rgba(255,99,132,1)"],
                borderWidth: 1,
                tension: 0.01,
                fill: false,
              },
            ],
          },
          options: {
            scales: {
              x: {
                title: {
                  display: true,
                  text: "Thời gian",
                },
              },
              y: {
                title: {
                  display: true,
                  text: "Số KwH",
                },
              },
            },
          },
          plugins: [
            {
              id: "background-colour",
              beforeDraw: (chart) => {
                const ctx = chart.ctx;
                ctx.save();
                ctx.fillStyle = "white";
                ctx.fillRect(0, 0, width, height);
                ctx.restore();
              },
            },
            {
              id: "chart-data-labels",
              afterDatasetsDraw: (chart, args, options) => {
                const { ctx } = chart;
                ctx.save();

                // Configure data labels here
                chart.data.datasets.forEach((dataset, i) => {
                  const meta = chart.getDatasetMeta(i);
                  meta.data.forEach((element, index) => {
                    const model = element;
                    const x = model.x;
                    const y = model.y;
                    const text = dataset.data[index]
                      ? (+dataset.data[index].toString()).toFixed(2)
                      : ""; // You can customize this based on your data
                    const font = "12px Arial"; // Example font setting
                    const fillStyle = "black"; // Example color setting
                    const textAlign = "center"; // Example alignment setting

                    ctx.fillStyle = fillStyle;
                    ctx.font = font;
                    ctx.textAlign = textAlign;
                    ctx.fillText(text, x, y);
                  });
                });

                ctx.restore();
              },
            },
          ],
        };
        const chartBufferPNG = await chartJSNodeCanvas.renderToBuffer(
          configuration
        );
        const mergedBuffer = await mergeBuffer(buffer, chartBufferPNG);
        // console.log({ mergedBuffer: Buffer.from(mergedBuffer) });

        
        // res.send(mergedBuffer);
        res.send(buffer);
      } else if( transactionData.order.type === "deposit" || transactionData.order.type === "afterCheckInCost") {
        const billData = await billModel.findOne({order: transactionData.order._id})
                                                            .populate("electricity garbage water wifi other room").lean().exec();
        if(!billData) {
          return HttpResponse.returnBadRequestResponse(
            res,
            "Hóa đơn chưa tồn tại"
          )
        }                
        
        const banking = {
          nameBankOwner: billData.nameBankOwner,
          nameOwnerBankOwner: billData.nameOwnerBankOwner,
          numberBankOwner: billData.numberBankOwner,
        };
        const idBill: string = billData.idBill;
        const emailOwner = billData.emailOwner;
        const phoneOwner = billData.phoneOwner;
        
        const addressOwner = billData.addressOwner;
        const nameMotel = billData.nameMotel;
        const motelAddress = billData.addressMotel;

        const nameRoom = billData.nameRoom;

        const totalAll = parseInt(billData.totalAll);
        const totalAndTaxAll = parseInt(billData.totalAndTaxAll);

        const expireTime = moment(new Date(transactionData.order.expireTime)).format("DD/MM/YYYY");
        const startTime = transactionData.order.startTime;
        const dateBill = billData.dateBill;

        const nameUser = billData.nameUser;
        const phoneUser = billData.phoneUser;
        const addressUser = billData.addressUser;
        const emailUser = billData.emailUser;

        let json = {};

        json = {
          idBill: idBill,
          phoneOwner: phoneOwner,
          expireTime: expireTime,
          dateBill: dateBill,
          startTime: startTime,
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
        };

        const nameFile = `Invoice - ${nameMotel} - ${nameRoom} deposit`;
        let fileName = `${nameFile}.pdf`;

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Dispsition", "attachment;filename=" + fileName);

        const buffer = await generateBillDepositPDF(json, banking);
        res.send(buffer);
      }

    } catch (e) {
      console.log({ e });
      next(e);
    }
  }

  static async exportBillPaidByOrder(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const idOrder = req.params.id;
      // const idTransaction = "664d29894a755b6434ac92c3";
      console.log({idOrder});

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
        bill: billModel,
        totalKwh: totalKwhModel,
      } = global.mongoModel;

      const orderData = await orderModel.findOne({_id: idOrder}).populate("user order motel room").lean().exec();

      if(!orderData) {
        return HttpResponse.returnBadRequestResponse(res,
          "Không tìm thấy hóa đơn!!"
        )
      }


      if (orderData.type === "monthly") {
        const billData = await billModel.findOne({order: orderData._id})
                                                            .populate("electricity garbage water wifi other room").lean().exec();
        if(!billData) {
          return HttpResponse.returnBadRequestResponse(
            res,
            "Hóa đơn chưa tồn tại"
          )
        }

        console.log("billDataaaa", billData);
        // const motelData = await motelRoomModel.findOne({floors: transactionData.motel._id}).populate("owner address").lean().exec();
        // console.log({motelData});

        const banking = {
          nameBankOwner: billData.nameBankOwner,
          nameOwnerBankOwner: billData.nameOwnerBankOwner,
          numberBankOwner: billData.numberBankOwner,
        };

        const emailOwner = billData.emailOwner;
        const phoneOwner = billData.phoneOwner;
        
        const addressOwner = billData.addressOwner;

        const nameMotel = billData.nameMotel;
        const motelAddress = billData.addressMotel;

        // const totalkWhTime = await EnergyController.calculateElectricUsedDayToDayHaveLabelTime(
        //   billData.roomRented,
        //   moment(new Date(orderData.startTime)).format("YYYY-MM-DD"),
        //   moment(new Date(orderData.endTime)).format("YYYY-MM-DD")
        // );

        const totalkWhTime = await totalKwhModel.findOne({
          order: orderData._id,
        }).lean().exec();

        const nameRoom = billData.nameRoom;

        // // // //Thông số
        const idBill: string = billData.idBill;
        const numberDayStay = billData.room.type;

        const unitPriceRoom = billData.room.unitPrice;
        const unitPriceElectricity = billData.electricity.unitPrice;
        const unitPriceWater = billData.water.unitPrice;
        const unitPriceGarbage = billData.garbage.unitPrice; // dịch vụ
        const unitPriceWifi = billData.wifi.unitPrice; // xe
        const unitPriceWifiN = billData.vehicle.unitPrice; //WIFI
        const unitPriceOther = billData.other.unitPrice;

        const typeRoom: number =billData.room.type;
        const typeWater: number =  billData.water.type;
        const typeGarbage: string = billData.garbage.type;
        const typeWifi: number = billData.wifi.type;
        const typeWifiN: number = billData.vehicle.type;
        const typeOther = billData.other.type;
        let typeElectricity: number =  billData.electricity.type;

        const totalAll = parseInt(billData.totalAll);
        const totalAndTaxAll = parseInt(billData.totalAndTaxAll);
        const totalRoom = parseInt(billData.room.total);
        const totalWifi = parseInt(billData.wifi.total);
        const totalWifiN = parseInt(billData.vehicle.total);
        const totalGarbage = parseInt(billData.garbage.total); // service
        const totalWater = parseInt(billData.water.total);
        const totalElectricity = parseInt(billData.electricity.total);

        // // const timeExport = new Date();
        // // timeExport.setHours(timeExport.getHours() + 7);
        // // const parsedTime = moment(timeExport).format("DD/MM/YYYY");

        // // const expireTime = moment(new Date(endTime)).format("DD/MM/YYYY");
        const expireTime = moment(new Date(orderData.expireTime)).format("DD/MM/YYYY");
        const startTime = orderData.startTime;
        const dateBill = billData.dateBill;

        let json = {};

        const nameUser = billData.nameUser;
        const phoneUser = billData.phoneUser;
        const addressUser = billData.addressUser;
        const emailUser = billData.emailUser;

        json = {
          numberDayStay: numberDayStay,

          idBill: idBill, 
          phoneOwner: phoneOwner,
          expireTime: expireTime,
          dateBill: dateBill,
          startTime: startTime,
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

          // totalAll:
          //   unitPriceRoom +
          //   typeElectricity * unitPriceElectricity +
          //   typeWater * unitPriceWater +
          //   typeGarbage * unitPriceGarbage +
          //   typeWifi * unitPriceWifi +
          //   typeOther * unitPriceOther,

          totalAll: totalAll,

          totalAndTaxAll: totalAndTaxAll,
          // totalAndTaxAll:
          //   unitPriceRoom +
          //   typeElectricity * unitPriceElectricity +
          //   typeWater * unitPriceWater +
          //   typeGarbage * unitPriceGarbage +
          //   typeWifi * unitPriceWifi +
          //   typeOther * unitPriceOther,

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

          expenseWifiN: "Chi Phí Wifi",
          typeWifiN: typeWifiN,
          unitPriceWifiN: unitPriceWifiN,
          totalWifiN: totalWifiN,

          expenseOther: "Tiện Ích Khác",
          typeOther: typeOther,
          unitPriceOther: unitPriceOther,
          totalOther: typeOther * unitPriceOther,
        };

        console.log({totalkWhTime});

        const nameFile = `Invoice - ${nameMotel} - ${nameRoom} from ${moment(new Date(orderData.startTime)).format("DD-MM-YYYY")} to ${moment(new Date(orderData.endTime)).format("DD-MM-YYYY")}`;
        let fileName = `${nameFile}.pdf`;

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Dispsition", "attachment;filename=" + fileName);

        const buffer = await generateBillMonthlyPDF(json, banking, totalkWhTime);

        // Export chartjs to pdf
        const configuration: ChartConfiguration = {
          type: "line",
          data: {
            labels: totalkWhTime.labelTime.map((item) =>
              item ? item : "Chưa có dữ liệu"
            ),
            datasets: [
              {
                // label: `Tổng số điện từ ${startTime} đến ${endTime}`,
                label: `Tổng số điện từ ${moment(new Date(orderData.startTime)).format("DD-MM-YYYY")} đến ${moment(new Date(orderData.endTime)).format("DD-MM-YYYY")}`,
                data: totalkWhTime.kWhData,
                backgroundColor: ["rgba(255, 99, 132, 0.2)"],
                borderColor: ["rgba(255,99,132,1)"],
                borderWidth: 1,
                tension: 0.01,
                fill: false,
              },
            ],
          },
          options: {
            scales: {
              x: {
                title: {
                  display: true,
                  text: "Thời gian",
                },
              },
              y: {
                title: {
                  display: true,
                  text: "Số KwH",
                },
              },
            },
          },
          plugins: [
            {
              id: "background-colour",
              beforeDraw: (chart) => {
                const ctx = chart.ctx;
                ctx.save();
                ctx.fillStyle = "white";
                ctx.fillRect(0, 0, width, height);
                ctx.restore();
              },
            },
            {
              id: "chart-data-labels",
              afterDatasetsDraw: (chart, args, options) => {
                const { ctx } = chart;
                ctx.save();

                // Configure data labels here
                chart.data.datasets.forEach((dataset, i) => {
                  const meta = chart.getDatasetMeta(i);
                  meta.data.forEach((element, index) => {
                    const model = element;
                    const x = model.x;
                    const y = model.y;
                    const text = dataset.data[index]
                      ? (+dataset.data[index].toString()).toFixed(2)
                      : ""; // You can customize this based on your data
                    const font = "12px Arial"; // Example font setting
                    const fillStyle = "black"; // Example color setting
                    const textAlign = "center"; // Example alignment setting

                    ctx.fillStyle = fillStyle;
                    ctx.font = font;
                    ctx.textAlign = textAlign;
                    ctx.fillText(text, x, y);
                  });
                });

                ctx.restore();
              },
            },
          ],
        };
        const chartBufferPNG = await chartJSNodeCanvas.renderToBuffer(
          configuration
        );
        const mergedBuffer = await mergeBuffer(buffer, chartBufferPNG);
        // console.log({ mergedBuffer: Buffer.from(mergedBuffer) });

        
        // res.send(mergedBuffer);
        res.send(buffer);
      } else if( orderData.type === "deposit" || orderData.type === "afterCheckInCost") {
        const billData = await billModel.findOne({order: orderData._id})
                                                            .populate("electricity garbage water wifi other room").lean().exec();
        if(!billData) {
          return HttpResponse.returnBadRequestResponse(
            res,
            "Hóa đơn chưa tồn tại"
          )
        }                
        
        const banking = {
          nameBankOwner: billData.nameBankOwner,
          nameOwnerBankOwner: billData.nameOwnerBankOwner,
          numberBankOwner: billData.numberBankOwner,
        };
        const idBill: string = billData.idBill;
        const emailOwner = billData.emailOwner;
        const phoneOwner = billData.phoneOwner;
        
        const addressOwner = billData.addressOwner;
        const nameMotel = billData.nameMotel;
        const motelAddress = billData.addressMotel;

        const nameRoom = billData.nameRoom;

        const totalAll = parseInt(billData.totalAll);
        const totalAndTaxAll = parseInt(billData.totalAndTaxAll);

        const expireTime = moment(new Date(orderData.expireTime)).format("DD/MM/YYYY");
        const startTime = orderData.startTime;
        const dateBill = billData.dateBill;

        const nameUser = billData.nameUser;
        const phoneUser = billData.phoneUser;
        const addressUser = billData.addressUser;
        const emailUser = billData.emailUser;

        let json = {};

        json = {
          idBill: idBill,
          phoneOwner: phoneOwner,
          expireTime: expireTime,
          dateBill: dateBill,
          startTime: startTime,
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
        };

        const nameFile = `Invoice - ${nameMotel} - ${nameRoom} deposit`;
        let fileName = `${nameFile}.pdf`;

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Dispsition", "attachment;filename=" + fileName);

        const buffer = await generateBillDepositPDF(json, banking);
        res.send(buffer);
      }

    } catch (e) {
      console.log({ e });
      next(e);
    }
  }

  static async exportBillAllRoom(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    const idMotel = req.params.idMotel;
    const startTime = req.params.startTime;
    const endTime = req.params.endTime;

    // const startTimeQuery = new Date(startTime);
    // const endTimeQuery = new Date(endTime);
    // endTimeQuery.setHours(30, 59, 59, 59);

    const startTimeQuery = moment(startTime).format("YYYY-MM-DD");
    const endTimeQuery = moment(endTime).format("YYYY-MM-DD");

    let dataEnergy: {
      totalkWhTime: number;
      labelTime: (string | null)[];
      kWhData: (number | null)[];
      totalKwhPerDay: (number | null)[];
      dataBefore: any;
      rawData: any[];
    };

    const resIdMotel: string = "65d426786415bc4a8ced1adf";
    const resIdRoom: string = "65d426776415bc4a8ced1adc";
    const resIdRoom2: string = "65d426776415bc4a8ced1add";

    const getRandomInt = (min, max) =>
      Math.floor(Math.random() * (max - min)) + min;
    const getRandomString = (length, base) => {
      let result = "";
      const baseLength = base.length;

      // eslint-disable-next-line no-plusplus
      for (let i = 0; i < length; i++) {
        const randomIndex = getRandomInt(0, baseLength);
        result += base[randomIndex];
      }

      return result;
    };

    const getRandomHex2 = () => {
      const baseString =
        "0123456789QƯERTYUIOPASDFGHJKLZXCVBNMqưertyuiopasdfghjklzxcvbnm";
      const ma = `${getRandomString(6, baseString)}`;
      return ma;
    };
    const {
      motelRoom: motelRoomModel,
      floor: floorModel,
      room: roomModel,
      address: addressModel,
      user: userModel,
      banking: BankingModel,
      job: jobModel,
    } = global.mongoModel;

    try {
      const motelInfor = await motelRoomModel
        .findOne({ _id: idMotel })
        .lean()
        .exec();
      console.log("motelInforrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr", motelInfor);

      const nameMotel = motelInfor.name;

      const motelOwner = await userModel
        .findOne({ _id: motelInfor.owner })
        .lean()
        .exec();

      const emailOwner = motelOwner.email;
      const phoneOwner =
        motelOwner.phoneNumber.countryCode + motelOwner.phoneNumber.number;
      const addressOwner = motelOwner.address;

      const roomInfor = await roomModel
        .findOne({ _id: resIdRoom })
        .lean()
        .exec();

      const banking = await BankingModel.findOne({ user: motelInfor.owner })
        .lean()
        .exec();
      if (banking === null) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Chưa có thông tin tài khoản ngân hàng"
        );
      }

      const idAddress = motelInfor.address;
      const motelAddress = await addressModel
        .findOne({ _id: idAddress })
        .lean()
        .exec();

      const addressMotel = motelAddress.address;

      console.log("motelInfor.floors", motelInfor.floors);
      const floors = motelInfor.floors;

      // 65d426766415bc4a8ced1acc: lầu 1
      // 65d426786415bc4a8ced1ade: lầu 5

      const results: { buffer: Buffer }[] = [];
      if (floors.length > 0) {
        let countRoomRented: number = 0;
        let countRoomHaveIdMetter: number = 0;

        for (let i = 0; i < floors.length; i++) {
          const floor = await floorModel
            .findOne({ _id: floors[i] })
            .lean()
            .exec();

          // console.log("room floor 1", floor.rooms);

          const rooms = floor.rooms;

          console.log(`list room ${i}: `, rooms);
          for (let j = 0; j < rooms.length; j++) {
            console.log(
              `roommmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm ${j}: ${rooms[j]}`
            );
            const roomInfor = await roomModel
              .findOne({ _id: rooms[j] })
              .lean()
              .exec();

            const nameRoom = roomInfor.name;

            //Thông số
            const expenseRoom: string = "Chi Phí Phòng";
            const expenseElectricity: string = "Chi Phí Điện";
            const expenseWater: string = "Chi Phí Nước";
            const expenseGarbage: string = "Phí Dịch Vụ";
            const expenseWifi: string = "Chi Phí Xe";
            const expenseOther: string = "Tiện Ích Khác";

            const unitPriceRoom = roomInfor.price;
            const unitPriceElectricity = roomInfor.electricityPrice;
            const unitPriceWater = roomInfor.waterPrice;
            const unitPriceGarbage = roomInfor.garbagePrice;
            const unitPriceWifi = roomInfor.wifiPrice;
            const unitPriceOther = 0;

            const typeRoom: number = 1;
            // const typeElectricity: number = roomInfor.electricityPrice; // PHÍA DƯỚI
            const typeWater: number = roomInfor.person;
            const typeGarbage: number = 1;
            const typeWifi: number = roomInfor.vihicle;
            const typeOther = 0;

            let typeElectricity: number = 0;

            const timeExport = new Date();
            timeExport.setHours(timeExport.getHours() + 7);
            const parsedTime = moment(timeExport).format("DD/MM/YYYY");

            const expireTime = moment(new Date(endTime)).format("DD/MM/YYYY");

            let json = {};

            if (roomInfor.rentedBy) {
              countRoomRented += 1;
              console.log("PHÒNG ĐÃ THUÊ", roomInfor.rentedBy);
              const userId = roomInfor.rentedBy;
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

              if(roomInfor.listIdElectricMetter) {
                if ( roomInfor.listIdElectricMetter.length !== 0) {
                  countRoomHaveIdMetter += 1;
                  console.log("PHÒNG ĐÃ CÓ ĐỒNG HÒOOOOOOOOOO");
  
                  const jobData = await jobModel.findOne({
                    room: roomInfor._id,
                    isDeleted: false,
                    isActived: true,
                  }).lean().exec();
  
                  if (!jobData) {
                    continue;
                  }
                  let startTimeQueryTemp: string = startTimeQuery;
                  if (moment(startTimeQuery) < moment(jobData.checkInTime)) {
                    //nếu thời gian query trước thời gian checkIn
                    startTimeQueryTemp = moment(jobData.checkInTime).format("YYYY-MM-DD");
                  }

                  console.log({startTimeQueryTemp});
                  console.log({endTimeQuery});
  
                  const resResult = await EnergyController.calculateElectricUsedDayToDayHaveLabelTime(
                    roomInfor._id,
                    startTimeQueryTemp,
                    endTimeQuery,
                  );
  
                  console.log("resResult", resResult);
  
                  if (resResult === null) {
                    continue;
                  }

                  typeElectricity = resResult.totalkWhTime;
  
                  //chuyển string -> number
                  // let idElectricMetterNumber: number = +roomInfor.idElectricMetter;
  
                  // // input: 2024-01-24/2024-01-24: không cần giờ
                  // console.log("startTime", startTimeQuery);
                  // const lastStartDay = startTimeQuery;
  
                  // console.log("endTime", endTimeQuery);
                  // const lastEndDay = endTimeQuery;
  
                  // console.log("Kết quả phép so sánh:", lastStartDay < lastEndDay);
                  // const { electrics: ElectricsModel } = global.mongoModel;
  
                  // if (lastStartDay > lastEndDay) {
                  //   console.log("Thời gian bắt đầu lớn hơn thời gian kết thúc");
                  // } else {
                  //   const datesInRange: Date[] = [];
                  //   let currentDate = new Date(lastStartDay);
  
                  //   while (currentDate <= lastEndDay) {
                  //     datesInRange.push(new Date(currentDate));
                  //     currentDate.setDate(currentDate.getDate() + 1);
                  //   }
  
                  //   const resultData = [];
                  //   for (const date of datesInRange) {
                  //     const endOfDay = new Date(date);
                  //     endOfDay.setHours(30, 59, 59, 999);
  
                  //     const query = {
                  //       IdDevice: roomInfor.idElectricMetter,
                  //       Time: {
                  //         $gte: date,
                  //         $lte: endOfDay,
                  //       },
                  //     };
  
                  //     const result = await ElectricsModel.findOne(query)
                  //       .sort({ Time: -1 })
                  //       .lean()
                  //       .exec();
                  //     resultData.push(result);
                  //     // console.log(
                  //     //   "resultttttttttttttttttttttttttttttttttt",
                  //     //   result
                  //     // );
  
                  //     // console.log(
                  //     //   `Dữ liệu ${idMotel} vào cuối ngày ${date.toISOString()}:`,
                  //     //   result
                  //     // );
                  //   }
  
                  //   const totalKwhPerDay = resultData.map((item) =>
                  //     item !== null ? item.Total_kWh : null
                  //   );
  
                  //   const labelTime: (string | null)[] = resultData.map(
                  //     (item) => {
                  //       if (item !== null) {
                  //         const date = new Date(item.Time);
                  //         console.log("date", date);
                  //         const formattedDate = date.toISOString().split("T")[0];
                  //         return formattedDate;
                  //       } else {
                  //         return null;
                  //       }
                  //     }
                  //   );
  
                  //   const query = {
                  //     IdDevice: roomInfor.idElectricMetter,
                  //     Time: {
                  //       $lte: lastStartDay,
                  //     },
                  //   };
  
                  //   const dataBefore = await ElectricsModel.findOne(query)
                  //     .sort({ Time: -1 })
                  //     .lean()
                  //     .exec();
  
                  //   let kWhData = [];
                  //   let lastValue = 0;
                  //   if (dataBefore !== null) {
                  //     lastValue = dataBefore.Total_kWh;
                  //   }
  
                  //   for (let i = 0; i < totalKwhPerDay.length; i++) {
                  //     if (totalKwhPerDay[i] === null) {
                  //       kWhData.push(null);
                  //     } else {
                  //       let result = totalKwhPerDay[i] - lastValue;
                  //       // Trường hợp thay đồng hồ khác có chỉ số nhỏ hơn chỉ số cũ, nếu ngày đó thay đồng hồ thì chấp nhận mất dữ liệu của ngày đó
                  //       if (result < 0) {
                  //         kWhData.push(null);
                  //         lastValue = totalKwhPerDay[i];
                  //       } else {
                  //         kWhData.push(result);
                  //         lastValue = totalKwhPerDay[i];
                  //       }
                  //     }
                  //   }
  
                  //   const totalkWhTime = kWhData.reduce(
                  //     (acc, curr) => acc + curr,
                  //     0
                  //   );
  
                  //   dataEnergy = {
                  //     totalkWhTime: totalkWhTime,
                  //     labelTime: labelTime,
                  //     kWhData: kWhData,
                  //     totalKwhPerDay: totalKwhPerDay,
                  //     dataBefore: dataBefore,
                  //     rawData: resultData,
                  //   };
                  // }
                  // const lastedValueElectric = await ElectricsModel.findOne({
                  //   IdDevice: idElectricMetterNumber,
                  //   Time: { $lt: endTimeQuery },
                  // })
                  //   .sort({ Time: -1 })
                  //   .lean()
                  //   .exec();
  
                  // const beforeValueElectric = await ElectricsModel.findOne({
                  //   IdDevice: idElectricMetterNumber,
                  //   Time: { $lt: startTimeQuery },
                  // })
                  //   .sort({ Time: -1 })
                  //   .lean()
                  //   .exec();
                  // //note: CẦN XEM SUY NGHĨ THÊM VỀ CÁC CASE
                  // if (beforeValueElectric) {
                  //   typeElectricity = parseFloat(
                  //     (
                  //       lastedValueElectric.Total_kWh -
                  //       beforeValueElectric.Total_kWh
                  //     ).toFixed(3)
                  //   );
                  // } else {
                  //   typeElectricity = parseFloat(lastedValueElectric.toFixed(3));
                  // }
  
                  const labelTime = resResult.labelTime;
                  console.log("label Time", labelTime);
                  const kWhData = resResult.kWhData;
  
                  let dataEnergy = {
                    totalkWhTime: resResult.totalkWhTime,
                    labelTime: resResult.labelTime,
                    kWhData: resResult.kWhData,
                    totalKwhPerDay: null,
                    dataBefore: null,
                    rawData: null,
                  };
  
                  json = {
                    idBill: getRandomHex2(),
                    phoneOwner: phoneOwner,
                    expireTime: expireTime,
                    dateBill: parsedTime,
                    nameMotel: nameMotel,
                    addressMotel: addressMotel,
                    nameRoom: nameRoom,
                    nameUser: nameUser,
                    phoneUser: phoneUser,
                    addressUser: addressUser,
                    addressOwner: addressOwner,
                    imgRoom: "",
                    emailUser: emailUser,
                    emailOwner: emailOwner,
  
                    totalAll:
                      unitPriceRoom +
                      typeElectricity * unitPriceElectricity +
                      typeWater * unitPriceWater +
                      typeGarbage * unitPriceGarbage +
                      typeWifi * unitPriceWifi +
                      typeOther * unitPriceOther,
  
                    totalAndTaxAll:
                      unitPriceRoom +
                      typeElectricity * unitPriceElectricity +
                      typeWater * unitPriceWater +
                      typeGarbage * unitPriceGarbage +
                      typeWifi * unitPriceWifi +
                      typeOther * unitPriceOther,
  
                    totalTaxAll: 0,
                    typeTaxAll: 0,
                    expenseRoom: "Chi Phí Phòng",
                    typeRoom: typeRoom,
                    unitPriceRoom: unitPriceRoom,
                    totalRoom: unitPriceRoom,
                    expenseElectricity: "Chi Phí Điện",
                    typeElectricity: typeElectricity,
                    unitPriceElectricity: unitPriceElectricity,
                    totalElectricity: typeElectricity * unitPriceElectricity,
                    expenseWater: "Chi Phí Nước",
                    typeWater: typeWater,
                    unitPriceWater: unitPriceWater,
                    totalWater: typeWater * unitPriceWater,
                    expenseGarbage: "Phí Dịch Vụ",
                    typeGarbage: typeGarbage,
                    unitPriceGarbage: unitPriceGarbage,
                    totalGarbage: typeGarbage * unitPriceGarbage,
                    expenseWifi: "Chi Phí Xe",
                    typeWifi: typeWifi,
                    unitPriceWifi: unitPriceWifi,
                    totalWifi: typeWifi * unitPriceWifi,
                    expenseOther: "Tiện Ích Khác",
                    typeOther: typeOther,
                    unitPriceOther: unitPriceOther,
                    totalOther: typeOther * unitPriceOther,
                  };
                  const configuration: ChartConfiguration = {
                    type: "line",
                    data: {
                      labels: dataEnergy.labelTime.map((item) =>
                        item ? item : "Chưa có dữ liệu"
                      ),
                      datasets: [
                        {
                          label: `Tổng số điện từ ${startTime} đến ${endTime}`,
                          data: dataEnergy.kWhData.map((item) =>
                            item ? item : 0
                          ),
                          backgroundColor: ["rgba(255, 99, 132, 0.2)"],
                          borderColor: ["rgba(255,99,132,1)"],
                          borderWidth: 1,
                          tension: 0.01,
                          fill: false,
                        },
                      ],
                    },
                    options: {
                      scales: {
                        x: {
                          title: {
                            display: true,
                            text: "Thời gian",
                          },
                        },
                        y: {
                          title: {
                            display: true,
                            text: "Số KwH",
                          },
                        },
                      },
                    },
                    plugins: [
                      {
                        id: "background-colour",
                        beforeDraw: (chart) => {
                          const ctx = chart.ctx;
                          ctx.save();
                          ctx.fillStyle = "white";
                          ctx.fillRect(0, 0, width, height);
                          ctx.restore();
                        },
                      },
                      {
                        id: "chart-data-labels",
                        afterDatasetsDraw: (chart, args, options) => {
                          const { ctx } = chart;
                          ctx.save();
  
                          // Configure data labels here
                          chart.data.datasets.forEach((dataset, i) => {
                            const meta = chart.getDatasetMeta(i);
                            meta.data.forEach((element, index) => {
                              const model = element;
                              const x = model.x;
                              const y = model.y;
                              const text = dataset.data[index]
                                ? (+dataset.data[index].toString()).toFixed(2)
                                : ""; // You can customize this based on your data
                              const font = "12px Arial"; // Example font setting
                              const fillStyle = "black"; // Example color setting
                              const textAlign = "center"; // Example alignment setting
  
                              ctx.fillStyle = fillStyle;
                              ctx.font = font;
                              ctx.textAlign = textAlign;
                              ctx.fillText(text, x, y);
                            });
                          });
  
                          ctx.restore();
                        },
                      },
                    ],
                  };
                  const chartBufferPNG = await chartJSNodeCanvas.renderToBuffer(
                    configuration
                  );
                  const buffer = await generatePDF(json, banking, dataEnergy);
                  const mergedBuffer = await mergeBuffer(buffer, chartBufferPNG);
                  results.push({ buffer: Buffer.from(mergedBuffer) });
  
                  const transporter = nodemailer.createTransport({
                    service: "gmail",
                    auth: {
                      user: "cr7ronadol12345@gmail.com",
                      pass: "wley oiaw yhpl oupy",
                    },
                    tls: {
                      rejectUnauthorized: false,
                    },
                  });
  
                  const files = ["a.txt", "b.pdf", "c.png"];
                  // thay email người nhận thành : emailOwner - chủ trọ
                  const mailOptions = {
                    from: "cr7ronadol12345@gmail.com",
                    // to: "quyetthangmarvel@gmail.com",
                    // to: emailUser,
                    to: "nguyenhuuthiet01012002@gmail.com",
                    subject: `[${nameMotel} ] HÓA ĐƠN TỪ ${startTime} ĐẾN ${endTime}`,
                    text: `Dãy phòng ${nameMotel} địa chỉ ${motelAddress.address}`,
                    attachments: results.map((result) => ({
                      filename: `Invoice - ${nameMotel} - from ${startTime} to ${endTime}.pdf`,
                      content: result.buffer,
                    })),
                  };
  
                  transporter.sendMail(mailOptions, function (error, info) {
                    if (error) {
                      console.error(error);
                    } else {
                      console.log("Email đã được gửi: " + info.response);
                    }
                  });
                } else {
                  //không có id metter
                }
              }
            } else {
              //phòng chưa được thuê
            }
          }
        }

        if (countRoomRented === 0) {
          const data = "Motel has no rented rooms";
          return HttpResponse.returnSuccessResponse(res, data);
        }
        if (countRoomHaveIdMetter === 0) {
          const data = "Motel has no rooms with idMetter";
          return HttpResponse.returnSuccessResponse(res, data);
        }
      } else {
        const data = "Motel has no floors";
        return HttpResponse.returnSuccessResponse(res, data);
      }



      const data = "exportBillAllRoomSuccess";
      return HttpResponse.returnSuccessResponse(res, data);
    } catch (e) {
      console.log({ e });
      next(e);
    }
  }

  static async exportBillBuilding(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    const idMotel = req.params.idMotel;
    const startTime = req.params.startTime;
    const endTime = req.params.endTime;

    const startTimeQuery = new Date(startTime);
    const endTimeQuery = new Date(endTime);
    endTimeQuery.setHours(30, 59, 59, 59);

    const buffers = [];

    let dataEnergy: {
      totalkWhTime: number;
      labelTime: (string | null)[];
      kWhData: (number | null)[];
      totalKwhPerDay: (number | null)[];
      dataBefore: any;
      rawData: any[];
    };

    //khởi tạo json
    let jsonTitle = {};
    const totalJson = {};

    const resIdMotel: string = "65d426786415bc4a8ced1adf";
    const resIdRoom: string = "65d426776415bc4a8ced1adc";
    const resIdRoom2: string = "65d426776415bc4a8ced1add";

    const getRandomInt = (min, max) =>
      Math.floor(Math.random() * (max - min)) + min;
    const getRandomString = (length, base) => {
      let result = "";
      const baseLength = base.length;

      // eslint-disable-next-line no-plusplus
      for (let i = 0; i < length; i++) {
        const randomIndex = getRandomInt(0, baseLength);
        result += base[randomIndex];
      }

      return result;
    };

    const getRandomHex2 = () => {
      const baseString =
        "0123456789QƯERTYUIOPASDFGHJKLZXCVBNMqưertyuiopasdfghjklzxcvbnm";
      const ma = `${getRandomString(6, baseString)}`;
      return ma;
    };
    const {
      motelRoom: motelRoomModel,
      floor: floorModel,
      room: roomModel,
      address: addressModel,
      user: userModel,
      banking: BankingModel,
    } = global.mongoModel;

    try {
      const motelInfor = await motelRoomModel
        .findOne({ _id: idMotel })
        .lean()
        .exec();
      console.log("motelInforrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr", motelInfor);

      const nameMotel = motelInfor.name;

      const motelOwner = await userModel
        .findOne({ _id: motelInfor.owner })
        .lean()
        .exec();

      const emailOwner = motelOwner.email;
      const phoneOwner =
        motelOwner.phoneNumber.countryCode + motelOwner.phoneNumber.number;
      const addressOwner = motelOwner.address;

      const roomInfor = await roomModel
        .findOne({ _id: resIdRoom })
        .lean()
        .exec();

      const banking = await BankingModel.findOne({ user: motelInfor.owner })
        .lean()
        .exec();
      if (banking === null) {

        return HttpResponse.returnBadRequestResponse(res, "Chưa có thông tin tài khoản ngân hàng");
      }

      const idAddress = motelInfor.address;
      const motelAddress = await addressModel
        .findOne({ _id: idAddress })
        .lean()
        .exec();

      const addressMotel = motelAddress.address;

      console.log("motelInfor.floors", motelInfor.floors);
      const floors = motelInfor.floors;

      // 65d426766415bc4a8ced1acc: lầu 1
      // 65d426786415bc4a8ced1ade: lầu 5

      const results: { buffer: Buffer }[] = [];
      if (floors.length > 0) {
        let countRoomRented: number = 0;
        let countRoomHaveIdMetter: number = 0;

        for (let i = 0; i < floors.length; i++) {
          const floor = await floorModel
            .findOne({ _id: floors[i] })
            .lean()
            .exec();

          // console.log("room floor 1", floor.rooms);

          const rooms = floor.rooms;

          console.log(`list room ${i}: `, rooms);
          for (let j = 0; j < rooms.length; j++) {
            console.log(
              `roommmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm ${j}: ${rooms[j]}`
            );
            const roomInfor = await roomModel
              .findOne({ _id: rooms[j] })
              .lean()
              .exec();

            const nameRoom = roomInfor.name;

            //Thông số
            const expenseRoom: string = "Chi Phí Phòng";
            const expenseElectricity: string = "Chi Phí Điện";
            const expenseWater: string = "Chi Phí Nước";
            const expenseGarbage: string = "Phí Dịch Vụ";
            const expenseWifi: string = "Chi Phí Xe";
            const expenseOther: string = "Tiện Ích Khác";

            const unitPriceRoom = roomInfor.price;
            const unitPriceElectricity = roomInfor.electricityPrice;
            const unitPriceWater = roomInfor.waterPrice;
            const unitPriceGarbage = roomInfor.garbagePrice;
            const unitPriceWifi = roomInfor.wifiPrice;
            const unitPriceOther = 0;

            const typeRoom: number = 1;
            // const typeElectricity: number = roomInfor.electricityPrice; // PHÍA DƯỚI
            const typeWater: number = roomInfor.person;
            const typeGarbage: number = 1;
            const typeWifi: number = roomInfor.vihicle;
            const typeOther = 0;

            let typeElectricity: number = 0;

            const timeExport = new Date();
            timeExport.setHours(timeExport.getHours() + 7);
            const parsedTime = moment(timeExport).format("DD/MM/YYYY");

            const expireTime = moment(new Date(endTime)).format("DD/MM/YYYY");

            let json = {};

            if (roomInfor.rentedBy) {
              countRoomRented += 1;
              console.log("PHÒNG ĐÃ THUÊ", roomInfor.rentedBy);
              const userId = roomInfor.rentedBy;
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

              if (roomInfor.idElectricMetter) {
                countRoomHaveIdMetter += 1;
                console.log("PHÒNG ĐÃ CÓ ĐỒNG HÒOOOOOOOOOO");
                //chuyển string -> number
                let idElectricMetterNumber: number = +roomInfor.idElectricMetter;

                // input: 2024-01-24/2024-01-24: không cần giờ
                console.log("startTime", startTimeQuery);
                const lastStartDay = startTimeQuery;

                console.log("endTime", endTimeQuery);
                const lastEndDay = endTimeQuery;

                console.log("Kết quả phép so sánh:", lastStartDay < lastEndDay);
                const { electrics: ElectricsModel } = global.mongoModel;

                if (lastStartDay > lastEndDay) {
                  console.log("Thời gian bắt đầu lớn hơn thời gian kết thúc");
                } else {
                  const datesInRange: Date[] = [];
                  let currentDate = new Date(lastStartDay);

                  while (currentDate <= lastEndDay) {
                    datesInRange.push(new Date(currentDate));
                    currentDate.setDate(currentDate.getDate() + 1);
                  }

                  const resultData = [];
                  for (const date of datesInRange) {
                    const endOfDay = new Date(date);
                    endOfDay.setHours(30, 59, 59, 999);

                    const query = {
                      IdDevice: roomInfor.idElectricMetter,
                      Time: {
                        $gte: date,
                        $lte: endOfDay,
                      },
                    };

                    const result = await ElectricsModel.findOne(query)
                      .sort({ Time: -1 })
                      .lean()
                      .exec();
                    resultData.push(result);
                    // console.log(
                    //   "resultttttttttttttttttttttttttttttttttt",
                    //   result
                    // );

                    // console.log(
                    //   `Dữ liệu ${idMotel} vào cuối ngày ${date.toISOString()}:`,
                    //   result
                    // );
                  }

                  const totalKwhPerDay = resultData.map((item) =>
                    item !== null ? item.Total_kWh : null
                  );

                  const labelTime: (string | null)[] = resultData.map(
                    (item) => {
                      if (item !== null) {
                        const date = new Date(item.Time);
                        console.log("date", date);
                        const formattedDate = date.toISOString().split("T")[0];
                        return formattedDate;
                      } else {
                        return null;
                      }
                    }
                  );

                  const query = {
                    IdDevice: roomInfor.idElectricMetter,
                    Time: {
                      $lte: lastStartDay,
                    },
                  };

                  const dataBefore = await ElectricsModel.findOne(query)
                    .sort({ Time: -1 })
                    .lean()
                    .exec();

                  let kWhData = [];
                  let lastValue = 0;
                  if (dataBefore !== null) {
                    lastValue = dataBefore.Total_kWh;
                  }

                  for (let i = 0; i < totalKwhPerDay.length; i++) {
                    if (totalKwhPerDay[i] === null) {
                      kWhData.push(null);
                    } else {
                      let result = totalKwhPerDay[i] - lastValue;
                      // Trường hợp thay đồng hồ khác có chỉ số nhỏ hơn chỉ số cũ, nếu ngày đó thay đồng hồ thì chấp nhận mất dữ liệu của ngày đó
                      if (result < 0) {
                        kWhData.push(null);
                        lastValue = totalKwhPerDay[i];
                      } else {
                        kWhData.push(result);
                        lastValue = totalKwhPerDay[i];
                      }
                    }
                  }

                  const totalkWhTime = kWhData.reduce(
                    (acc, curr) => acc + curr,
                    0
                  );

                  dataEnergy = {
                    totalkWhTime: totalkWhTime,
                    labelTime: labelTime,
                    kWhData: kWhData,
                    totalKwhPerDay: totalKwhPerDay,
                    dataBefore: dataBefore,
                    rawData: resultData,
                  };
                }
                const lastedValueElectric = await ElectricsModel.findOne({
                  IdDevice: idElectricMetterNumber,
                  Time: { $lt: endTimeQuery },
                })
                  .sort({ Time: -1 })
                  .lean()
                  .exec();

                const beforeValueElectric = await ElectricsModel.findOne({
                  IdDevice: idElectricMetterNumber,
                  Time: { $lt: startTimeQuery },
                })
                  .sort({ Time: -1 })
                  .lean()
                  .exec();
                //note: CẦN XEM SUY NGHĨ THÊM VỀ CÁC CASE
                if (beforeValueElectric) {
                  typeElectricity = parseFloat(
                    (
                      lastedValueElectric.Total_kWh -
                      beforeValueElectric.Total_kWh
                    ).toFixed(3)
                  );
                } else {
                  typeElectricity = parseFloat(lastedValueElectric.toFixed(3));
                }

                json = {
                  idBill: getRandomHex2(),
                  phoneOwner: phoneOwner,
                  expireTime: expireTime,
                  dateBill: parsedTime,
                  nameMotel: nameMotel,
                  addressMotel: addressMotel,
                  nameRoom: nameRoom,
                  nameUser: nameUser,
                  phoneUser: phoneUser,
                  addressUser: addressUser,
                  addressOwner: addressOwner,
                  imgRoom: "",
                  emailUser: emailUser,
                  emailOwner: emailOwner,

                  totalAll:
                    unitPriceRoom +
                    typeElectricity * unitPriceElectricity +
                    typeWater * unitPriceWater +
                    typeGarbage * unitPriceGarbage +
                    typeWifi * unitPriceWifi +
                    typeOther * unitPriceOther,

                  totalAndTaxAll:
                    unitPriceRoom +
                    typeElectricity * unitPriceElectricity +
                    typeWater * unitPriceWater +
                    typeGarbage * unitPriceGarbage +
                    typeWifi * unitPriceWifi +
                    typeOther * unitPriceOther,

                  totalTaxAll: 0,
                  typeTaxAll: 0,
                  expenseRoom: "Chi Phí Phòng",
                  typeRoom: typeRoom,
                  unitPriceRoom: unitPriceRoom,
                  totalRoom: unitPriceRoom,
                  expenseElectricity: "Chi Phí Điện",
                  typeElectricity: typeElectricity,
                  unitPriceElectricity: unitPriceElectricity,
                  totalElectricity: typeElectricity * unitPriceElectricity,
                  expenseWater: "Chi Phí Nước",
                  typeWater: typeWater,
                  unitPriceWater: unitPriceWater,
                  totalWater: typeWater * unitPriceWater,
                  expenseGarbage: "Phí Dịch Vụ",
                  typeGarbage: typeGarbage,
                  unitPriceGarbage: unitPriceGarbage,
                  totalGarbage: typeGarbage * unitPriceGarbage,
                  expenseWifi: "Chi Phí Xe",
                  typeWifi: typeWifi,
                  unitPriceWifi: unitPriceWifi,
                  totalWifi: typeWifi * unitPriceWifi,
                  expenseOther: "Tiện Ích Khác",
                  typeOther: typeOther,
                  unitPriceOther: unitPriceOther,
                  totalOther: typeOther * unitPriceOther,
                };

                jsonTitle = {
                  idBill: getRandomHex2(),
                  phoneOwner: phoneOwner,
                  expireTime: expireTime,
                  dateBill: parsedTime,
                  nameMotel: nameMotel,
                  addressMotel: addressMotel,
                  nameRoom: nameRoom,
                  nameUser: nameUser,
                  phoneUser: phoneUser,
                  addressUser: addressUser,
                  addressOwner: addressOwner,
                  imgRoom: "",
                  emailUser: emailUser,
                  emailOwner: emailOwner,

                  totalAll:
                    unitPriceRoom +
                    typeElectricity * unitPriceElectricity +
                    typeWater * unitPriceWater +
                    typeGarbage * unitPriceGarbage +
                    typeWifi * unitPriceWifi +
                    typeOther * unitPriceOther,

                  totalAndTaxAll:
                    unitPriceRoom +
                    typeElectricity * unitPriceElectricity +
                    typeWater * unitPriceWater +
                    typeGarbage * unitPriceGarbage +
                    typeWifi * unitPriceWifi +
                    typeOther * unitPriceOther,

                  totalTaxAll: 0,
                  typeTaxAll: 0,
                  expenseRoom: "Chi Phí Phòng",
                  typeRoom: typeRoom,
                  unitPriceRoom: unitPriceRoom,
                  totalRoom: unitPriceRoom,
                  expenseElectricity: "Chi Phí Điện",
                  typeElectricity: typeElectricity,
                  unitPriceElectricity: unitPriceElectricity,
                  totalElectricity: typeElectricity * unitPriceElectricity,
                  expenseWater: "Chi Phí Nước",
                  typeWater: typeWater,
                  unitPriceWater: unitPriceWater,
                  totalWater: typeWater * unitPriceWater,
                  expenseGarbage: "Phí Dịch Vụ",
                  typeGarbage: typeGarbage,
                  unitPriceGarbage: unitPriceGarbage,
                  totalGarbage: typeGarbage * unitPriceGarbage,
                  expenseWifi: "Chi Phí Xe",
                  typeWifi: typeWifi,
                  unitPriceWifi: unitPriceWifi,
                  totalWifi: typeWifi * unitPriceWifi,
                  expenseOther: "Tiện Ích Khác",
                  typeOther: typeOther,
                  unitPriceOther: unitPriceOther,
                  totalOther: typeOther * unitPriceOther,
                };

                const configuration: ChartConfiguration = {
                  type: "line",
                  data: {
                    labels: dataEnergy.labelTime.map((item) =>
                      item ? item : "Chưa có dữ liệu"
                    ),
                    datasets: [
                      {
                        label: `Tổng số điện từ ${startTime} đến ${endTime}`,
                        data: dataEnergy.kWhData.map((item) =>
                          item ? item : 0
                        ),
                        backgroundColor: ["rgba(255, 99, 132, 0.2)"],
                        borderColor: ["rgba(255,99,132,1)"],
                        borderWidth: 1,
                        tension: 0.01,
                        fill: false,
                      },
                    ],
                  },
                  options: {
                    scales: {
                      x: {
                        title: {
                          display: true,
                          text: "Thời gian",
                        },
                      },
                      y: {
                        title: {
                          display: true,
                          text: "Số KwH",
                        },
                      },
                    },
                  },
                  plugins: [
                    {
                      id: "background-colour",
                      beforeDraw: (chart) => {
                        const ctx = chart.ctx;
                        ctx.save();
                        ctx.fillStyle = "white";
                        ctx.fillRect(0, 0, width, height);
                        ctx.restore();
                      },
                    },
                    {
                      id: "chart-data-labels",
                      afterDatasetsDraw: (chart, args, options) => {
                        const { ctx } = chart;
                        ctx.save();

                        // Configure data labels here
                        chart.data.datasets.forEach((dataset, i) => {
                          const meta = chart.getDatasetMeta(i);
                          meta.data.forEach((element, index) => {
                            const model = element;
                            const x = model.x;
                            const y = model.y;
                            const text = dataset.data[index]
                              ? (+dataset.data[index].toString()).toFixed(2)
                              : ""; // You can customize this based on your data
                            const font = "12px Arial"; // Example font setting
                            const fillStyle = "black"; // Example color setting
                            const textAlign = "center"; // Example alignment setting

                            ctx.fillStyle = fillStyle;
                            ctx.font = font;
                            ctx.textAlign = textAlign;
                            ctx.fillText(text, x, y);
                          });
                        });

                        ctx.restore();
                      },
                    },
                  ],
                };
                const chartBufferPNG = await chartJSNodeCanvas.renderToBuffer(
                  configuration
                );

                //push buffer vào mảng buffers

                totalJson[`${nameRoom}`] = json;
                console.log("buffersssssssssssssssssssssssssssssssssssss", buffers);

              } else {
                //không có id metter
              }
            } else {
              //phòng chưa được thuê
            }
          }
        }
        console.log("Titleeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", jsonTitle);
        // const buffer = await generatePDFBuilding(totalJson, banking, dataEnergy);
        const buffer = await generateCombinedPDF(totalJson, jsonTitle, banking, dataEnergy);
        const mergedBuffer = await mergeBuffers(buffer);


        results.push({ buffer: Buffer.from(mergedBuffer) });

        if (countRoomRented === 0) {
          const data = "Motel has no rented rooms";
          return HttpResponse.returnSuccessResponse(res, data);
        }
        if (countRoomHaveIdMetter === 0) {
          const data = "Motel has no rooms with idMetter";
          return HttpResponse.returnSuccessResponse(res, data);
        }
      } else {
        const data = "Motel has no floors";
        return HttpResponse.returnSuccessResponse(res, data);
      }

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "cr7ronadol12345@gmail.com",
          pass: "wley oiaw yhpl oupy",
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      const files = ["a.txt", "b.pdf", "c.png"];
      // thay email người nhận thành : emailOwner - chủ trọ
      const mailOptions = {
        from: "cr7ronadol12345@gmail.com",
        // to: "quyetthangmarvel@gmail.com",
        to: emailOwner,
        subject: `[${nameMotel} ] HÓA ĐƠN TỪ ${startTime} ĐẾN ${endTime}`,
        text: `Dãy phòng ${nameMotel} địa chỉ ${motelAddress.address}`,
        attachments: results.map((result) => ({
          filename: `Invoice - ${nameMotel} - from ${startTime} to ${endTime}.pdf`,
          content: result.buffer,
        })),
      };

      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.error(error);
        } else {
          console.log("Email đã được gửi: " + info.response);
        }
      });

      const data = "exportBillAllRoomSuccess";
      return HttpResponse.returnSuccessResponse(res, data);
    } catch (e) {
      console.log({ e });
      next(e);
    }
  }

  static async countElectric(jobId, startTime, endTime): Promise<number> {
    // 2024-03-01 YYYY-MM-DD
    console.log({jobId});
    console.log(typeof(jobId));
    console.log(jobId.length);
    console.log("startTime", startTime);
  
    const lastStartDay = new Date(startTime);
    console.log("lastStartDay", lastStartDay);
  
    console.log("endTime", endTime);
    const lastEndDay = new Date(endTime);
    lastEndDay.setHours(30, 59, 59, 999);
  
    console.log("lastEndDay", lastEndDay);
  
    console.log("Kết quả phép so sánh:", lastStartDay < lastEndDay);
  
    if (lastStartDay > lastEndDay) {
      return null;
    }
  
    const { 
      electrics: ElectricsModel,
      room: roomModel,
      job: jobModel } = global.mongoModel;
  
    try {
      const jobData = await jobModel.findOne({_id: jobId})
                                                          .lean()
                                                          .exec()
  
      console.log({jobData});
      if (jobData) {
        const roomId = jobData.room;
        const roomData = await roomModel.findOne(roomId)
                                                                    .lean()
                                                                    .exec();
        if (roomData) {
          const id = roomData.idElectricMetter;
          console.log({id});
          if (id) {
            const datesInRange: Date[] = [];
            let currentDate = new Date(lastStartDay);
  
            while (currentDate <= lastEndDay) {
              datesInRange.push(new Date(currentDate));
              currentDate.setDate(currentDate.getDate() + 1);
            }
  
            const resultData = [];
            for (const date of datesInRange) {
              // console.log("date", date);
              const endOfDay = new Date(date);
              // console.log("endOfDay", endOfDay);
              endOfDay.setHours(30, 59, 59, 999);
              // console.log("endOfDay", endOfDay);
  
              const query = {
                IdDevice: id,
                Time: {
                  $gte: date,
                  $lte: endOfDay,
                },
              };
  
              const result = await ElectricsModel.findOne(query)
                .sort({ Time: -1 })
                .lean()
                .exec();
              resultData.push(result);
              // console.log(
              //   `Dữ liệu ${id} vào cuối ngày ${date.toISOString()}:`,
              //   result
              // );
            }
  
            const totalKwhPerDay = resultData.map((item) =>
              item !== null ? item.Total_kWh : null
            );
  
            const labelTime: (string | null)[] = resultData.map((item) => {
              if (item !== null) {
                const date = new Date(item.Time);
                // console.log("date", date);
                const formattedDate = date.toISOString().split("T")[0];
                return formattedDate;
              } else {
                return null;
              }
            });
  
            // const labelTime = [];
            // console.log("labelTime", labelTime);
  
            const query = {
              IdDevice: id,
              Time: {
                $lte: lastStartDay,
              },
            };
  
            const dataBefore = await ElectricsModel.findOne(query)
              .sort({ Time: -1 })
              .lean()
              .exec();
  
            let kWhData = [];
            let lastValue = 0;
            if (dataBefore !== null) {
              lastValue = dataBefore.Total_kWh;
            }
  
            // const kWhArr = totalKwhPerDay.map(item => (item !== null ? item.Total_kWh : null));
  
            for (let i = 0; i < totalKwhPerDay.length; i++) {
              if (totalKwhPerDay[i] === null) {
                kWhData.push(null);
              } else {
                let result = totalKwhPerDay[i] - lastValue;
                // Trường hợp thay đồng hồ khác có chỉ số nhỏ hơn chỉ số cũ, nếu ngày đó thay đồng hồ thì chấp nhận mất dữ liệu của ngày đó
                if (result < 0) {
                  kWhData.push(null);
                  lastValue = totalKwhPerDay[i];
                } else {
                  kWhData.push(result);
                  lastValue = totalKwhPerDay[i];
                }
              }
            }
  
            const totalkWhTime = kWhData.reduce((acc, curr) => acc + curr, 0);
  
            const data = {
              totalkWhTime: totalkWhTime,
              labelTime: labelTime,
              kWhData: kWhData,
              totalKwhPerDay: totalKwhPerDay,
              dataBefore: dataBefore,
              rawData: resultData,
            };
  
            console.log({totalkWhTime});
            return totalkWhTime;
          } 
        }
      }
      return null;
    } catch (error) {
      console.log({error});
      return null;
    }
  }

  static async countElectricV2(jobId, startTime, endTime): Promise<number> {
    // 2024-03-01 YYYY-MM-DD
    console.log({jobId});
    console.log(typeof(jobId));
    console.log(jobId.length);
    console.log("startTime", startTime);
    
  
    if (new Date(startTime) > new Date(endTime)) {
      return null;
    }
  
    const { 
      room: roomModel,
      job: jobModel } = global.mongoModel;
  
    try {
      const jobData = await jobModel.findOne({_id: jobId})
                                                          .lean()
                                                          .exec()
  
      console.log({jobData});
      if (jobData) {
        const roomId = jobData.room;
        const roomData = await roomModel.findOne(roomId)
                                                                    .lean()
                                                                    .exec();
        if (roomData) {
          const totalkWhTime = await EnergyController.calculateElectricUsedDayToDay(
            roomData._id,
            startTime,
            endTime
          );
  
          return totalkWhTime;
        }
      }
      return null;
    } catch (error) {
      console.log({error});
      return null;
    }
  }

  static async hostBuildingList(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<any> {
    const idUser = req.params.idOwner;
    console.log("id User: ", idUser);
  
    let jsonMotel = {
      owner: idUser,
      motels: {} // Initialize an empty object for motels
    };
  
    const {
      motelRoom: motelRoomModel,
      floor: floorModel,
      room: roomModel,
      address: addressModel,
      user: userModel,
      job: jobModel,
      order: orderModel,
      bill: billModel,
    } = global.mongoModel;
  
    try {
      const motelInfor = await motelRoomModel
        .find({ owner: idUser })
        .lean()
        .exec();
      console.log("motelInfor", motelInfor);
  
      motelInfor.forEach((motel) => {
        const idMotel = motel._id;
        const nameMotel = motel.name;
        console.log("motelInfor", motel);
  
        // Add each motel to the motels object with name as key and id as value
        jsonMotel.motels[nameMotel] = idMotel;
      });
  
      console.log(jsonMotel); // This will show the final jsonMotel object
  
      return HttpResponse.returnSuccessResponse(res, jsonMotel);
    } catch (e) {
      console.log({ e });
      next(e);
    }
  }
  
  
  
  

  static async buildingRevenue(req: Request, res: Response, next: NextFunction): Promise<any> {
    const idMotel = req.params.idMotel;
    const year = req.params.year;

    console.log("idMotel", idMotel);
    console.log("year", year);

    let jsonMotel = [];

    const {
        order: orderModel,
      bill: billModel,
      motelRoom: motelRoomModel,
        revenue: revenueModel,
    } = global.mongoModel;

    try {
      const billData = await billModel.find({ motel: idMotel, type: "monthly" }).lean().exec();
      // console.log("billData", billData);
        
      let motelName = "";
      
      const motelData = await motelRoomModel.findOne({ _id: idMotel }).lean().exec();
      const hostId = motelData.owner;
      motelName = motelData.name;

      //get current month
      const currentDate = new Date();
      let previousMonth = currentDate.getMonth(); // Tháng trước (0-11)
      let previousYear = currentDate.getFullYear(); // Năm hiện tại

      if (previousMonth === 0) {
        // Nếu tháng hiện tại là tháng 1, thì tháng trước là tháng 12 của năm trước
        previousMonth = 12;
        previousYear -= 1;
      }

      // Định dạng timePeriod thành "YYYY-MM"
      const previousMonthFormatted = `${previousYear}-${previousMonth}`;

      const revenue = await revenueModel.findOne({
        hostId: hostId,
        timePeriod: previousMonthFormatted,
        isDeleted: false
      }).lean().exec();

      if (!revenue) {
        return HttpResponse.returnBadRequestResponse(res, "Không tìm thấy thông tin doanh thu");
      }
      const motels = revenue.motels;
      let remainingRevenue = 0;
      motels.forEach((motel) => {
        //motel.motelId is an objectId, idMotel is a string
        if (motel.motelId.toString() === idMotel) {
          console.log("motel", motel);
          
          const withdrawals = motel.withdrawals;
          console.log("withdrawals", withdrawals);
          if (withdrawals.lenth > 0) {
            remainingRevenue = motel.remainingRevenue;
          } else {
            remainingRevenue = motel.totalRevenue;
            console.log("remainingRevenue", remainingRevenue);
            
          }
        }
      });
        // Initialize revenue data for each month
        let monthlyRevenue = Array.from({ length: 12 }, (_, index) => ({ 
          name: motelName,
          total: 0,
          revenue: 0, 
            electricNumber: 0,
          electricPrice: 0,
          servicePrice: 0,
          waterPrice: 0,
          vehiclePrice: 0,
            time: `${index + 1}/${year !== "All Years" ? year : ""}` 
        }));

        // Initialize total revenue, electric number, and electric price
        let totalRevenue = 0;
        let totalElectricNumber = 0;
      let totalElectricPrice = 0;
      let total = 0;

        // Loop through each bill and find corresponding order
        for (const bill of billData) {
            const orderId = bill.order;
            const orderData = await orderModel.findOne({ _id: orderId, type: "monthly" }).lean().exec();
            // console.log("orderData", orderData);
            if (orderData) {
                const orderStartTime = new Date(orderData.startTime);
                const orderYear = orderStartTime.getFullYear();
                const orderMonth = orderStartTime.getMonth(); // 0-indexed (0 = January, 11 = December)

                if (year === "All Years" || orderYear === parseInt(year, 10)) {
                    monthlyRevenue[orderMonth].revenue += orderData.roomPrice || 0;
                    monthlyRevenue[orderMonth].electricNumber += orderData.electricNumber || 0;
                  monthlyRevenue[orderMonth].electricPrice += orderData.electricPrice || 0;
                  monthlyRevenue[orderMonth].servicePrice += orderData.servicePrice || 0;
                  monthlyRevenue[orderMonth].waterPrice += orderData.waterPrice || 0;
                  monthlyRevenue[orderMonth].vehiclePrice += orderData.vehiclePrice || 0;
                  monthlyRevenue[orderMonth].total += orderData.amount || 0;

                    // Update total revenue, electric number, and electric price
                  totalRevenue += orderData.roomPrice || 0;
                    totalElectricNumber += orderData.electricNumber || 0;
                  totalElectricPrice += orderData.electricPrice || 0;
                  total += orderData.amount || 0;
                }
            }
        }

        // Remove months with no revenue (if needed)
        jsonMotel = monthlyRevenue;

        // Add total revenue, electric number, and electric price to the response
        const response = {
            success: true,
            data: {
                monthlyRevenue: jsonMotel,
              totalRevenue,
              remainingRevenue,
                totalElectricNumber,
              totalElectricPrice,
              total,
            }
        };

        res.status(200).json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
}




  

  static async testFunction(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {

      // calculateElectricUsedDayToDayHaveLabelTime("")

      // const a = await helpers.getImageUrl("666012d86a765add7c01ad0e");
      // const a  = moment().startOf("months");
      // const b = moment().month();
      
      console.log(moment());

      const a  = moment("2024-07-08T17:00:00.000+00:00");
      console.log({a});

      // {
      //   const {
      //     user: userModel,
      //     order: orderModel,
      //     job: jobModel,
      //     room: roomModel,
      //     totalKwh: totalKwhModel,
      //     floor: floorModel,
      //     motelRoom: motelRoomModel,
      //   } = global.mongoModel;
        
  
      //   // let data = job.attrs.data;
      //   let resData = await JobController.getJobNoImg("668cb773f903ed2c40299481"); 
  
      //   if(resData) {
      //     const checkInDay = resData.checkInTime;
      //     const rentalPeriod = resData.rentalPeriod;
      //     const checkOutDay = moment(checkInDay).add(rentalPeriod, "months").subtract(1, "days"); //  chính xác ngày ở cuối 
  
      //     if (resData.isActived && !(resData.isDeleted)) {
      //       if(checkOutDay.clone().diff(moment(), "months") < 1) {
      //         const userData = await userModel.findOne({
      //           _id: resData.user._id
      //         }).lean().exec();
  
      //         console.log({userData});
  
      //         if(userData) {
      //           //Gửi mail nhắc nhở
      //           if(userData.email) {
      //             console.log("email: ", userData.email);
      //             const transporter = nodemailer.createTransport({
      //               service: 'gmail',
      //               auth: {
      //                   user: 'cr7ronadol12345@gmail.com',
      //                   pass: 'wley oiaw yhpl oupy'
      //               }
      //             });
  
      //             const mailOptions = {
      //                 from: 'cr7ronadol12345@gmail.com',
      //                 to: userData.email,
      //                 subject: `[${resData.room.name}] THÔNG BÁO GIA HẠN HỢP ĐỒNG TRỌ`,
      //                 text: `Phòng ${resData.room.name} thuộc dãy ${resData.motelRoom.name} của quý khách sẽ hết hợp đồng vào ${checkOutDay.clone().format("DD-MM-YYYY")}. Vui lòng truy cập trang web: ${process.env.BASE_PATH_CLINET1} thực hiện đăng nhập rồi vào đường dẫn ${process.env.BASE_PATH_CLINET3}job-detail/${resData._id}/${resData.room._id} để gian hạn hợp đồng. Lưu ý: Hợp đồng chỉ có thể gia hạn trước thời gian hết hạn 15 ngày.`,
      //             };
  
      //             transporter.sendMail(mailOptions, function (error, info) {
      //               if (error) {
      //                   console.error(error);
      //               } else {
      //                   console.log('Email đã được gửi: ' + info.response);
      //               }
      //             });
                  
      //             console.log(`Gửi tới mail: ${userData.email}`);
      //           } else {
      //             console.log(`User id: ${userData.user} không được tìm thấy hoặc chưa cập nhật email`);
  
      //             await global.agendaInstance.agenda.schedule(
      //               moment().add(1, "days").startOf("day").toDate(),
      //               "RemindUserRenewContractAndChangeStatusRoomBeforeOneMonth",
      //               { jobId: resData._id }
      //             );
      //           }
      //         }
  
      //         //thay đổi trạng thái phòng
      //         {
      //           await roomModel.findOneAndUpdate({_id: resData.room}, {
      //             status: 'soonExpireContract',
      //           })
    
      //           // cập nhật lại floor
      //           let floorData = await floorModel
      //             .findOne({ rooms: resData.room._id })
      //             .populate("rooms")
      //             .lean()
      //             .exec();
      //           const roomGroup = lodash.groupBy(floorData.rooms, (room) => {
      //             return room.status;
      //           });
      
      //           await floorModel
      //             .findOneAndUpdate(
      //               { _id: floorData._id },
      //               {
      //                 availableRoom: roomGroup["available"]
      //                   ? roomGroup["available"].length
      //                   : 0,
      //                 soonExpireContractRoom: roomGroup["soonExpireContract"]
      //                   ? roomGroup["soonExpireContract"].length
      //                   : 0,
      //                 rentedRoom: roomGroup["rented"] ? roomGroup["rented"].length : 0,
      //                 depositedRoom: roomGroup["deposited"]
      //                   ? roomGroup["deposited"].length
      //                   : 0,
      //               }
      //             )
      //             .exec();
                  
      //           let motelRoomData = await motelRoomModel
      //             .findOne({ floors: floorData._id })
      //             .populate("floors")
      //             .lean()
      //             .exec();
    
      //           let updateData = {
      //             availableRoom: lodash.sumBy(motelRoomData.floors, "availableRoom"),
      //             rentedRoom: lodash.sumBy(motelRoomData.floors, "rentedRoom"),
      //             depositedRoom: lodash.sumBy(motelRoomData.floors, "depositedRoom"),
      //             soonExpireContractRoom: lodash.sumBy(motelRoomData.floors, "soonExpireContractRoom"),
      //           };
    
      //           await motelRoomModel
      //             .findOneAndUpdate({ _id: motelRoomData._id }, updateData)
      //             .exec();
      //         }
      //       }
      //     } else {
      //       await global.agendaInstance.agenda.schedule(
      //         checkOutDay.clone().subtract(1, "months").startOf("day").toDate(),
      //         "RemindUserRenewContractAndChangeStatusRoomBeforeOneMonth",
      //         { jobId: resData._id }
      //       );
      //     }
      //   }
      // }


      // console.log({b});
      // console.log(typeof(b));
      // console.log({c})
      
      // let data = [
      //   { "label": "05-2024", "value": 29.12, "price": 101920, "user": {} },
      //   { "label": "07-2024", "value": 30.5, "price": 102000, "user": {} },
      //   { "label": "07-2024", "value": 30.1, "price": 102000, "user": {} },
      //   { "label": "05-2024", "value": 29.5, "price": 101920, "user": {} },
      //   // Các đối tượng khác...
      // ];

      // const year = data[0].label.split("-")[1];

      // const monthsOfYear = Array.from({ length: 12 }, (_, i) => {
      //   const month = (i + 1).toString().padStart(2, "0");
      //   return `${month}-${year}`;
      // });

      // console.log({monthsOfYear})
      
      // // Tạo một tập hợp các tháng đã tồn tại trong mảng
      // let existingMonths = new Set(data.map(item => item.label));
      
      // // Thêm các tháng còn thiếu vào mảng
      // monthsOfYear.forEach(month => {
      //   if (!existingMonths.has(month)) {
      //     data.push({
      //       label: month,
      //       value: null,
      //       price: null,
      //       user: null
      //     });
      //   }
      // });
      
      // // Sắp xếp lại mảng theo thứ tự tháng
      // data.sort((a, b) => {
      //   const [monthA, yearA] = a.label.split("-").map(Number);
      //   const [monthB, yearB] = b.label.split("-").map(Number);
      //   return yearA - yearB || monthA - monthB;
      // });
      
      // console.log(data);
      // const {room: roomModel, totalKwh: totalKwhModel, 
      //   order: orderModel, job: jobModel,
      //   bill: billModel, optionsType: optionsTypeModel,
      // } = global.mongoModel;
      // const orderId = '664d28ba4a755b6434ac92c1';
      // const orderData = await orderModel.findOne({_id: orderId}).lean().exec();
      // const jobData = await jobModel.findOne({orders: orderData._id}).lean().exec();
      // let dataElectricAll = await EnergyController.calculateElectricUsedDayToDayHaveLabelTime(
      //   jobData.room, 
      //   orderData.startTime, 
      //   orderData.endTime,
      // );

      // const roomData = await roomModel.findOne({_id: jobData.room}).lean().exec();


      // let electricNumber = 0;
      // let labelTime: string[] = [];
      // let kWhData: number[] = [];
      // if (dataElectricAll === null) {
      //   electricNumber = 0;
      // } else {
      //   electricNumber = dataElectricAll.totalkWhTime;
      //   labelTime = dataElectricAll.labelTime;
      //   kWhData = dataElectricAll.kWhData;
      // }

      // await totalKwhModel.create({
      //   order: orderData._id,
      //   kWhData: kWhData,
      //   labelTime: labelTime,
      // });

      // const electricPrice = roomData.electricityPrice * electricNumber;

      // await orderModel.findOneAndUpdate(
      //   {_id: orderId},
      //   {
      //     electricPrice: electricPrice,
      //     electricNumber: electricNumber,
      //   },
      // )

      // const billData = await billModel.findOne({order: orderId}).lean().exec();
      // if(billData){
      //   // const electricData = optionsTypeModel.findOne({_id: billData.electricity}).lean().exec();
      //   await optionsTypeModel.findOneAndUpdate(
      //     {_id: billData.electricity},
      //     {
      //       type: electricNumber.toString(),
      //       total: electricPrice.toString(),
      //     }
      //   )
      // }



      // let x = await JobController.getJobNoImg("664d27ea4a755b6434ac92b5");
      // console.log({x});
      // console.log(x.room);
      // const a = await roomModel.findOne({_id: x.room}).lean().exec();
      // console.log({a});

      // const a = moment(new Date("12/04/2024"));
      // console.log({a})
      // const a : number = 3.123123;
      // const b: number = parseFloat(a.toFixed(2));
      // console.log({b});

      // const a = moment();
      // console.log({a});
      // const b = a.toDate();
      // console.log({b});
      // const c = moment(b);
      // console.log({c});

      // 663336dc2c01a43510a32ea1: test ngày
//       -- CASE 1: 4 device
// -- device1 = 'ab7a8c9a-6b56-481f-9fa9-a779e0e02b1a'; "2024-05-04T04:00:00" -> "2024-05-04T09:00:00"
// -- device2 = 'a58b933e-6a94-4ffc-9cc1-97e64001a819'; "2024-05-04T10:00:00" -> "2024-05-04T18:00:00"
// -- device3 = 'd0e894a3-4b6a-4137-a782-a0bb5d6c1994'; "2024-05-04T19:00:00" -> "2024-05-05T03:00:00"
// -- device4 = 'd5c6cd8f-aee5-4dec-bfc8-0d4b9b027b57'; "2024-05-05T04:00:00" -> hnay

      //663336dc2c01a43510a32ea0: test tháng
      // -- CASE 2: 5 device
// -- device1: 'be6db39d-485c-45a4-b19c-d358717e7c92'; "2024-01-03T19:00:00" -> "2024-01-16T20:00:00"
// -- device2: '3330ad03-f7fe-47e0-99d1-f88b7cf21d51'; "2024-01-16T23:00:00" - "2024-02-03T14:00:00"
// -- device3: '4f3abc4a-8be3-4a0e-91f7-4291b7e2750b'; "2024-02-03T18:00:00" - "2024-02-23T18:00:00"
// -- device4: 'c6208e6d-b48a-462e-ba28-f05269d767bf'; "2024-02-23T23:00:00" - "2024-03-14T22:00:00"
// -- device5: '1d84e187-fdd9-44be-960a-c473c42a6f00'; "2024-03-15T00:32:00" - "2024-04-02T21:32:00"

// const a = await EnergyController.calculateElectricUsedDayToDayHaveLabelTime(
//   "663336dc2c01a43510a32ea1",
//   "2024-05-04",
//   "2024-05-22"
// );
// const today = new Date();
// const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
// const dateStay = Math.ceil(Math.abs(lastDay - today) / (24 * 3600 * 1000));
// console.log({dateStay});
// console.log({a});

      // const {
      //   room: roomModel,
      //   floor: floorModel,
      //   motelRoom: motelRoomModel,
      //   job: jobModel,
      //   user: userModel,
      //   order: orderModel,
      //   transactions: TransactionsModel,
      //   bill: BillModel,
      //   optionsType: OptionsTypeModel,
      //   totalKwh: totalKwhModel,
      // } = global.mongoModel;

      // const a = await motelRoomModel.find({isDeleted: false}).lean().exec();
      // console.log({a})
      // console.log(a.length);
      // for(let i = 0; i< a.length; i++) {
      //   await motelRoomModel.findOneAndUpdate(
      //     {_id: a[i]._id},
      //     {isAcceptedByAdmin: true}
      //   )
      // }

      // const startOfMonth = '2024-05-01';
      // const endOfMonth = '2024-05-31';

      // let data = EnergyController.calculateElectricUsedDayToDayHaveLabelTime("6640d72526fe12180875ab7a", startOfMonth, endOfMonth);
      // console.log({data})

      // const a = await orderModel.findOne({
      //   _id: "664d27ea4a755b6434ac92b6",
      //   isDeleted: false
      // }) .lean().exec();
      // console.log({a});
      // const a = new Date();
      // const checkInTime = moment(a)
      //   .utcOffset(420)
      //   .format("MM/DD/YYYY");
      // console.log({checkInTime});
      // const b = moment(a)
      //   .utcOffset(420)
      // console.log({b});
      // const a = await totalKwhModel.create({
      //   totalKwh : [1, 3, 6],
      //   // labelTime : ["hi", "hii"],
      // });
      // console.log({a});

      // const transactionData = await TransactionsModel.findOne({_id: "664a005edb40087178ce80ca"}).populate("order").lean().exec();
      // console.log({transactionData});
      // console.log(parseInt(transactionData.order.amount));

      // const a = await TransactionsModel.find({
      //   motel: "663336dd2c01a43510a32ead"
      // })
      // console.log({a});
      // // const newRoom = await roomModel.create()

      // // room: 663336db2c01a43510a32e9f
      // const dataUpdate = await roomModel.findOneAndUpdate(
      //   {_id: "663336dc2c01a43510a32ea8"},
      //   {
      //     $addToSet: { 
      //       // listIdElectricMetter:  { "timestamp": new Date("2024-05-02T13:00:00"), "value": "id_metter_test_1" },
      //       listIdElectricMetter: { "timestamp": "2024-03-15T16:11:00", "value": "caa57f62-a04d-4338-b98b-22bf6c43f029" }
      //     },
      //     // "idTest": [
      //     //   { "timestamp": "2024-05-01T12:00:00", "value": "55497245-4cc8-415c-9794-118715dc08f9" },
      //     //   { "timestamp": "2024-05-02T13:00:00", "value": "id_metter_test_1" },
      //       // { "timestamp": "2024-05-03T14:00:00", "value": "id_metter_test_2" },
      //       // { "timestamp": "2024-05-04T14:00:00", "value": "id_metter_test_3" },
      //       // { "timestamp": "2024-05-05T14:00:00", "value": "id_metter_test_4" },
      //       // { "timestamp": "2024-05-06T14:00:00", "value": "id_metter_test_5" },
      //     // ]
      //   },
      //   {new: true}
      // );

      
      // let date = moment('2024-05-25', 'YYYY-MM'); // Lấy ngày đầu tiên của tháng (ví dụ: tháng 5 năm 2024)
      // console.log({date});
      // let lastDayOfMonth = date.endOf('month').format('YYYY-MM-DD');
      // let lastDayOfMonthX = date.endOf('month').format('YYYY-MM-DD HH:mm:ss');
      // let lastDayOfMonthY = date.startOf('month').format('YYYY-MM-DD HH:mm:ss');
      // let lastDayOfMonthZ = date.endOf('month').format("YYYY-MM-DDTHH:mm:ssZ");
      // console.log({lastDayOfMonth});
      // console.log({lastDayOfMonthX});
      // console.log({lastDayOfMonthY});
      // console.log({lastDayOfMonthZ});
      // console.log(moment(lastDayOfMonthY));

      // const a = [{
      //     "ts": "2024-04-03T00:00:00",
      //     "value": 152.779998779297
      //   },
      //   {
      //     "ts": "2024-04-02T00:00:00",
      //     "value": 152.220001220703
      //   },
      //   {
      //     "ts": "2024-04-07T00:00:00",
      //     "value": 152.050003051758
      //   },
      //   {
      //     "ts": "2024-04-09T00:00:00",
      //     "value": 151.729995727539
      //   },]

      // const b = await fillNullForDataElectricEmptyDayToDay(
      //   a,
      //   moment("2024-03-28T00:00:00"),
      //   moment("2024-04-09T23:59:59")
      // );

      // console.log({b});

      // const a = moment().subtract(1, "days").set({ hour: 23, minute: 59, second: 59 });
      // console.log({a});
      // console.log(moment());
      // console.log(moment().date());
      // console.log(moment().hour());
      // const today = moment();
      // const start = moment().subtract(1, 'months');
      // console.log({start});
      // const today2 = moment();
      // const end = moment().subtract(1, 'days')
      // console.log({end});

      // const result = await countElectric("662765f2ec10a6a8540d057d", start, end);
      // console.log({result});

      // const formattedDate = start.format('YYYY-MM-DD');
      // const formattedDate1 = end.format('YYYY-MM-DD');
      // console.log({formattedDate});
      // console.log({formattedDate1});
      // console.log(typeof(formattedDate));
      // console.log(typeof(formattedDate1));
      // console.log({formattedDate});
      // const date = new Date(formattedDate);
      // date.setMonth(date.getMonth() - 1);
      // console.log({date});
      // const endDate = new Date(formattedDate);
      // // endDate.setHours(30, 59, 59, 99);
      // endDate.setDate(endDate.getDate() - 1);
      // console.log({endDate});
      // console.log(endDate);

      // const day = new Date();
      // console.log({day});

      // day.setMonth(day.getMonth() + 1);
      // console.log({day});

      // let jobData = await JobController.getJobNoImg("6628b944d25025da9879fdaf");
      // console.log("tttt",typeof(jobData.rentalPeriod));
      // console.log(jobData.checkInTime);
      // console.log(typeof(jobData.checkInTime));
      // console.log(jobData.checkInTime.getDate());
      // console.log(jobData.checkInTime.getHours());
      // console.log(new Date(jobData.checkInTime));
      // const checkoutDay = new Date(jobData.checkInTime);
      // checkoutDay.setMonth(checkoutDay.getMonth() + 1);
      // checkoutDay.setDate(checkoutDay.getDate() - 1);
      // console.log({checkoutDay});
      // console.log(moment(checkoutDay).format("YYYY-MM-DD"));
      // console.log(moment().add("1", "months").subtract("1", "days").format("YYYY-MM-DD"));
      // console.log(moment().add("1", "months").subtract("1", "days").date());
      // console.log(typeof(moment().add("1", "months").subtract("1", "days").date()));
      // console.log(moment().add("1", "months").subtract("1", "days").toDate());
      // console.log(moment().endOf("days"));
      // console.log(moment().endOf("months"));
      // console.log(moment("2024-02-01").subtract(1, "months").startOf("months"));
      // console.log(moment().subtract(1, "months").endOf("months"));

      // console.log(moment("2024-02-01").add(1, "months").subtract(1, "days"));

      // console.log("Số ngày trong tháng: ", moment("2024-02-06").daysInMonth());

      // console.log(Math.abs(moment().startOf("months").diff(moment(), "days")));
      // console.log((moment().startOf("months").diff(moment(), "days")));
      // console.log(moment().add(1, "days").add(2, "hours"));
      // console.log(moment().add(1, "days").add(2, "hours").toDate());

      // console.log("Compare time: ", (moment("2023-12-24").diff(moment("2024-01-02")))/(24*60*60*1000));



      // const start = moment(jobData.checkInTime).format("YYYY-MM-DD");
      // const end = moment(jobData.checkInTime).endOf("month").format("YYYY-MM-DD");
      // console.log({start});
      // console.log({end});
      // console.log(moment(jobData.checkInTime).month());

      // const { job: jobModel, order: orderModel } = global.mongoModel;

      // const jobData = await jobModel.create({user : "hihi"});

      // const orderData = await orderModel.create({ amount: 9000});

      // let jobDataUpdate = {
      //   $addToSet: {
      //     orders: orderData._id,
      //   },
      // }

      // await jobModel.findOneAndUpdate({_id: jobData._id}, jobDataUpdate);

      // const {payDepositList: payDepositListModel, job: JobModel,
      //   order: orderModel
      //  } = global.mongoModel;

      // await PayDepositListModel.create({amount: 999, reasonNoPay: "noActive"});

      // const jobData = await JobModel.findOne({_id: "6614e2cd6a6cdb88e01b5113"});

      // const a = await JobModel.findOneAndUpdate(
      //   {_id: "662b06613c30a541fc3c5eb2"},
      //   {user: "xxx"},
      //   { new: true }
      // );
      // console.log({a});

      // const orderData = await orderModel.findOne({_id: "65d6fee79f63317700f0f515"});
      // console.log({orderData});

      // const payDepositTemp = await payDepositListModel.create({
      //   room: jobData.room,
      //   user: jobData.user,
      //   job: jobData._id,
      //   type: "noPayDeposit",
      //   reasonNoPay: "noPayMonthly",
      //   amount: jobData.deposit + jobData.afterCheckInCost,
      //   ordersNoPay: orderData._id
      // });

      // console.log({payDepositTemp});
      // const monInEnd = (moment().month() + 1) < 10 ? ("0" + (moment().month() + 1)) : (moment().month() + 1);
      // const end = moment().year() + "-" + monInEnd + "-" + moment().date();
      // const monInEnd = (moment("2024-10-03").month() + 1) < 10 ? ("0" + (moment("2024-10-03").month() + 1)) : (moment("2024-10-03").month() + 1);
      // const end = moment("2024-10-03").year() + "-" + monInEnd + "-" + moment("2024-10-03").date();
      // console.log({end})

      // await PayDepositListModel.findOneAndUpdate({_id: payDepositTemp._id}, 
      //   {$addToSet: { ordersNoPay: orderData._id }}
      // )
      // console.log(moment());
      // console.log(moment().add(1, "days"))
      // console.log(moment().add(1, "days").startOf("days"))

      

      // console.log({dataUpdate});
      // const data = await roomModel.findOne({_id: "663336db2c01a43510a32e9f"});
      // console.log({data});
      // // console.log(data.listIdElectricMetter);
      // const listId: DataIdMetterType[] = data.listIdElectricMetter;

      // const start = moment('2024-05-08T10:00:00');
      // const end = moment('2024-05-09T11:00:00');

      // console.log({listId});

      // const result = await checkRangeTimeForIdMetter(listId, start, end);
      // console.log({result});

      // console.log(moment());
      // console.log(typeof(moment().format()));


      
    
      
      // let floorData = await floorModel
      //           .findOne({_id: "663336dc2c01a43510a32ea2"})
      //           .populate("rooms")
      //           .lean()
      //           .exec();
      //         const roomGroup = lodash.groupBy(floorData.rooms, (room) => {
      //           return room.status;
      //         });
      //         if (roomGroup["available"]){
      //           console.log("available: ", roomGroup["available"].length);
      //         }
              
      //         if (roomGroup["soonExpireContract"]){
      //           console.log("soonExpireContract: ", roomGroup["soonExpireContract"].length);
      //         }
      //         if (roomGroup["rented"]){
      //           console.log("rented: ", roomGroup["rented"].length);
      //         }
      //         if (roomGroup["deposited"]){
      //           console.log("deposited: ", roomGroup["deposited"].length);
      //         }

  
      //         console.log("--------------------");
      // let floorData2 = await floorModel
      //           .findOne({_id: "663336dc2c01a43510a32ea7"})
      //           .populate("rooms")
      //           .lean()
      //           .exec();
      //         const roomGroup2 = lodash.groupBy(floorData2.rooms, (room) => {
      //           return room.status;
      //         });
      //         if (roomGroup2["available"]){
      //           console.log("available: ", roomGroup2["available"].length);
      //         }
              
      //         if (roomGroup2["soonExpireContract"]){
      //           console.log("soonExpireContract: ", roomGroup2["soonExpireContract"].length);
      //         }
      //         if (roomGroup2["rented"]){
      //           console.log("rented: ", roomGroup2["rented"].length);
      //         }
      //         if (roomGroup2["deposited"]){
      //           console.log("deposited: ", roomGroup2["deposited"].length);
      //         }

      //         let motelRoomData = await motelRoomModel
      //         .findOne({ floors: floorData._id })
      //         .populate("floors")
      //         .lean()
      //         .exec();
  
      //         console.log("--------------------");
      //         console.log("available: ", lodash.sumBy(motelRoomData.floors, "availableRoom"))
      //         console.log("rentedRoom: ", lodash.sumBy(motelRoomData.floors, "rentedRoom"))
      //         console.log("depositedRoom: ", lodash.sumBy(motelRoomData.floors, "depositedRoom"))
      //         console.log("soonExpireContractRoom: ", lodash.sumBy(motelRoomData.floors, "soonExpireContractRoom"))

      // "https://api.tbedev.cloud/api/telemetry/metrics/values?device_id=55497245-4cc8-415c-9794-118715dc08f9&key=Total%20kWh&start=2024-04-01T00%3A00%3A00&end=2024-04-30T23%3A59%3A59&interval_type=DAY&interval=1&agg_type=MAX&limit=30"

      // "Current",
      // "Frequency",
      //  "Power",
      // "Total kWh",
      // "Voltage"          
      // SECOND, MINUTE, HOUR, DAY, WEEK, MONTH
        //SUM, AVG, MIN, MAX, COUNT  

      
      // const rs = await EnergyController.getElectricPerHour(
      //   '2024-05-03', 
      //   '2024-05-03',
      //   '55497245-4cc8-415c-9794-118715dc08f9',
      //   'Total kWh',
      // );
      // console.log({rs});

      // console.log(moment().format());\
      // const a = moment();
      // console.log({a});
      // const b = moment(a);
      // console.log({b});

      // let rawDataElectricInDay = [
      //   {
      //     "ts": "2024-04-03T23:00:00",
      //     "value": 152.779998779297
      //   },
      //   {
      //     "ts": "2024-04-03T21:00:00",
      //     "value": 152.220001220703
      //   },
      //   {
      //     "ts": "2024-04-03T20:00:00",
      //     "value": 152.050003051758
      //   },
      //   {
      //     "ts": "2024-04-03T18:00:00",
      //     "value": 151.729995727539
      //   },
      //   {
      //     "ts": "2024-04-03T17:00:00",
      //     "value": 151.619995117188
      //   },
      //   {
      //     "ts": "2024-04-03T16:00:00",
      //     "value": 151.509994506836
      //   },
      //   {
      //     "ts": "2024-04-03T14:00:00",
      //     "value": 151.429992675781
      //   },
      //   {
      //     "ts": "2024-04-03T13:00:00",
      //     "value": 151.399993896484
      //   },]

      //   rawDataElectricInDay = rawDataElectricInDay.reverse();

      //   const kWhDataWithTime = [];

      //   let lastValue = 150;

      // for (let i = 0; i < rawDataElectricInDay.length; i++) {
      //   let result = rawDataElectricInDay[i].value - lastValue;
      //   kWhDataWithTime.push({"ts": rawDataElectricInDay[i].ts, "value": result});
      //   lastValue = rawDataElectricInDay[i].value;
      // }

      // let arr1 = [];
      // let arr2 = [4, 5, 6];
      // let arr3 = [7, 8, 9];

      // let mergedArray = arr1.concat(arr2, arr3);
      // console.log({mergedArray}); // Kết quả: [1, 2, 3, 4, 5, 6, 7, 8, 9]

      // const a = [
      //   {
      //     "ts": "2024-04-03T23:00:00",
      //     "value": 152.779998779297
      //   },
      //   {
      //     "ts": "2024-04-03T22:00:00",
      //     "value": 152.529998779297
      //   },
      //   {
      //     "ts": "2024-04-03T21:00:00",
      //     "value": 152.220001220703
      //   },
        
      //   {
      //     "ts": "2024-04-03T19:00:00",
      //     "value": 151.839996337891
      //   },
      //   {
      //     "ts": "2024-04-03T18:00:00",
      //     "value": 151.729995727539
      //   },
        
      //   {
      //     "ts": "2024-04-03T16:00:00",
      //     "value": 151.509994506836
      //   },
      //   {
      //     "ts": "2024-04-03T14:00:00",
      //     "value": 151.429992675781
      //   },
      //   {
      //     "ts": "2024-04-03T15:00:00",
      //     "value": 151.459991455078
      //   },
        
      //   {
      //     "ts": "2024-04-03T13:00:00",
      //     "value": 151.399993896484
      //   },]

      //   // a.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());

      //   const result = await fillNullForDataElectricEmptyInOneDay(a);

      // let result = 5 + null;
      // console.log(result); // Kết quả: 5 + 0 = 5

      // let array = [
      //   {
      //     "ts": "2024-04-03T20:00:00",
      //     "value": 6
      //   },
      //   {
      //     "ts": "2024-04-03T21:00:00",
      //     "value": null
      //   },
      //   {
      //     "ts": "2024-04-03T23:00:00",
      //     "value": 5
      //   },
      //   {
      //     "ts": "2024-04-03T22:00:00",
      //     "value": null
      //   },
      //   // Các mục khác
      // ];
      
      // let sum = array.reduce((accumulator, currentValue) => {
      //   if (currentValue.value !== null) {
      //     return accumulator + currentValue.value;
      //   } else {
      //     return accumulator;
      //   }
      // }, 0);

      // console.log({sum});

      // let tsArray = array.map(item => item.ts);
      // let valueArray = array.map(item => item.value);
      // console.log({tsArray});
      // console.log({valueArray});


        

      
              
      const xx = "Success";
      return HttpResponse.returnSuccessResponse(res, xx);
    } catch (error) {
      console.log({error});
      next(error);
    }
  }

  static async getTotalKWhPerHourInOneDay (
    req: Request,
    res: Response,
    next: NextFunction
  ) : Promise<any> {
    const day : string = req.params.day;
    const idRoom : string = req.params.idRoom;

    try {
      const { room: roomModel } = global.mongoModel;

      const roomData = await roomModel.findOne({_id: idRoom}).lean().exec();
      if (!roomData) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Không tìm được phòng"
        );
      }

      if (!roomData.idElectricMetter) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Phòng chưa có id đồng hồ"
        );
      } 

      // const id = roomData.idElectricMetter;
      // 6446d888-a4fb-47df-90dc-c078d30fbf70
      const id: string = '55497245-4cc8-415c-9794-118715dc08f9';
      let rawDataElectricInDay = await EnergyController.getElectricPerHour(
        day, //start
        day, //end
        id,
        'Total kWh', //key
      );

      rawDataElectricInDay = rawDataElectricInDay.reverse();

      const dayBefore = moment(day).subtract(1, "days");
      console.log({dayBefore});
      let dayBeforeOneMonth  = moment(dayBefore).subtract(1, "months");

      // start: string, 
        // end: string, 
        // id: string, 
        // key: string, 
        // intervalType: string,
        // interval: number,
        // aggType: string,

      const dataCountOneMonthBefore = await EnergyController.getElectric(
        dayBeforeOneMonth.format("YYYY-MM-DD"),
        dayBefore.format("YYYY-MM-DD"),
        id,
        'Total kWh',
        'MONTH',
        1,
        'COUNT',
      );

      //dataCountOneMonthBefore có thể chứa count của nhiều tháng 
      //(mặc dù kt 1 tháng nhưng không phải khi nào cũng bắt đầu từ đầu tháng)
      //ví dụ:    [
                  //   {
                  //     "ts": "2024-05-01T00:00:00",
                  //     "value": 590
                  //   },
                  //   {
                  //     "ts": "2024-04-01T00:00:00",
                  //     "value": 2046
                  //   }
                  // ]
      //cần lặp qua để kiểm tra xem các tháng có dữ liệu hay không: 
      // count != dataCountOneMonthBefore.length => trong vòng 1 tháng trước đó có dữ liệu
      let count = 0;
      let positionHaveData = -1;
      for (let i = 0; i < dataCountOneMonthBefore.length; i++) {
        if(dataCountOneMonthBefore[i].value !== 0) {
          positionHaveData = i;
          break;
        } else {
          count++;
        }
      }
      const rawDataElectricInDayLength = rawDataElectricInDay.length;
      if (rawDataElectricInDayLength === 0) {
        return HttpResponse.returnBadRequestResponse(
          res, 
          "Không có dữ liệu năng lượng"
        );

      //1 tháng trước không có dữ liệu, mà dữ liệu trong khoảng thời gian hiện tại chỉ có 1 => không thể tính được
      //số điện dùng của tháng hiện tại
      } else if (rawDataElectricInDayLength === 1 && count === dataCountOneMonthBefore.length) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Chỉ có 1 bản ghi dữ liệu vào ngày hôm nay, đã 1 tháng kể từ trước hôm nay không có dữ liệu, không thể tính được điện đã sử dụng"
        )

      // 1 tháng về trước không có dữ liệu, tuy nhiên dữ liệu trong khoảng thơi gian hiện tại là từ 2 bản ghi 
      //trở lên => lấy bản ghi đầu tiên làm mốc để tính
      } else if (rawDataElectricInDayLength >= 2 && count === dataCountOneMonthBefore.length) {
        // lấy giá trị đầu tiên của ngày làm mốc

        // --------------------------------------------------
        // let kWhData = [];
        // let lastValue = rawDataElectricInDay[0].value;

        // let newRawDataElectricInDay: DataElectricType[] = [];
        

        // if(rawDataElectricInDayLength < 24) {
        //   newRawDataElectricInDay = await fillNullForDataElectricEmptyInOneDay(rawDataElectricInDay);
        // } else {
        //   newRawDataElectricInDay = rawDataElectricInDay;
        // }

        // const labelTime = newRawDataElectricInDay.map((data) => {
        //   return data.ts;
        // })

        // for (let i = 0; i < newRawDataElectricInDay.length; i++) {
        //   if (newRawDataElectricInDay[i].value === null) {
        //     kWhData.push(null);
        //   } else {
        //     let result = newRawDataElectricInDay[i].value - lastValue;
        //     kWhData.push(parseFloat(result.toFixed(3)));
        //     lastValue = newRawDataElectricInDay[i].value;
        //   }
        // }

        // const totalkWhTime = kWhData.reduce((acc, curr) => acc + curr, 0);

        // console.log({totalkWhTime})

        // const resResult = {
        //   totalkWhTime: totalkWhTime,
        //   labelTime: labelTime,
        //   kWhData: kWhData,
        // }
        //----------------------------------------

        const resResult = await caculateElectricInOneDayForNoDataBefore(rawDataElectricInDay, rawDataElectricInDayLength);

        return HttpResponse.returnSuccessResponse(res, resResult);
      }

      //TH BÌNH THƯỜNG: có dữ liệu trong vòng 1 tháng trước đó
      const timeHaveDataBeforeLatest : string = dataCountOneMonthBefore[positionHaveData].ts;

      const resResult = await caculateElectricInOneDayForHaveDataBefore(
        rawDataElectricInDay,
        rawDataElectricInDayLength,
        id,
        timeHaveDataBeforeLatest,
        dayBefore
      );

      console.log({resResult})

      //------------------------------------------------------------
      // const dataElectricLatestBeforeDay = await EnergyController.getElectric(
      //   moment(timeHaveDataBeforeLatest).format("YYYY-MM-DD"),
      //   dayBefore.format("YYYY-MM-DD"),
      //   id,
      //   'Total kWh',
      //   'DAY',
      //   1,
      //   'MAX',
      // );

      // console.log({dataElectricLatestBeforeDay});
      // let dataBeforeDay = dataElectricLatestBeforeDay[0];
      // console.log({dataBeforeDay});

      // let newRawDataElectricInDay: DataElectricType[] = [];
      

      // if(rawDataElectricInDayLength < 24) {
      //   newRawDataElectricInDay = await fillNullForDataElectricEmptyInOneDay(rawDataElectricInDay);
      // } else {
      //   newRawDataElectricInDay = rawDataElectricInDay;
      // }

      // const labelTime = newRawDataElectricInDay.map((data) => {
      //   return data.ts;
      // })

      // let kWhData = [];
      // let lastValue = 0;
      // if (dataBeforeDay.value !== null) {
      //   lastValue = dataBeforeDay.value;
      // }

      // for (let i = 0; i < newRawDataElectricInDay.length; i++) {
      //   if (newRawDataElectricInDay[i].value === null) {
      //     kWhData.push(null);
      //   } else {
      //     let result = newRawDataElectricInDay[i].value - lastValue;
      //     kWhData.push(parseFloat(result.toFixed(3)));
      //     lastValue = newRawDataElectricInDay[i].value;
      //   }
      // }

      // const totalkWhTime = kWhData.reduce((acc, curr) => acc + curr, 0);

      // console.log({totalkWhTime});

      // const resResult = {
      //   totalkWhTime: totalkWhTime,
      //   labelTime: labelTime,
      //   kWhData: kWhData,
      // }
      //-----------------------------------------------

      return HttpResponse.returnSuccessResponse(res, resResult);
    } catch (error) {
      next(error);
    }
  }


  //xử lý việc thay đồng hồ
  static async getTotalKWhPerHourInOneDayV2(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<any> {
    try {
      const day : string = req.params.day;
      const idRoom : string = req.params.idRoom;

      const start: moment.Moment = moment(day + "T00:00:00+07:00");
      const end: moment.Moment = moment(day + "T23:59:59+07:00");

      const { room: roomModel } = global.mongoModel;

      const roomData = await roomModel.findOne({_id: idRoom}).lean().exec();
      if (!roomData) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Không tìm được phòng"
        );
      }
      console.log({roomData});

      if (!roomData.listIdElectricMetter) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Phòng chưa có id đồng hồ, vui lòng thêm id cho đồng hồ!"
        );
      }

      if (roomData.listIdElectricMetter.length === 0) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Phòng chưa có id đồng hồ, vui lòng thêm id cho đồng hồ!"
        );
      }

      const listId: DataIdMetterType[] = roomData.listIdElectricMetter;

      const result = await checkRangeTimeForIdMetter(listId, start, end);

      const resultLength = result.length;

      //TH đã thêm trả về mặc định phía dưới
      if(resultLength === 0) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Không có đồng hồ nào của phòng được lắp đặt và sử dụng trong khoảng thời gian này"
        )
      } else if(resultLength === 1) {
        const id: string = result[0].value;

        const elementResult = await getElementRawDataElectricForTimePointHaveManyTimeLineInOneDay(
          start,
          end,
          id
        );

        console.log({elementResult})

        if (elementResult.length === 0) {
          return HttpResponse.returnBadRequestResponse(
            res, 
            "Không có dữ liệu năng lượng trong khoảng thời gian đang tìm kiếm"
          );
        }

        let resResult = await handleRawToCalculatedElectricDataInOneDay(elementResult);

        console.log({resResult})

        let currentDataRaw = await EnergyController.getElectricV2(
          start, //start
          end, //end
          id,
          'Current', //key
          'HOUR',
          1,
          'MAX'
        );
        currentDataRaw =await fillNullForDataElectricEmptyInOneDay(currentDataRaw);
        console.log({currentDataRaw})
        currentDataRaw = currentDataRaw.map(item => item.value);

        let voltageDataRaw = await EnergyController.getElectricV2(
          start, //start
          end, //end
          id,
          'Voltage', //key
          'HOUR',
          1,
          'MAX'
        );
        voltageDataRaw = await fillNullForDataElectricEmptyInOneDay(voltageDataRaw);
        console.log({voltageDataRaw})
        voltageDataRaw = voltageDataRaw.map(item => item.value);

        const resDataS = {
          totalkWhTime: resResult.totalkWhTime,
          labelTime: resResult.labelTime,
          kWhData: resResult.kWhData,
          currentData: currentDataRaw,
          voltageData: voltageDataRaw,
        }

        return HttpResponse.returnSuccessResponse(res, resDataS);
      } else if (resultLength > 1) {
        //NOTE: TRƯỜNG HỢP MỘT NGÀY THAY NHIỀU ĐỒNG HỒ ÍT CÓ KHẢ NĂNG XẢY RA
        //TH bao nhiều mốc thời gian
        //      [
        //        {
        //          "timestamp": "2024-04-02T01:00:00",
        //          "value": id_1
        //        },
        //=>start---------------------------------------
        //        {
        //          "timestamp": "2024-04-02T10:00:00",
        //          "value": id_2
        //        },
        //        {
        //          "timestamp": "2024-04-02T20:00:00",
        //          "value": id_3
        //        },
        //=>end---------------------------------------
        //      ]
        // 2 mốc thời gian nằm đúng với vị trị trong đúng list thời gian được trả, 
        //đã được xử lý trong checkRangeTimeForIdMetter
        let resultTotalAll: DataElectricType[] = [];
        let resCurrentData = [];
        let resVoltageData = [];
        for(let i = 0; i < resultLength; i++) {
          if (i === 0) {
            const id : string = result[i].value;
            const startQuery : moment.Moment = start;
            const endQuery : moment.Moment = moment(result[i + 1].timestamp);

            const elementResult = await getElementRawDataElectricForTimePointHaveManyTimeLineInOneDay(
              startQuery,
              endQuery,
              id
            );
            resultTotalAll = resultTotalAll.concat(elementResult);
            console.log({elementResult});

            let currentDataRaw = await EnergyController.getElectricV2(
              startQuery, //start
              endQuery, //end
              id,
              'Current', //key
              'HOUR',
              1,
              'MAX'
            );
            resCurrentData = resCurrentData.concat(currentDataRaw);
    
            let voltageDataRaw = await EnergyController.getElectricV2(
              startQuery, //start
              endQuery, //end
              id,
              'Voltage', //key
              'HOUR',
              1,
              'MAX'
            );
            resVoltageData = resVoltageData.concat(voltageDataRaw);

          } else if (i === (resultLength - 1)) {
            const id : string = result[i].value;
            const startQuery : moment.Moment = moment(result[i].timestamp);
            const endQuery : moment.Moment = end;

            const elementResult = await getElementRawDataElectricForTimePointHaveManyTimeLineInOneDay(
              startQuery,
              endQuery,
              id
            );
            resultTotalAll = resultTotalAll.concat(elementResult);
            console.log({elementResult});

            let currentDataRaw = await EnergyController.getElectricV2(
              startQuery, //start
              endQuery, //end
              id,
              'Current', //key
              'HOUR',
              1,
              'MAX'
            );
            resCurrentData = resCurrentData.concat(currentDataRaw);
    
            let voltageDataRaw = await EnergyController.getElectricV2(
              startQuery, //start
              endQuery, //end
              id,
              'Voltage', //key
              'HOUR',
              1,
              'MAX'
            );
            resVoltageData = resVoltageData.concat(voltageDataRaw);

          } else {
            const id : string = result[i].value;
            const startQuery : moment.Moment = moment(result[i].timestamp);
            const endQuery : moment.Moment = moment(result[i + 1].timestamp);

            const elementResult = await getElementRawDataElectricForTimePointHaveManyTimeLineInOneDay(
              startQuery,
              endQuery,
              id
            );
            resultTotalAll = resultTotalAll.concat(elementResult);
            console.log({elementResult});

            let currentDataRaw = await EnergyController.getElectricV2(
              startQuery, //start
              endQuery, //end
              id,
              'Current', //key
              'HOUR',
              1,
              'MAX'
            );
            resCurrentData = resCurrentData.concat(currentDataRaw);
    
            let voltageDataRaw = await EnergyController.getElectricV2(
              startQuery, //start
              endQuery, //end
              id,
              'Voltage', //key
              'HOUR',
              1,
              'MAX'
            );
            resVoltageData = resVoltageData.concat(voltageDataRaw);
          }
        }

        if (resultTotalAll.length === 0) {
          return HttpResponse.returnBadRequestResponse(
            res, 
            "Không có dữ liệu năng lượng trong khoảng thời gian đang tìm kiếm"
          );
        }
        console.log({resultTotalAll});

        const resResult = await handleRawToCalculatedElectricDataInOneDay(resultTotalAll);

        resCurrentData = await fillNullForDataElectricEmptyInOneDay(resCurrentData);
        resCurrentData = resCurrentData.map(item => item.value);

        resVoltageData = await fillNullForDataElectricEmptyInOneDay(resVoltageData);
        resVoltageData = resVoltageData.map(item => item.value);

        const resDataS = {
          totalkWhTime: resResult.totalkWhTime,
          labelTime: resResult.labelTime,
          kWhData: resResult.kWhData,
          currentData: resCurrentData,
          voltageData: resVoltageData,
        }


        console.log({resResult})

        return HttpResponse.returnSuccessResponse(res, resDataS);
      }

      return HttpResponse.returnBadRequestResponse(
        res,
        "Không có đồng hồ nào của phòng được lắp đặt và sử dụng trong khoảng thời gian này"
      )
    } catch (error) {
      next(error);
    }
  }

  static async getTotalKWhPerDayInOneMonthV2(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<any> {
    try {
      const month : string = req.params.month;
      console.log({month});
      const idRoom : string = req.params.idRoom;

      const start: moment.Moment = moment(month, 'YYYY-MM').startOf('month');
      const end: moment.Moment = moment(month, 'YYYY-MM').endOf('month');
      console.log({start})
      console.log({end})

      const { room: roomModel } = global.mongoModel;

      const roomData = await roomModel.findOne({_id: idRoom}).lean().exec();
      if (!roomData) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Không tìm được phòng"
        );
      }
      console.log({roomData});

      if (!roomData.listIdElectricMetter) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Phòng chưa có id đồng hồ, vui lòng thêm id cho đồng hồ!"
        );
      }

      if (roomData.listIdElectricMetter.length === 0) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Phòng chưa có id đồng hồ, vui lòng thêm id cho đồng hồ!"
        );
      }

      const listId: DataIdMetterType[] = roomData.listIdElectricMetter;

      console.log({listId});

      const result = await checkRangeTimeForIdMetter(listId, start, end);

      const resultLength = result.length;

      console.log({result});

      //TH đã thêm trả về mặc định phía dưới
      if(resultLength === 0) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Không có đồng hồ nào của phòng được lắp đặt và sử dụng trong khoảng thời gian này"
        )
      } else if(resultLength === 1) {
        const id: string = result[0].value;

        const elementResult = await getElementRawDataElectricForTimePointHaveManyTimeLineDayToDay(
          start,
          end,
          id
        );

        if (elementResult.length === 0) {
          return HttpResponse.returnBadRequestResponse(
            res, 
            "Không có dữ liệu năng lượng trong khoảng thời gian đang tìm kiếm"
          );
        }

        const resResult = await handleRawToCalculatedElectricDataDayToDay(
          elementResult,
          start, 
          end
        );

        return HttpResponse.returnSuccessResponse(res, resResult);
      } else if (resultLength > 1) {
        //NOTE: TRƯỜNG HỢP MỘT NGÀY THAY NHIỀU ĐỒNG HỒ ÍT CÓ KHẢ NĂNG XẢY RA
        //TH bao nhiều mốc thời gian
        //      [
        //        {
        //          "timestamp": "2024-04-02T01:00:00",
        //          "value": id_1
        //        },
        //=>start---------------------------------------
        //        {
        //          "timestamp": "2024-04-02T10:00:00",
        //          "value": id_2
        //        },
        //        {
        //          "timestamp": "2024-04-02T20:00:00",
        //          "value": id_3
        //        },
        //=>end---------------------------------------
        //      ]
        // 2 mốc thời gian nằm đúng với vị trị trong đúng list thời gian được trả, 
        //đã được xử lý trong checkRangeTimeForIdMetter
        let resultTotalAll: DataElectricType[] = [];
        for(let i = 0; i < resultLength; i++) {
          if (i === 0) {
            const id : string = result[i].value;
            const startQuery : moment.Moment = start;
            const endQuery : moment.Moment = moment(result[i + 1].timestamp);

            const elementResult = await getElementRawDataElectricForTimePointHaveManyTimeLineDayToDay(
              startQuery,
              endQuery,
              id
            );
            resultTotalAll = resultTotalAll.concat(elementResult);
            console.log({elementResult});

          } else if (i === (resultLength - 1)) {
            const id : string = result[i].value;
            const startQuery : moment.Moment = moment(result[i].timestamp);
            const endQuery : moment.Moment = end;

            const elementResult = await getElementRawDataElectricForTimePointHaveManyTimeLineDayToDay(
              startQuery,
              endQuery,
              id
            );
            resultTotalAll = resultTotalAll.concat(elementResult);
            console.log({elementResult});
          } else {
            const id : string = result[i].value;
            const startQuery : moment.Moment = moment(result[i].timestamp);
            const endQuery : moment.Moment = moment(result[i + 1].timestamp);

            const elementResult = await getElementRawDataElectricForTimePointHaveManyTimeLineDayToDay(
              startQuery,
              endQuery,
              id
            );
            resultTotalAll = resultTotalAll.concat(elementResult);
            console.log({elementResult});
          }
        }

        if (resultTotalAll.length === 0) {
          return HttpResponse.returnBadRequestResponse(
            res, 
            "Không có dữ liệu năng lượng trong khoảng thời gian đang tìm kiếm"
          );
        }
        console.log({resultTotalAll});

        const resultX = await handleDuplicateTimeTotalKwh(resultTotalAll);

        const resResult = await handleRawToCalculatedElectricDataDayToDay(
          resultX,
          start,
          end,
        );

        return HttpResponse.returnSuccessResponse(res, resResult);
      }

      return HttpResponse.returnBadRequestResponse(
        res,
        "Không có đồng hồ nào của phòng được lắp đặt và sử dụng trong khoảng thời gian này"
      )

      // return HttpResponse.returnSuccessResponse(res, "success");
    } catch (error) {
      next(error);
    }
  }

  static async getHistoryEnergyByJob(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<any> {
    try {
      const {
        job: jobModel,
        order: orderModel,
        totalKwh: totalKwhModel,
      } = global.mongoModel;

      // 664d27ea4a755b6434ac92b5 job
      const idJob = req.params.id;
      // const idJob = '664d27ea4a755b6434ac92b5';
      const year = req.params.year;
      // const year = '2024';

      const start : moment.Moment = moment(year).startOf("year");
      const end : moment.Moment = moment(year).endOf("year");

      const jobData = await jobModel.findOne({_id: idJob}).populate('orders').lean().exec();

      if(!jobData) {
        return HttpResponse.returnSuccessResponse(res, []);
      }
      if(!jobData.orders) {
        return HttpResponse.returnSuccessResponse(res, []);
      }
      if(jobData.orders.length === 0) { //chỉ mới có order cọc
        return HttpResponse.returnSuccessResponse(res, []);
      }

      const ordersData = jobData.orders;
      const ordersDataLength = jobData.orders.length;

      let historyData = [];
      for(let i = 0; i < ordersDataLength; i++) {
        if(
          (ordersData[i].type === 'monthly') 
          && (start.valueOf() <= moment(ordersData[i].startTime).valueOf())
          && (end.valueOf()  >= moment(ordersData[i].endTime).valueOf())
        ) {
          let data = ordersData[i].electricNumber;
          // historyValue.push(parseFloat(data.toFixed(2)));
          let label = moment(new Date(ordersData[i].startTime)).format("MM-YYYY");
          // historyLable.push(label);
          let price = ordersData[i].electricPrice;
          historyData.push({label: label, data: parseFloat(data.toFixed(2)), price: price});
        }
      }

      // const startTime = start.format("YYYY-MM-DD");
      // const endTime = end.format("YYYY-MM-DD");
      if(historyData.length === 0) {
        //Tháng đầu tiên
        const startTime = moment(new Date(jobData.checkInTime)).format("YYYY-MM-DD");
        const endTime = moment().format("YYYY-MM-DD");
        
        const roomId = jobData.room;
        let dataElectricAll = await EnergyController.calculateElectricUsedDayToDayHaveLabelTime(roomId, startTime, endTime);
        if(dataElectricAll !== null) {
          let data = dataElectricAll.kWhData.reduce((acc, curr) => acc + curr, 0);
          let label = moment().format("MM-YYYY");
          historyData.push({label: label, data: parseFloat(data.toFixed(2)), price: null});
        }
      } else {
        const startTime = moment().startOf("month").format("YYYY-MM-DD");
        const endTime = moment().format("YYYY-MM-DD");
        const roomId = jobData.room;
        let dataElectricAll = await EnergyController.calculateElectricUsedDayToDayHaveLabelTime(roomId, startTime, endTime);
        if(dataElectricAll !== null) {
          let data = dataElectricAll.kWhData.reduce((acc, curr) => acc + curr, 0);
          let label = moment().format("MM-YYYY");
          historyData.push({label: label, data: parseFloat(data.toFixed(2)), price: null});
        }
      }

      let allMonths = Array.from({length: 12}, (v, i) => {
        let month = (i + 1).toString().padStart(2, '0');
        return `${month}-${year}`;
      });

      let dataMap = historyData.reduce((map, item) => {
          map[item.label] = item.data;
          return map;
      }, {});

      let priceMap = historyData.reduce((map, item) => {
        map[item.label] = item.price;
        return map;
      }, {});
      
      let filledData = allMonths.map(month => ({
          label: month,
          data: dataMap[month] !== undefined ? dataMap[month] : null,
          price: priceMap[month] !== undefined ? priceMap[month] : null,
      }));

      console.log({filledData});

      filledData.sort((a, b) => moment(a.label, "MM-YYYY").valueOf() - moment(b.label, "MM-YYYY").valueOf());

      let historyValue = [];
      let historyPrice = [];
      let historyLabel = [];

      historyValue = filledData.map(item => item.data);
      historyLabel = filledData.map(item => item.label);
      historyPrice = filledData.map(item => item.price);
  


      // let dataElectricAll = await EnergyController.calculateElectricUsedDayToDayHaveLabelTime(roomId, start, end);
      // electricNumber = dataElectricAll.totalkWhTime;
      // labelTime = dataElectricAll.labelTimel;
      // kWhData = dataElectricAll.kWhData;


      const result = {
        historyValue: historyValue,
        historyLabel: historyLabel,
        historyPrice: historyPrice,
      }

      return HttpResponse.returnSuccessResponse(res, result);

    } catch (error) {
      next(error);
    }
  }


  //Tạm thời chỉ lấy qua lịch sử thuê phòng thôi
  static async getHistoryEnergyByRoom(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<any> {
    try {
      const {
        job: jobModel,
        order: orderModel,
        totalKwh: totalKwhModel,
        room: roomModel,
        user: userModel,
      } = global.mongoModel;

      // 664d27ea4a755b6434ac92b5 job
      // const idRoom = req.params.id;
      const idRoom = '663336db2c01a43510a32e9f';
      // const year = req.params.year;
      const year = '2024';

      const roomData = await roomModel.findOne({_id: idRoom}).lean().exec();
      if(!roomData) {
        return HttpResponse.returnSuccessResponse(res, []);
      }

      const start : moment.Moment = moment(year).startOf("year");
      const end : moment.Moment = moment(year).endOf("year");
      console.log({start});
      console.log({end});
      const jobData = await jobModel.find({
        room: idRoom,
        isCompleted: true,
        checkInTime: {
          $gte: new Date(start.toString()), // lớn hơn
          $lte: new Date(end.toString()), // nhỏ hơn
        },
      }).populate('orders').lean().exec();

      console.log({jobData})

      const jobDataBefore = await jobModel.findOne({
        room: idRoom,
        isCompleted: true,
        checkInTime: {
          $lt: new Date(start.toString()), // nhỏ hơn
        },
      })
      .sort({ createdAt: -1 })
      .populate("orders")
      .lean().exec();

      if(jobData.length === 0 && !jobDataBefore) {
        //Phòng chưa được thuê bao giờ
        return HttpResponse.returnSuccessResponse(res, []);
      }

      let dataAfter = [];
      
      if(jobData.length !== 0) {
        for(let i = 0; i < jobData.length; i++) {
          
          if(jobData[i].orders.length <= 2) {
            continue; // chưa có order tháng
          }
          let userData = await userModel.findOne(
            {_id: jobData[i].user},
            {role: 0, password: 0, token: 0, wallet: 0, nationalId: 0}
          ).lean().exec();

          for(let j = 2; j < jobData[i].orders.length; j++) {
            console.log("tới đây")
            let label = moment(new Date(jobData[i].orders[j].startTime)).format("MM-YYYY");
            let value = jobData[i].orders[j].electricNumber;
            let price = jobData[i].orders[j].electricPrice;
            dataAfter.push({label: label, value: value, price: price, user: userData});
          }
        }
      }
      

      // jobDataBefore: kiểm tra xem có order nào nằm trong khoảng thời gian query không
      let dataBefore = [];
      if(jobDataBefore) {
        const orderBefore = await orderModel.find({
          job: jobDataBefore._id,
          type: "monthly",
          startTime: {
            $gte: new Date(start.toString()), // lớn hơn
            $lte: new Date(end.toString()), // nhỏ hơn
          },
        }).lean().exec();

        let userData = await userModel.findOne(
          {_id: jobDataBefore.user},
          {role: 0, password: 0, token: 0, wallet: 0, nationalId: 0}
        ).lean().exec();

        if(orderBefore.length > 0) {
          for(let i = 0; i < orderBefore.length; i++) {
            let label = moment(new Date(orderBefore[i].startTime)).format("MM-YYYY");
            let value = orderBefore[i].electricNumber;
            let price = orderBefore[i].electricPrice;
            dataBefore.push({label: label, value: value, price: price, user: userData});
          }
        }
      }

      let data = dataBefore.concat(dataAfter);

      const monthsOfYear = Array.from({ length: 12 }, (_, i) => {
        const month = (i + 1).toString().padStart(2, "0");
        return `${month}-${year}`;
      });

      if(data.length > 0) {
        let existingMonths = new Set(data.map(item => item.label));
        
        monthsOfYear.forEach(month => {
          if (!existingMonths.has(month)) {
            data.push({
              label: month,
              value: null,
              price: null,
              user: null
            });
          }
        });
        
        data.sort((a, b) => {
          const [monthA, yearA] = a.label.split("-").map(Number);
          const [monthB, yearB] = b.label.split("-").map(Number);
          return yearA - yearB || monthA - monthB;
        });
      } else {
        data = monthsOfYear.map(month => ({
          label: month,
          value: null,
          price: null,
          user: null
        }));
      }

      if(roomData.status === "available") {
        //dùng order cuối cùng của jobData làm mốc tiếp
        //jobData rỗng thì dùng order cuối cùng của jobDataBefore làm mốc
        // nếu cả 2 đều rỗng, tức phòng chưa cho thuê bao giờ thì query từ lúc có đồng hồ

      } else {
        //tức vẫn có người đang thuê
        //TH jobData không rỗng
        const currentJobOfRoom = jobData[jobData.length - 1];

        //TH jobData rỗng:
        // + jobBefore có thông tin người dùng, vì phòng đang được thuê
        // + 
        // const startTime = moment(new Date(jobData.checkInTime)).format("YYYY-MM-DD");
    //     const endTime = moment().format("YYYY-MM-DD");
    //     const roomId = jobData.room;
    //     let dataElectricAll = await EnergyController.calculateElectricUsedDayToDayHaveLabelTime(roomId, startTime, endTime);
    //     if(dataElectricAll !== null) {
    //       let data = dataElectricAll.kWhData.reduce((acc, curr) => acc + curr, 0);
    //       let label = moment().format("MM-YYYY");
    //       historyData.push({label: label, data: parseFloat(data.toFixed(2)), price: null});
    //     }
      }

    //   if(historyData.length === 0) {
    //     //Tháng đầu tiên
    //     const startTime = moment(new Date(jobData.checkInTime)).format("YYYY-MM-DD");
    //     const endTime = moment().format("YYYY-MM-DD");
    //     const roomId = jobData.room;
    //     let dataElectricAll = await EnergyController.calculateElectricUsedDayToDayHaveLabelTime(roomId, startTime, endTime);
    //     if(dataElectricAll !== null) {
    //       let data = dataElectricAll.kWhData.reduce((acc, curr) => acc + curr, 0);
    //       let label = moment().format("MM-YYYY");
    //       historyData.push({label: label, data: parseFloat(data.toFixed(2)), price: null});
    //     }
    //   } else {
    //     const startTime = moment().startOf("month").format("YYYY-MM-DD");
    //     const endTime = moment().format("YYYY-MM-DD");
    //     const roomId = jobData.room;
    //     let dataElectricAll = await EnergyController.calculateElectricUsedDayToDayHaveLabelTime(roomId, startTime, endTime);
    //     if(dataElectricAll !== null) {
    //       let data = dataElectricAll.kWhData.reduce((acc, curr) => acc + curr, 0);
    //       let label = moment().format("MM-YYYY");
    //       historyData.push({label: label, data: parseFloat(data.toFixed(2)), price: null});
    //     }
    //   }

    //   const dataTest = [
    //     {
    //         "label": "07-2024",
    //         "data": 29.12
    //     },
    //     {
    //         "label": "05-2024",
    //         "data": 151.74
    //     }
    //   ]

    // let allMonths = Array.from({length: 12}, (v, i) => {
    //   let month = (i + 1).toString().padStart(2, '0');
    //   return `${month}-2024`;
    // });

    // let dataMap = historyData.reduce((map, item) => {
    //     map[item.label] = item.data;
    //     return map;
    // }, {});

    // let priceMap = historyData.reduce((map, item) => {
    //   map[item.label] = item.price;
    //   return map;
    // }, {});
    
    // let filledData = allMonths.map(month => ({
    //     label: month,
    //     data: dataMap[month] !== undefined ? dataMap[month] : null,
    //     price: priceMap[month] !== undefined ? priceMap[month] : null,
    // }));

    // console.log({filledData});

    // filledData.sort((a, b) => moment(a.label, "MM-YYYY").valueOf() - moment(b.label, "MM-YYYY").valueOf());

    // let historyValue = [];
    // let historyPrice = [];
    // let historyLabel = [];

    // historyValue = filledData.map(item => item.data);
    // historyLabel = filledData.map(item => item.label);
    // historyPrice = filledData.map(item => item.price);
  


    //   // let dataElectricAll = await EnergyController.calculateElectricUsedDayToDayHaveLabelTime(roomId, start, end);
    //   // electricNumber = dataElectricAll.totalkWhTime;
    //   // labelTime = dataElectricAll.labelTimel;
    //   // kWhData = dataElectricAll.kWhData;


    //   const result = {
    //     historyValue: historyValue,
    //     historyLabel: historyLabel,
    //     historyPrice: historyPrice,
    //   }

      return HttpResponse.returnSuccessResponse(res, data);

    } catch (error) {
      next(error);
    }
  }

  static async getHistoryEnergyByRoomV2(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<any> {
    try {
      const {
        job: jobModel,
        order: orderModel,
        totalKwh: totalKwhModel,
        room: roomModel,
        user: userModel,
      } = global.mongoModel;

      // 664d27ea4a755b6434ac92b5 job
      const idRoom = req.params.id;
      // const idRoom = '65d426766415bc4a8ced1ac9';
      const year = req.params.year;
      // const year = '2024';

      const roomData = await roomModel.findOne({_id: idRoom}).lean().exec();
      if(!roomData) {
        return HttpResponse.returnSuccessResponse(res, []);
      }
      if(!roomData.listIdElectricMetter) {
        return HttpResponse.returnSuccessResponse(res, []);
      }
      if(roomData.listIdElectricMetter.length === 0) {
        return HttpResponse.returnSuccessResponse(res, []);
      }

      const firstIdMeter = roomData.listIdElectricMetter[0];

      const start : moment.Moment = moment(year).startOf("year");
      // const start : moment.Moment = moment("2024-03-01").startOf("day");
      const end : moment.Moment = moment(year).endOf("year");

      let startTime: string = start.format("YYYY-MM-DD");
      let endTime: string = end.format("YYYY-MM-DD");

      if(moment(firstIdMeter.timestamp).valueOf() > start.valueOf()) {
        startTime = moment(firstIdMeter.timestamp).format("YYYY-MM-DD");
      }

      if(moment().valueOf() < end.valueOf()) {
        endTime = moment().format("YYYY-MM-DD");
      }

      let dataElectricAll = await EnergyController.calculateElectricUsedDayToDayHaveLabelTime(idRoom, startTime, endTime);

      const monthsOfYear = Array.from({ length: 12 }, (_, i) => {
        const month = (i + 1).toString().padStart(2, "0");
        return `${month}-${year}`;
      });

      let data = []
      
      if(dataElectricAll === null) {
        data = monthsOfYear.map(month => ({
          label: month,
          value: null,
        }));
      } else {
        const monthlyData = {};

        dataElectricAll.labelTime.forEach((label, index) => {
          // const month = label.slice(0, 7); 
          const month = moment(label).format("MM-YYYY"); 
          if (!monthlyData[month]) {
            monthlyData[month] = 0; 
          }
          monthlyData[month] += dataElectricAll.kWhData[index]; 
        });

        console.log({monthlyData})

        data = Object.keys(monthlyData).map(month => ({
          label: month,
          value: monthlyData[month]
        }));
        console.log({data})

        let existingMonths = new Set(data.map(item => item.label));
        
        monthsOfYear.forEach(month => {
          if (!existingMonths.has(month)) {
            data.push({
              label: month,
              value: null,
            });
          }
        });
        
        data.sort((a, b) => {
          const [monthA, yearA] = a.label.split("-").map(Number);
          const [monthB, yearB] = b.label.split("-").map(Number);
          return yearA - yearB || monthA - monthB;
        });
      }

      data = data.map(item => ({
        label: item.label,
        value: item.value !== null ? parseFloat(item.value.toFixed(2)) : null
      }));

      console.log({data})

      const historyValue = data.map(item => item.value);
      const historyLabel = data.map(item => item.label);

      const result = {
        historyValue: historyValue,
        historyLabel: historyLabel,
      }

      return HttpResponse.returnSuccessResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  

  static async getTotalKWhPerDayForDayToDayV2(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<any> {
    try {
      const idRoom : string = req.params.idRoom;

      const start: moment.Moment = moment(req.params.start).startOf('day');
      const end: moment.Moment = moment(req.params.end).endOf('day');
      console.log({start})
      console.log({end})

      const { room: roomModel } = global.mongoModel;

      const roomData = await roomModel.findOne({_id: idRoom}).lean().exec();
      if (!roomData) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Không tìm được phòng"
        );
      }
      console.log({roomData});

      if (!roomData.listIdElectricMetter) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Phòng chưa có id đồng hồ, vui lòng thêm id cho đồng hồ!"
        );
      }

      if (roomData.listIdElectricMetter.length === 0) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Phòng chưa có id đồng hồ, vui lòng thêm id cho đồng hồ!"
        );
      }

      const listId: DataIdMetterType[] = roomData.listIdElectricMetter;

      console.log({listId});

      const result = await checkRangeTimeForIdMetter(listId, start, end);

      const resultLength = result.length;

      console.log({result});

      //TH đã thêm trả về mặc định phía dưới
      if(resultLength === 0) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Không có đồng hồ nào của phòng được lắp đặt và sử dụng trong khoảng thời gian này"
        )
      } else if(resultLength === 1) {
        const id: string = result[0].value;

        const elementResult = await getElementRawDataElectricForTimePointHaveManyTimeLineDayToDay(
          start,
          end,
          id
        );

        if (elementResult.length === 0) {
          return HttpResponse.returnBadRequestResponse(
            res, 
            "Không có dữ liệu năng lượng trong khoảng thời gian đang tìm kiếm"
          );
        }

        const resResult = await handleRawToCalculatedElectricDataDayToDay(
          elementResult,
          start, 
          end
        );

        return HttpResponse.returnSuccessResponse(res, resResult);
      } else if (resultLength > 1) {
        //NOTE: TRƯỜNG HỢP MỘT NGÀY THAY NHIỀU ĐỒNG HỒ ÍT CÓ KHẢ NĂNG XẢY RA
        //TH bao nhiều mốc thời gian
        //      [
        //        {
        //          "timestamp": "2024-04-02T01:00:00",
        //          "value": id_1
        //        },
        //=>start---------------------------------------
        //        {
        //          "timestamp": "2024-04-02T10:00:00",
        //          "value": id_2
        //        },
        //        {
        //          "timestamp": "2024-04-02T20:00:00",
        //          "value": id_3
        //        },
        //=>end---------------------------------------
        //      ]
        // 2 mốc thời gian nằm đúng với vị trị trong đúng list thời gian được trả, 
        //đã được xử lý trong checkRangeTimeForIdMetter
        let resultTotalAll: DataElectricType[] = [];
        for(let i = 0; i < resultLength; i++) {
          if (i === 0) {
            const id : string = result[i].value;
            const startQuery : moment.Moment = start;
            const endQuery : moment.Moment = moment(result[i + 1].timestamp);

            const elementResult = await getElementRawDataElectricForTimePointHaveManyTimeLineDayToDay(
              startQuery,
              endQuery,
              id
            );
            resultTotalAll = resultTotalAll.concat(elementResult);
            console.log({elementResult});

          } else if (i === (resultLength - 1)) {
            const id : string = result[i].value;
            const startQuery : moment.Moment = moment(result[i].timestamp);
            const endQuery : moment.Moment = end;

            const elementResult = await getElementRawDataElectricForTimePointHaveManyTimeLineDayToDay(
              startQuery,
              endQuery,
              id
            );
            resultTotalAll = resultTotalAll.concat(elementResult);
            console.log({elementResult});
          } else {
            const id : string = result[i].value;
            const startQuery : moment.Moment = moment(result[i].timestamp);
            const endQuery : moment.Moment = moment(result[i + 1].timestamp);

            const elementResult = await getElementRawDataElectricForTimePointHaveManyTimeLineDayToDay(
              startQuery,
              endQuery,
              id
            );
            resultTotalAll = resultTotalAll.concat(elementResult);
            console.log({elementResult});
          }
        }

        if (resultTotalAll.length === 0) {
          return HttpResponse.returnBadRequestResponse(
            res, 
            "Không có dữ liệu năng lượng trong khoảng thời gian đang tìm kiếm"
          );
        }
        console.log({resultTotalAll});

        const resultX = await handleDuplicateTimeTotalKwh(resultTotalAll);

        const resResult = await handleRawToCalculatedElectricDataDayToDay(
          resultX,
          start,
          end,
        );

        return HttpResponse.returnSuccessResponse(res, resResult);
      }

      return HttpResponse.returnBadRequestResponse(
        res,
        "Không có đồng hồ nào của phòng được lắp đặt và sử dụng trong khoảng thời gian này"
      )

      // return HttpResponse.returnSuccessResponse(res, "success");
    } catch (error) {
      next(error);
    }
  }

  static async calculateElectricUsedDayToDay(
    idRoom: string,
    startDay: string,
    endDay: string,
  ): Promise<number> {
    try {
      const start: moment.Moment = moment(startDay).startOf('day');
      const end: moment.Moment = moment(endDay).endOf('day');
      console.log({start})
      console.log({ end })
      console.log("--------------------------------------------------------------");
      

      const { room: roomModel } = global.mongoModel;

      const roomData = await roomModel.findOne({_id: idRoom}).lean().exec();
      if (!roomData) {
        // "Không tìm được phòng"
        return null;
      }
      // console.log({roomData});

      if (!roomData.listIdElectricMetter) {
        // "Phòng chưa có id đồng hồ, vui lòng thêm id cho đồng hồ!"
        return null;
      }

      if (roomData.listIdElectricMetter.length === 0) {
        // "Phòng chưa có id đồng hồ, vui lòng thêm id cho đồng hồ!"
        return null;
      }

      const listId: DataIdMetterType[] = roomData.listIdElectricMetter;

      console.log({listId});
      

      const result = await checkRangeTimeForIdMetter(listId, start, end);

      console.log({result});
      

      const resultLength = result.length;

      //TH đã thêm trả về mặc định phía dưới
      if(resultLength === 0) {
        // "Không có đồng hồ nào của phòng được lắp đặt và sử dụng trong khoảng thời gian này"
        return null;
      } else if(resultLength === 1) {
        const id: string = result[0].value;
        const elementResult = await getElementRawDataElectricForTimePointHaveManyTimeLineDayToDay(
          start,
          end,
          id
        );

        console.log({elementResult});
        

        if (elementResult.length === 0) {
          // "Không có dữ liệu năng lượng trong khoảng thời gian đang tìm kiếm"
          return null;
        }

        const resResult = await handleRawToCalculatedElectricDataDayToDay(
          elementResult,
          start, 
          end
        );

        

        return resResult.totalkWhTime;
      } else if (resultLength > 1) {
        //NOTE: TRƯỜNG HỢP MỘT NGÀY THAY NHIỀU ĐỒNG HỒ ÍT CÓ KHẢ NĂNG XẢY RA
        //TH bao nhiều mốc thời gian
        //      [
        //        {
        //          "timestamp": "2024-04-02T01:00:00",
        //          "value": id_1
        //        },
        //=>start---------------------------------------
        //        {
        //          "timestamp": "2024-04-02T10:00:00",
        //          "value": id_2
        //        },
        //        {
        //          "timestamp": "2024-04-02T20:00:00",
        //          "value": id_3
        //        },
        //=>end---------------------------------------
        //      ]
        // 2 mốc thời gian nằm đúng với vị trị trong đúng list thời gian được trả, 
        //đã được xử lý trong checkRangeTimeForIdMetter
        let resultTotalAll: DataElectricType[] = [];
        for(let i = 0; i < resultLength; i++) {
          if (i === 0) {
            const id : string = result[i].value;
            const startQuery : moment.Moment = start;
            const endQuery : moment.Moment = moment(result[i + 1].timestamp);

            const elementResult = await getElementRawDataElectricForTimePointHaveManyTimeLineDayToDay(
              startQuery,
              endQuery,
              id
            );
            resultTotalAll = resultTotalAll.concat(elementResult);

          } else if (i === (resultLength - 1)) {
            const id : string = result[i].value;
            const startQuery : moment.Moment = moment(result[i].timestamp);
            const endQuery : moment.Moment = end;

            const elementResult = await getElementRawDataElectricForTimePointHaveManyTimeLineDayToDay(
              startQuery,
              endQuery,
              id
            );
            resultTotalAll = resultTotalAll.concat(elementResult);
          } else {
            const id : string = result[i].value;
            const startQuery : moment.Moment = moment(result[i].timestamp);
            const endQuery : moment.Moment = moment(result[i + 1].timestamp);

            const elementResult = await getElementRawDataElectricForTimePointHaveManyTimeLineDayToDay(
              startQuery,
              endQuery,
              id
            );
            resultTotalAll = resultTotalAll.concat(elementResult);
          }
        }

        if (resultTotalAll.length === 0) {
          // "Không có dữ liệu năng lượng trong khoảng thời gian đang tìm kiếm"
          return null;
        }

        const resultX = await handleDuplicateTimeTotalKwh(resultTotalAll);

        const resResult = await handleRawToCalculatedElectricDataDayToDay(
          resultX,
          start,
          end,
        );

        return resResult.totalkWhTime;
      }

      // "Không có đồng hồ nào của phòng được lắp đặt và sử dụng trong khoảng thời gian này"
      return null;

      // return HttpResponse.returnSuccessResponse(res, "success");
    } catch (error) {
      console.log({error});
    }
  }
  static async calculateElectricUsedDayToDayHaveLabelTime(
    idRoom: string,
    startDay: string,
    endDay: string,
  ): Promise<any> {
    try {
      const start: moment.Moment = moment(startDay).startOf('day');
      const end: moment.Moment = moment(endDay).endOf('day');
      // console.log({start})
      // console.log({end})
      console.log("Gọiiiii", idRoom);

      const { room: roomModel } = global.mongoModel;

      const roomData = await roomModel.findOne({_id: idRoom}).lean().exec();
      if (!roomData) {
        // "Không tìm được phòng"
        console.log("Không tìm được phòng")
        return null;
      }
      console.log({roomData});


      if (!roomData.listIdElectricMetter) {
        console.log("Phòng chưa có id đồng hồ, vui lòng thêm id cho đồng hồ!")
        return null;
      }

      if (roomData.listIdElectricMetter.length === 0) {
        console.log("Phòng chưa có id đồng hồ, vui lòng thêm id cho đồng hồ!")
        return null;
      }

      const listId: DataIdMetterType[] = roomData.listIdElectricMetter;

      console.log({start});
      console.log({end});
      console.log({listId});

      const result = await checkRangeTimeForIdMetter(listId, start, end);
      console.log({result});

      const resultLength = result.length;

      //TH đã thêm trả về mặc định phía dưới
      if(resultLength === 0) {
        // "Không có đồng hồ nào của phòng được lắp đặt và sử dụng trong khoảng thời gian này"
        console.log("Không có đồng hồ nào của phòng được lắp đặt và sử dụng trong khoảng thời gian này");
        return null;
      } else if(resultLength === 1) {
        const id: string = result[0].value;

        const elementResult = await getElementRawDataElectricForTimePointHaveManyTimeLineDayToDay(
          start,
          end,
          id
        );

        if (elementResult.length === 0) {
          // "Không có dữ liệu năng lượng trong khoảng thời gian đang tìm kiếm"
          console.log("Không có dữ liệu năng lượng trong khoảng thời gian đang tìm kiếm xxx");
          return null;
        }

        const resResult = await handleRawToCalculatedElectricDataDayToDay(
          elementResult,
          start, 
          end
        );

        // const resResult = {
        //   totalkWhTime: totalkWhTime,
        //   labelTime: labelTime,
        //   kWhData: kWhData,
        // }

        console.log(`Dữ liệu đầu ra của + ${roomData._id}: `, resResult  );

        return resResult;
      } else if (resultLength > 1) {
        //NOTE: TRƯỜNG HỢP MỘT NGÀY THAY NHIỀU ĐỒNG HỒ ÍT CÓ KHẢ NĂNG XẢY RA
        //TH bao nhiều mốc thời gian
        //      [
        //        {
        //          "timestamp": "2024-04-02T01:00:00",
        //          "value": id_1
        //        },
        //=>start---------------------------------------
        //        {
        //          "timestamp": "2024-04-02T10:00:00",
        //          "value": id_2
        //        },
        //        {
        //          "timestamp": "2024-04-02T20:00:00",
        //          "value": id_3
        //        },
        //=>end---------------------------------------
        //      ]
        // 2 mốc thời gian nằm đúng với vị trị trong đúng list thời gian được trả, 
        //đã được xử lý trong checkRangeTimeForIdMetter
        let resultTotalAll: DataElectricType[] = [];
        for(let i = 0; i < resultLength; i++) {
          if (i === 0) {
            const id : string = result[i].value;
            const startQuery : moment.Moment = start;
            const endQuery : moment.Moment = moment(result[i + 1].timestamp);

            const elementResult = await getElementRawDataElectricForTimePointHaveManyTimeLineDayToDay(
              startQuery,
              endQuery,
              id
            );
            resultTotalAll = resultTotalAll.concat(elementResult);

          } else if (i === (resultLength - 1)) {
            const id : string = result[i].value;
            const startQuery : moment.Moment = moment(result[i].timestamp);
            const endQuery : moment.Moment = end;

            const elementResult = await getElementRawDataElectricForTimePointHaveManyTimeLineDayToDay(
              startQuery,
              endQuery,
              id
            );
            resultTotalAll = resultTotalAll.concat(elementResult);
          } else {
            const id : string = result[i].value;
            const startQuery : moment.Moment = moment(result[i].timestamp);
            const endQuery : moment.Moment = moment(result[i + 1].timestamp);

            const elementResult = await getElementRawDataElectricForTimePointHaveManyTimeLineDayToDay(
              startQuery,
              endQuery,
              id
            );
            resultTotalAll = resultTotalAll.concat(elementResult);
          }
        }

        if (resultTotalAll.length === 0) {
          // "Không có dữ liệu năng lượng trong khoảng thời gian đang tìm kiếm"
          return null;
        }

        const resResult = await handleRawToCalculatedElectricDataDayToDay(
          resultTotalAll,
          start,
          end,
        );

        // const resResult = {
        //   totalkWhTime: totalkWhTime,
        //   labelTime: labelTime,
        //   kWhData: kWhData,
        // }

        console.log(`Dữ liệu đầu ra của + ${roomData._id}: `, resResult  );


        return resResult;
      }

      // "Không có đồng hồ nào của phòng được lắp đặt và sử dụng trong khoảng thời gian này"
      console.log("TH mặc định")
      return null;

      // return HttpResponse.returnSuccessResponse(res, "success");
    } catch (error) {
      console.log({error});
    }
  }


  static async getListIdMetterByRoom(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const id = req.params.id;
      const {room: roomModel} = global.mongoModel;
      console.log({id});

      const roomData = await roomModel.findOne({_id: id})
                                                                  .lean()
                                                                  .exec();
      
      if(!roomData) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Không tìm được phòng"
        );
      }
      const listIdMetter = roomData.listIdElectricMetter;
      return HttpResponse.returnSuccessResponse(res, listIdMetter);
    } catch (error) {
      next(error);
    }
  }

  static async addIdMetterForRoom(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const {room: roomModel} = global.mongoModel;
      // console.log({id});
      // console.log({time});
      // console.log({newIdMetter});

      console.log("dattttt", req.body);
      const data = req.body;

      const roomData = await roomModel.findOne({_id: data.id})
                                                                  .lean()
                                                                  .exec();
      
      if(!roomData) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Không tìm được phòng"
        );
      }

      // if(!roomData.listIdElectricMetter) {
      //   console.log("Chưa tồn tại");
      //   const resData = await roomModel.findOneAndUpdate(
      //     { _id: data._id },
      //     {
      //       $set: {
      //         listIdElectricMetter: []
      //       }
      //     },
      //   );
      // }

      const dataUpdate = await roomModel.findOneAndUpdate(
        {_id: roomData._id},
        {
          $addToSet: { 
            listIdElectricMetter: { "timestamp": data.time, "value": data.newIdMeter }
          },
        },
        {new: true}
      );

      return HttpResponse.returnSuccessResponse(res, dataUpdate);
    } catch (error) {
      next(error);
    }
  }

  static async getElectricPerHour(
    start: string, end: string, id: string, key: string
  ): Promise<any> {
    let resData = [];
    let startTime: string = start;
    startTime += 'T00:00:00+07:00'
    let endTime: string = end;
    endTime += 'T23:59:59+07:00';

    try {
      const headers = {
          'x-api-key': process.env.ENERGY_API_KEY
      };

      const instance = axios.create({
          baseURL: process.env.ENERGY_BASE_URL,
          timeout: 1000,
          headers: headers
      });

      const response = await instance.get('/telemetry/metrics/values', {
          params: {
              device_id: id,
              key: key,
              start: startTime,
              end: endTime,
              interval_type: 'HOUR',
              interval: 1,
              agg_type: 'MAX',
              limit: 100
          }
      });

      resData = response.data;
      return resData;
    } catch (error) {
        console.error(error);
        return resData;
    }
  }

  static async getElectric(
    start: string, 
    end: string, 
    id: string, 
    key: string, 
    intervalType: string,
    interval: number,
    aggType: string,
  ):
  Promise<any> {
    let resData = [];
    let startTime: string = start;
    startTime += 'T00:00:00+07:00'
    let endTime: string = end;
    endTime += 'T23:59:59+07:00';

    try {
      const headers = {
          'x-api-key': process.env.ENERGY_API_KEY
      };

      const instance = axios.create({
          baseURL: process.env.ENERGY_BASE_URL,
          timeout: 1000,
          headers: headers
      });

      const response = await instance.get('/telemetry/metrics/values', {
          params: {
              device_id: id,
              key: key,
              start: startTime,
              end: endTime,
              interval_type: intervalType,
              interval: interval,
              agg_type: aggType,
              limit: 100
          }
      });

      resData = response.data;
      return resData;
    } catch (error) {
        console.error(error);
        return resData;
    }
  }

  //đúng theo từng giờ phút giây
  static async getElectricV2(
    start: moment.Moment, 
    end: moment.Moment, 
    id: string, 
    key: string, 
    intervalType: string,
    interval: number,
    aggType: string,
  ):
  Promise<any> {
    let resData = [];

    let startTime: string = start.format();
    
    let endTime: string = end.format();

    try {
      const headers = {
          'x-api-key': process.env.ENERGY_API_KEY
      };

      const instance = axios.create({
          baseURL: process.env.ENERGY_BASE_URL,
          timeout: 10000,
          headers: headers
      });

      const response = await instance.get('/telemetry/metrics/values', {
          params: {
              device_id: id,
              key: key,
              start: startTime,
              end: endTime,
              interval_type: intervalType,
              interval: interval,
              agg_type: aggType,
              limit: 100
          }
      });
      resData = response.data;

      return resData;
    } catch (error) {
        console.error("error in get ElectricV2", error);
        return resData;
    }
  }
}

async function mergeBuffers(
  buffer: Buffer,
): Promise<Uint8Array> {
  try {
    const mergedPdfDoc = await PDFDocument.create();
    const pdfDoc = await PDFDocument.load(buffer);
    const [firstPage] = await mergedPdfDoc.copyPages(pdfDoc, [0]);
    mergedPdfDoc.addPage(firstPage);
    return await mergedPdfDoc.save();
  } catch (e) {
    console.log({ e });
    return new Uint8Array();
  }
}


async function mergeBuffer(
  buffer: Buffer,
  chartBufferPNG: Buffer
): Promise<Uint8Array> {
  try {
    // Load the PDF document buffer
    const pdfDoc = await PDFDocument.load(buffer);

    // Load the PNG image as a PDFImage
    const pngImage = await pdfDoc.embedPng(chartBufferPNG);

    // Create a new page in the PDF document
    const [width, height] = [pngImage.width, pngImage.height];
    const page = pdfDoc.addPage([width, height]);

    // Draw the PNG image onto the PDF page
    page.drawImage(pngImage, {
      x: 0, // X coordinate of the image on the page
      y: 0, // Y coordinate of the image on the page
      width: width, // Width of the image
      height: height, // Height of the image
    });

    // Save the modified PDF document as a buffer
    return await pdfDoc.save();
  } catch (e) {
    console.log({ e });
  }
}

type DataIdMetterType = { timestamp: string, value: string };
//return: 
// [] -> 2 mốc thời gian nằm trước thời gian tồn tại của id đồng hồ
// [1] -> 2 mốc thời gian nằm ở sau mốc thời gian mà id hiện tại theo thời gian thực đang hoạt động
// [n] -> 2 mốc thời gian đang bao lấy nhiều id

async function checkRangeTimeForIdMetter(
  listId: DataIdMetterType[], 
  start: moment.Moment, 
  end: moment.Moment
): Promise<DataIdMetterType[]> {
  //kiểm tra 2 mốc có bao mốc nào trong danh sách id
  let listIdInTime: DataIdMetterType[] = listId.filter((id) => {
    return(moment(id.timestamp) > start && moment(id.timestamp) < end);
  })


  let newListIdInTime = [];
  //nếu 2 mốc không bao, vậy 2 mốc sẽ nằm trong khoảng hoặc ngoài khoảng
  if (listIdInTime.length === 0) {
    //2 mốc thời gian không bao mốc nào trong list id (mốc ở đây là tg id bắt đầu được thêm vào phòng)
    if (listId.length === 1) {
      //2 mốc tg nằm trước lúc đồng hồ hoạt động
      if(end.isSameOrBefore(moment(listId[0].timestamp))) {
        newListIdInTime = [];
      }
      //2 mốc tg nằm sau lúc đồng hồ hoạt động
      if(start.isSameOrAfter(moment(listId[0].timestamp))) {
        newListIdInTime.push(listId[0]);
      }
    } else {
      //2 mốc nằm trước khoảng list id
      if(end.isSameOrBefore(moment(listId[0].timestamp))) {
        newListIdInTime = [];
      //2 mốc nằm sau khoảng list id
      } else if(start.isSameOrAfter(moment(listId[listId.length - 1].timestamp))) {
        newListIdInTime.push(listId[listId.length - 1]);
      //2 mốc nằm trong khoảng list id
      } else {
        for(let i = 1; i < listId.length; i++) {
      
          if ( start >= moment(listId[i - 1].timestamp) && start <= moment(listId[i].timestamp)) {
            newListIdInTime.push(listId[i - 1]);
            break;
          }
    
        }
        console.log({newListIdInTime})
      }

    }
    
  } else {
    //2 mốc tg có bao 1 mốc thời gian trong list id (mốc ở đây là tg id bắt đầu được thêm vào phòng)
    const secondElement = listIdInTime[0];

    const index = listId.findIndex(item =>
      item.timestamp === secondElement.timestamp && item.value === secondElement.value
    );

    if(index > 0 ) { 
      //trường hợp chứa id phía trước thì thêm id phía trước
      listIdInTime.unshift(listId[index - 1]); //chèn vào đầu
    }

    // nếu trước đó không chứa id nào nữa-khoảng thời gian query có trước thời gian tồn tại id đầu tiên

    newListIdInTime = listIdInTime;
    
  }

  
  return newListIdInTime;
}


type DataElectricType = { ts: string, value: number | null };

async function fillNullForDataElectricEmptyInOneDay(
  data: DataElectricType[]
): Promise<DataElectricType[]> {
  var allTimes = [];
  for (var i = 0; i < 24; i++) {
    var hour = (i < 10) ? "0" + i : i;
    allTimes.push(moment(data[0].ts).format("YYYY-MM-DD") +"T" + hour + ":00:00");
  }

  // Chèn mốc thời gian bị thiếu vào mảng ban đầu với giá trị null
  allTimes.forEach(function(time) {
    var found = data.some(function(item) {
        return item.ts === time;
    });
    if (!found) {
        data.push({ "ts": time, "value": null });
    }
  });

  // Sắp xếp lại mảng theo thời gian
  data.sort(function(a, b) {
    return a.ts.localeCompare(b.ts);
  });

  return data;
}
async function fillNullForDataElectricEmptyDayToDay(
  data: DataElectricType[],
  start: moment.Moment,
  end: moment.Moment,
): Promise<DataElectricType[]> {
  var result: DataElectricType[] = [];
  var current = moment(start);

  // Lặp qua từng ngày từ start đến end
  while (current.isSameOrBefore(end, 'day')) {
    // Tạo một mốc thời gian trong ngày và kiểm tra xem nó có trong mảng dữ liệu không
    var time = current.format("YYYY-MM-DD") + "T00:00:00";
    var found = data.some(function(item) {
      return item.ts === time;
    });
    // Nếu không tìm thấy, thêm một mục mới với giá trị null
    if (!found) {
      result.push({ "ts": time, "value": null });
    }
    // Di chuyển đến ngày tiếp theo
    current.add(1, 'day');
  }

  // Kết hợp mảng kết quả với mảng dữ liệu ban đầu và sắp xếp lại theo thời gian
  return data.concat(result).sort(function(a, b) {
    return a.ts.localeCompare(b.ts);
  });
};

async function getLatestEnergyDataDayToDayInMonth(
  lisId: DataIdMetterType[], 
  start: moment.Moment, 
  end: moment.Moment
): Promise<any> {
  let latestData = null
  const result = await checkRangeTimeForIdMetter(lisId, start, end);
  if(result.length === 0) {
    latestData= null;
  } else if(result.length === 1){
    let id: string = result[0].value;
    let data = await EnergyController.getElectricV2(
      start,
      end,
      id,
      'Total kWh',
      'MONTH',
      1,
      'MAX',
    );
    if(data) {
      if(data.length > 0) {
        latestData = data[0].value;
      } else {
        latestData = null;
      }
    }      
  } else if(result.length > 1) {
    for(let i = result.length - 1; i >= 0; i--) {
      let id = result[i].value;
      let data = await EnergyController.getElectricV2(
        start,
        end,
        id,
        'Total kWh',
        'MONTH',
        1,
        'MAX',
      );

      if(data) {
        if(data.length > 0) {
          latestData = data[0].value;
          break;
        } else {
          latestData = null;
        }
      } 
    }
  }
  return latestData;
}

async function getLatestEnergyDataDayToDayStartOfMonth(
  lisId: DataIdMetterType[], 
  start: moment.Moment, 
  end: moment.Moment
): Promise<any> {
  let latestData = null
  const result = await checkRangeTimeForIdMetter(lisId, start, end);
  if(result.length === 0) {
    latestData= null;
  } else if(result.length === 1){
    let id: string = result[0].value;
    let data = await EnergyController.getElectricV2(
      start,
      end,
      id,
      'Total kWh',
      'MONTH',
      1,
      'MIN',
    );
    if(data) {
      if(data.length > 0) {
        latestData = data[0].value;
      } else {
        latestData = null;
      }
    }      
  } else if(result.length > 1) {
    for(let i = 0; i < result.length; i++) {
      let id = result[i].value;
      let data = await EnergyController.getElectricV2(
        start,
        end,
        id,
        'Total kWh',
        'MONTH',
        1,
        'MIN',
      );

      if(data) {
        if(data.length > 0) {
          latestData = data[0].value;
          break;
        } else {
          latestData = null;
        }
      } 
    }
  }
  return latestData;
}

async function generatePDF(json, banking, energy): Promise<Buffer> {
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
    const parsedDate = moment(json.expireTime, "DD/MM/YYYY");
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
                  text: `${json.expenseWifiN}`,
                  alignment: "left",
                },
                {
                  text: `${json.typeWifiN}`,
                },
                {
                  text: `${json.unitPriceWifiN} đ`,
                },
                {
                  text: `${json.totalWifiN} đ`,
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

async function generateBillMonthlyPDF(json, banking, energy): Promise<Buffer> {
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
    const parsedDate = moment(new Date(json.startTime), "DD/MM/YYYY");
    const month = parsedDate.format("MM");
    const year = parsedDate.format("YYYY");
    const lastDayOfMonth = parsedDate.endOf("month").format("DD");
    const expireTime = moment(new Date(json.expireTime)).format("DD/MM/YYYY");
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
                  text: `${json.expenseWifiN}`,
                  alignment: "left",
                },
                {
                  text: `${json.typeWifiN}`,
                },
                {
                  text: `${json.unitPriceWifiN} đ`,
                },
                {
                  text: `${json.totalWifiN} đ`,
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
                  text: `${banking.nameBankOwner}\n`,
                },
                {
                  text: `Tên Tài Khoản: ${banking.nameOwnerBankOwner}\n`,
                },
                {
                  text: `Số tài khoản: ${banking.numberBankOwner}\n`,
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
                  text: `Đã thanh toán`,
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

async function generateBillDepositPDF(json, banking): Promise<Buffer> {
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
                  text: `HÓA ĐƠN ĐẶT CỌC PHÒNG`,
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
                  text: `Số tiền cọc`,
                  alignment: "left",
                },
                {
                  text: `1`,
                },
                {
                  text: `${json.totalAll} đ`,
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
                  text: `${banking.nameBankOwner}\n`,
                },
                {
                  text: `Tên Tài Khoản: ${banking.nameOwnerBankOwner}\n`,
                },
                {
                  text: `Số tài khoản: ${banking.numberBankOwner}\n`,
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
                  text: `Đã thanh toán`,
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
async function generateOrderDepositPendingPayPDF(json, banking): Promise<Buffer> {
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
                  text: `HÓA ĐƠN ĐẶT CỌC PHÒNG`,
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
                  text: `Số tiền cọc`,
                  alignment: "left",
                },
                {
                  text: `1`,
                },
                {
                  text: `${json.totalAll} đ`,
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
                  text: `${banking.nameBankOwner}\n`,
                },
                {
                  text: `Tên Tài Khoản: ${banking.nameOwnerBankOwner}\n`,
                },
                {
                  text: `Số tài khoản: ${banking.numberBankOwner}\n`,
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

async function generateCombinedPDF(totalJson, jsonTitle, banking, energy): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let fontpathnormal = __dirname + "/fonts/roboto/Roboto-Regular.ttf";
    let fontpathbold = __dirname + "/fonts/roboto/Roboto-Medium.ttf";
    let fontpathitalics = __dirname + "/fonts/roboto/Roboto-Italic.ttf";
    let fontpathbolditalics = __dirname + "/fonts/roboto/Roboto-MediumItalic.ttf";
    var fonts = {
      Roboto: {
        normal: fontpathnormal,
        bold: fontpathbold,
        italics: fontpathitalics,
        bolditalics: fontpathbolditalics,
      },
    };

    const tableBody = [];
    let totalAndTaxAll = 0; // Tổng số tiền
    if (totalJson) {
      for (const key in totalJson) {
        if (Object.hasOwnProperty.call(totalJson, key)) {
          const json = totalJson[key];
          const total = parseFloat(json.totalAndTaxAll); // Lấy giá trị số tiền từ mỗi dòng
          totalAndTaxAll += total; // Cộng vào tổng số tiền
          tableBody.push([
            { text: `${key}`, style: "tableHeader" },
            { text: `${json.nameUser}`, style: "tableHeader" },
            { text: `${json.phoneUser}`, style: "tableHeader" },
            { text: `${json.totalRoom}`, style: "tableHeader" },
            { text: `${json.typeElectricity}`, style: "tableHeader" },
            { text: `${json.totalElectricity}`, style: "tableHeader" },
            { text: `${json.typeWater}`, style: "tableHeader" },
            { text: `${json.totalWater}`, style: "tableHeader" },
            { text: `${json.totalWifi}`, style: "tableHeader" },
            { text: `${json.totalGarbage}`, style: "tableHeader" },
            { text: `${json.totalOther}`, style: "tableHeader" },
            { text: `${total.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`, style: "tableHeader" }, // Định dạng số tiền và thêm vào cột tổng cộng
          ])
        }
      }
    }

    const parsedDate = moment(jsonTitle.expireTime, "DD/MM/YYYY");
    const month = parsedDate.format("MM");
    const year = parsedDate.format("YYYY");
    const lastDayOfMonth = parsedDate.endOf("month").format("DD");
    const titleTableBody = [];
    if (energy) {
      for (let i = 0; i < energy.labelTime.length; i++) {
        const time = energy.labelTime[i] || "Không có dữ liệu";
        const parsedTime = time ? moment(time).format("DD/MM/YYYY") : "0";
        const kWh = energy.kWhData[i];
        const formattedKWh = kWh ? kWh.toFixed(3) : "0";
        const totalPrice = (kWh || 0) * 3900;
        const formattedTotalPrice = totalPrice.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        titleTableBody.push([
          parsedTime || "0",
          formattedKWh || "0",
          formattedTotalPrice,
        ]);
      }
    }

    var docDefinition = {
      pageMargins: [20, 30, 30, 20],
      pageOrientation: 'landscape',
      content: [
        {
          columns: [
            {
              width: 60,
              image: __dirname + "/homeland-logo.jpg",
              alignment: "left",
            },
            {
              width: 'auto',
              stack: [
                {
                  text: `HÓA ĐƠN THÁNG ${month}`,
                  style: "header",
                  alignment: "center",
                },
              ],
              alignment: 'center',
              margin: [260, 16, 0, 0],
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
                  text: `TÒA NHÀ: ${jsonTitle.nameMotel}\n`,
                  fontSize: 15,
                  bold: true,
                  color: "red",
                },
                {
                  text: `Địa chỉ: ${jsonTitle.addressMotel}\n\n`,
                },
              ],
            },
            {
              alignment: "right",
              text: [
                {
                  text: `Ngày xuất file: ${jsonTitle.dateBill}\n`,
                },
              ],
            },
          ],
        },
        {
          text: "................................................................................",
          alignment: "center",
        },
        {
          style: "tableExample",
          alignment: "center",
          table: {
            headerRows: 1,
            widths: ["auto", "*", "auto", "auto", "auto", "auto", "auto", "auto", "auto", "auto", "auto", "auto"],
            body: [
              [
                { text: "Mã phòng", style: "tableHeader" },
                { text: "Họ tên", style: "tableHeader" },
                { text: "Số điện thoại", style: "tableHeader" },
                { text: "Giá phòng", style: "tableHeader" },
                { text: "Số điện (kWh)", style: "tableHeader" },
                { text: "Tiền điện", style: "tableHeader" },
                { text: "Số nước (Khối)", style: "tableHeader" },
                { text: "Tiền nước", style: "tableHeader" },
                { text: "Phí xe", style: "tableHeader" },
                { text: "Phí dịch vụ", style: "tableHeader" },
                { text: "Phí khác", style: "tableHeader" },
                { text: "Tổng cộng", style: "tableHeader" },
              ],
              ...tableBody,
              [
                { text: "Tổng cộng", colSpan: 11, alignment: "right", style: "tableHeader" },
                {},
                {},
                {},
                {},
                {},
                {},
                {},
                {},
                {},
                {},
                { text: `${totalAndTaxAll.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`, style: "tableHeader" }, // Định dạng số tiền và thêm vào cột tổng cộng
              ],
            ],
          },
        },
        {
          text: "................................................................................",
          alignment: "center",
        },
      ],
      styles: {
        header: {
          fontSize: 18,
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
    pdfDoc.end();
  });
}

async function countElectric(jobId, startTime, endTime): Promise<number> {
  // 2024-03-01 YYYY-MM-DD
  console.log({jobId});
  console.log(typeof(jobId));
  console.log(jobId.length);
  console.log("startTime", startTime);

  const lastStartDay = new Date(startTime);
  console.log("lastStartDay", lastStartDay);

  console.log("endTime", endTime);
  const lastEndDay = new Date(endTime);
  lastEndDay.setHours(30, 59, 59, 999);

  console.log("lastEndDay", lastEndDay);

  console.log("Kết quả phép so sánh:", lastStartDay < lastEndDay);

  if (lastStartDay > lastEndDay) {
    return null;
  }

  const { 
    electrics: ElectricsModel,
    room: roomModel,
    job: jobModel } = global.mongoModel;

  try {
    const jobData = await jobModel.findOne({_id: jobId})
                                                        .lean()
                                                        .exec()

    console.log({jobData});
    if (jobData) {
      const roomId = jobData.room;
      const roomData = await roomModel.findOne(roomId)
                                                                  .lean()
                                                                  .exec();
      if (roomData) {
        const id = roomData.idElectricMetter;
        console.log({id});
        if (id) {
          const datesInRange: Date[] = [];
          let currentDate = new Date(lastStartDay);

          while (currentDate <= lastEndDay) {
            datesInRange.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
          }

          const resultData = [];
          for (const date of datesInRange) {
            // console.log("date", date);
            const endOfDay = new Date(date);
            // console.log("endOfDay", endOfDay);
            endOfDay.setHours(30, 59, 59, 999);
            // console.log("endOfDay", endOfDay);

            const query = {
              IdDevice: id,
              Time: {
                $gte: date,
                $lte: endOfDay,
              },
            };

            const result = await ElectricsModel.findOne(query)
              .sort({ Time: -1 })
              .lean()
              .exec();
            resultData.push(result);
            // console.log(
            //   `Dữ liệu ${id} vào cuối ngày ${date.toISOString()}:`,
            //   result
            // );
          }

          const totalKwhPerDay = resultData.map((item) =>
            item !== null ? item.Total_kWh : null
          );

          const labelTime: (string | null)[] = resultData.map((item) => {
            if (item !== null) {
              const date = new Date(item.Time);
              // console.log("date", date);
              const formattedDate = date.toISOString().split("T")[0];
              return formattedDate;
            } else {
              return null;
            }
          });

          // const labelTime = [];
          // console.log("labelTime", labelTime);

          const query = {
            IdDevice: id,
            Time: {
              $lte: lastStartDay,
            },
          };

          const dataBefore = await ElectricsModel.findOne(query)
            .sort({ Time: -1 })
            .lean()
            .exec();

          let kWhData = [];
          let lastValue = 0;
          if (dataBefore !== null) {
            lastValue = dataBefore.Total_kWh;
          }

          // const kWhArr = totalKwhPerDay.map(item => (item !== null ? item.Total_kWh : null));

          for (let i = 0; i < totalKwhPerDay.length; i++) {
            if (totalKwhPerDay[i] === null) {
              kWhData.push(null);
            } else {
              let result = totalKwhPerDay[i] - lastValue;
              // Trường hợp thay đồng hồ khác có chỉ số nhỏ hơn chỉ số cũ, nếu ngày đó thay đồng hồ thì chấp nhận mất dữ liệu của ngày đó
              if (result < 0) {
                kWhData.push(null);
                lastValue = totalKwhPerDay[i];
              } else {
                kWhData.push(result);
                lastValue = totalKwhPerDay[i];
              }
            }
          }

          const totalkWhTime = kWhData.reduce((acc, curr) => acc + curr, 0);

          const data = {
            totalkWhTime: totalkWhTime,
            labelTime: labelTime,
            kWhData: kWhData,
            totalKwhPerDay: totalKwhPerDay,
            dataBefore: dataBefore,
            rawData: resultData,
          };

          console.log({data});
          return totalkWhTime;
        } 
      }
    }
    return null;
  } catch (error) {
    console.log({error});
    return null;
  }
}



async function caculateElectricInOneDayForNoDataBefore(
  rawDataElectricInDay: any,
  rawDataElectricInDayLength: number,
): Promise<any> {
  let kWhData = [];
  let lastValue = rawDataElectricInDay[0].value;

  let newRawDataElectricInDay: DataElectricType[] = [];
  // type DataElectricType = { ts: string, value: number };
  

  if(rawDataElectricInDayLength < 24) {
    newRawDataElectricInDay = await fillNullForDataElectricEmptyInOneDay(rawDataElectricInDay);
  } else {
    newRawDataElectricInDay = rawDataElectricInDay;
  }

  const labelTime = newRawDataElectricInDay.map((data) => {
    return data.ts;
  })

  for (let i = 0; i < newRawDataElectricInDay.length; i++) {
    if (newRawDataElectricInDay[i].value === null) {
      kWhData.push(null);
    } else {
      let result = newRawDataElectricInDay[i].value - lastValue;
      kWhData.push(parseFloat(result.toFixed(3)));
      lastValue = newRawDataElectricInDay[i].value;
    }
  }

  const totalkWhTime = kWhData.reduce((acc, curr) => acc + curr, 0);

  console.log({totalkWhTime})

  const resResult = {
    totalkWhTime: totalkWhTime,
    labelTime: labelTime,
    kWhData: kWhData,
  }
  return resResult;
}

async function caculateElectricInOneDayForHaveDataBefore(
  rawDataElectricInDay: any,
  rawDataElectricInDayLength: number,
  id: string,
  timeHaveDataBeforeLatest: string,
  dayBefore: moment.Moment,
): Promise<any> {
  //TH BÌNH THƯỜNG: có dữ liệu trong vòng 1 tháng trước đó

  const dataElectricLatestBeforeDay = await EnergyController.getElectric(
    moment(timeHaveDataBeforeLatest).format("YYYY-MM-DD"),
    dayBefore.format("YYYY-MM-DD"),
    id,
    'Total kWh',
    'DAY',
    1,
    'MAX',
  );

  console.log({dataElectricLatestBeforeDay});
  let dataBeforeDay = dataElectricLatestBeforeDay[0];
  console.log({dataBeforeDay});

  let newRawDataElectricInDay: DataElectricType[] = [];

  
  

  if(rawDataElectricInDayLength < 24) {
    newRawDataElectricInDay = await fillNullForDataElectricEmptyInOneDay(rawDataElectricInDay);
  } else {
    newRawDataElectricInDay = rawDataElectricInDay;
  }

  const labelTime = newRawDataElectricInDay.map((data) => {
    return data.ts;
  })

  let kWhData = [];
  let lastValue = 0;
  if (dataBeforeDay.value !== null) {
    lastValue = dataBeforeDay.value;
  }

  for (let i = 0; i < newRawDataElectricInDay.length; i++) {
    if (newRawDataElectricInDay[i].value === null) {
      kWhData.push(null);
    } else {
      let result = newRawDataElectricInDay[i].value - lastValue;
      kWhData.push(parseFloat(result.toFixed(3)));
      lastValue = newRawDataElectricInDay[i].value;
    }
  }

  const totalkWhTime = kWhData.reduce((acc, curr) => acc + curr, 0);

  console.log({totalkWhTime});

  const resResult = {
    totalkWhTime: totalkWhTime,
    labelTime: labelTime,
    kWhData: kWhData,
  }

  return resResult;
}


//return: 
// [] => không có dữ liệu năng lượng
//[n] => có dữ liệu
async function getElementRawDataElectricForTimePointHaveManyTimeLineInOneDay(
  startQuery: moment.Moment,
  endQuery: moment.Moment,
  id: string,
): Promise<DataElectricType[]> {
  let kWhDataWithTime: DataElectricType[] = []; 
  let rawDataElectricInDay = await EnergyController.getElectricV2(
    startQuery, //start
    endQuery, //end
    id,
    'Total kWh', //key
    'HOUR',
    1,
    'MAX'
  );

  const rawDataElectricInDayLength = rawDataElectricInDay.length;
  if (rawDataElectricInDayLength === 0) {
    return kWhDataWithTime;
  }

  rawDataElectricInDay = rawDataElectricInDay.reverse();
  // const dayBefore = startQuery.subtract(1, "days").set({ hour: 23, minute: 59, second: 59 });

  const dayBefore = startQuery; //NOTE: lấy trường hợp trước đó hoặc bằng, ở đây là thời điểm đầu ngày
  //00h00p00s => nếu trường hợp bằng xảy ra thì cần cân nhắc
  let dayBeforeOneMonth  = moment(dayBefore).subtract(1, "months");

  const dataCountOneMonthBefore = await EnergyController.getElectricV2(
    dayBeforeOneMonth,
    dayBefore,
    id,
    'Total kWh',
    'MONTH',
    1,
    'COUNT',
  );

  console.log({dataCountOneMonthBefore});

  //ví dụ: dataCountOneMonthBefore =
  // [
  //   {
  //     "ts": "2024-05-01T00:00:00",
  //     "value": 590
  //   },
  //   {
  //     "ts": "2024-04-01T00:00:00",
  //     "value": 2046
  //   }
  // ]
  // api trên được viết chắc chắn trả về {}, các {} được sắp xếp với thời gian giảm dần
  //=> Lặp qua để kiểm tra 
  let count = 0;
  let positionHaveData = -1;
  for (let i = 0; i < dataCountOneMonthBefore.length; i++) {
    if(dataCountOneMonthBefore[i].value !== 0) {
      positionHaveData = i;
      break;
    } else {
      count++;
    }
  }

  if (rawDataElectricInDayLength === 1 && count === dataCountOneMonthBefore.length) {
    // Chỉ có 1 bản ghi dữ liệu vào ngày hôm nay, đã 1 tháng kể từ trước hôm nay không có dữ liệu, 
    // không thể tính được điện đã sử dụng
    return kWhDataWithTime;
  } else if (rawDataElectricInDayLength >= 2 && count === dataCountOneMonthBefore.length) {
    //không có dữ liệu trong vòng 1 tháng trước nhưng dữ liệu trong khoảng truy xuất có từ 2 bản ghi trở lên
    // lấy giá trị đầu tiên của ngày làm mốc

    // type DataElectricType = { ts: string, value: number };
    let lastValue = rawDataElectricInDay[0].value;
    console.log({lastValue});
    console.log({rawDataElectricInDay});

    for (let i = 0; i < rawDataElectricInDay.length; i++) {
      let result = rawDataElectricInDay[i].value - lastValue;
      kWhDataWithTime.push({"ts": rawDataElectricInDay[i].ts, "value": parseFloat(result.toFixed(3))});
      lastValue = rawDataElectricInDay[i].value;
    }

    return kWhDataWithTime;

  }

   //TH BÌNH THƯỜNG: có dữ liệu trong vòng 1 tháng trước đó
  const timeHaveDataBeforeLatest : string = dataCountOneMonthBefore[positionHaveData].ts;

  const dataElectricLatestBeforeDay = await EnergyController.getElectricV2(
    moment(timeHaveDataBeforeLatest),
    dayBefore,
    id,
    'Total kWh',
    'DAY',
    1,
    'MAX',
  );

  // type DataElectricType = { ts: string, value: number };
  let lastValue = dataElectricLatestBeforeDay[0].value;
  console.log({lastValue});
  console.log({dataElectricLatestBeforeDay});

  for (let i = 0; i < rawDataElectricInDay.length; i++) {
    let result = rawDataElectricInDay[i].value - lastValue;
    kWhDataWithTime.push({"ts": rawDataElectricInDay[i].ts, "value": parseFloat(result.toFixed(3))});
    lastValue = rawDataElectricInDay[i].value;
  }

  // console.log({kWhDataWithTime});
  return kWhDataWithTime;
}


async function getElementRawDataElectricForTimePointHaveManyTimeLineDayToDay(
  startQuery: moment.Moment,
  endQuery: moment.Moment,
  id: string,
): Promise<DataElectricType[]> {
  let kWhDataWithTime: DataElectricType[] = []; 
  console.log({startQuery});
  console.log({endQuery});

  let latestDataBeforeMonth = null;

  let rawDataElectricInDay = await EnergyController.getElectricV2(
    startQuery, //start
    endQuery, //end
    id,
    'Total kWh', //key
    'DAY',
    1,
    'MAX'
  );

  console.log({rawDataElectricInDay});

  const rawDataElectricInDayLength = rawDataElectricInDay.length;
  if (rawDataElectricInDayLength === 0) {
    console.log("XXX")
    return kWhDataWithTime;
  }

  rawDataElectricInDay = rawDataElectricInDay.reverse();
  // const dayBefore = startQuery.subtract(1, "days").set({ hour: 23, minute: 59, second: 59 });

  const dayBefore = startQuery; //NOTE: lấy trường hợp trước đó hoặc bằng, ở đây là thời điểm đầu ngày
  //00h00p00s có dữ liệu => nếu trường hợp bằng xảy ra thì cần cân nhắc
  let dayBeforeOneMonth  = moment(dayBefore).subtract(1, "months");

  const dataCountOneMonthBefore = await EnergyController.getElectricV2(
    dayBeforeOneMonth,
    dayBefore,
    id,
    'Total kWh',
    'MONTH',
    1,
    'COUNT',
  );

  // console.log({dataCountOneMonthBefore});

  //ví dụ: dataCountOneMonthBefore =
  // [
  //   {
  //     "ts": "2024-05-01T00:00:00",
  //     "value": 590
  //   },
  //   {
  //     "ts": "2024-04-01T00:00:00",
  //     "value": 2046
  //   }
  // ]
  // api trên được viết chắc chắn trả về {}, các {} được sắp xếp với thời gian giảm dần
  //=> Lặp qua để kiểm tra 
  let count = 0;
  let positionHaveData = -1;
  for (let i = 0; i < dataCountOneMonthBefore.length; i++) {
    if(dataCountOneMonthBefore[i].value !== 0) {
      positionHaveData = i;
      break;
    } else {
      count++;
    }
  }

  if (rawDataElectricInDayLength === 1 && count === dataCountOneMonthBefore.length) {
    // Chỉ có 1 bản ghi dữ liệu vào ngày hôm nay, đã 1 tháng kể từ trước hôm nay không có dữ liệu, 
    // không thể tính được điện đã sử dụng
    
    return kWhDataWithTime;
  } else if (rawDataElectricInDayLength >= 2 && count === dataCountOneMonthBefore.length) {
    //không có dữ liệu trong vòng 1 tháng trước nhưng dữ liệu trong khoảng truy xuất có từ 2 bản ghi trở lên
    // lấy giá trị đầu tiên của ngày làm mốc

    // type DataElectricType = { ts: string, value: number };
    let lastValue = rawDataElectricInDay[0].value;
    // console.log({lastValue});
    // console.log({rawDataElectricInDay});

    for (let i = 0; i < rawDataElectricInDay.length; i++) {
      let result = rawDataElectricInDay[i].value - lastValue;
      kWhDataWithTime.push({"ts": rawDataElectricInDay[i].ts, "value": parseFloat(result.toFixed(3))});
      lastValue = rawDataElectricInDay[i].value;
    }

    
    return kWhDataWithTime;

  }

   //TH BÌNH THƯỜNG: có dữ liệu trong vòng 1 tháng trước đó
  const timeHaveDataBeforeLatest : string = dataCountOneMonthBefore[positionHaveData].ts;

  const dataElectricLatestBeforeDay = await EnergyController.getElectricV2(
    moment(timeHaveDataBeforeLatest),
    dayBefore,
    id,
    'Total kWh',
    'DAY',
    1,
    'MAX',
  );

  // type DataElectricType = { ts: string, value: number };
  let lastValue = dataElectricLatestBeforeDay[0].value;
  // console.log({lastValue});
  // console.log({dataElectricLatestBeforeDay});

  for (let i = 0; i < rawDataElectricInDay.length; i++) {
    let result = rawDataElectricInDay[i].value - lastValue;
    kWhDataWithTime.push({"ts": rawDataElectricInDay[i].ts, "value": parseFloat(result.toFixed(3))});
    lastValue = rawDataElectricInDay[i].value;
  }

  // console.log({kWhDataWithTime});
  
  return kWhDataWithTime;
}


//tính số điện
//sắp xếp theo thời gian
//fill null
type ResultHandledElectricData = {
  totalkWhTime: number,
  labelTime: string[],
  kWhData: number[],
}
async function handleRawToCalculatedElectricDataInOneDay(
  resultTotalAll:DataElectricType[]
): Promise<ResultHandledElectricData> {
  const resultIncludeTime = await fillNullForDataElectricEmptyInOneDay(resultTotalAll);

  let totalkWhTime = resultIncludeTime.reduce((accumulator, currentValue) => {
    if (currentValue.value !== null) {
      return accumulator + currentValue.value;
    } else {
      return accumulator;
    }
  }, 0);

  totalkWhTime = parseFloat(totalkWhTime.toFixed(3));

  let labelTime = resultIncludeTime.map(item => item.ts);
  let kWhData = resultIncludeTime.map(item => item.value);

  const resResult = {
    totalkWhTime: totalkWhTime,
    labelTime: labelTime,
    kWhData: kWhData,
  }

  return resResult;
}

async function handleRawToCalculatedElectricDataDayToDay(
  resultTotalAll:DataElectricType[],
  start: moment.Moment,
  end: moment.Moment,
): Promise<ResultHandledElectricData> {
  const resultIncludeTime = await fillNullForDataElectricEmptyDayToDay(
    resultTotalAll,
    start,
    end
  );

  let totalkWhTime = resultIncludeTime.reduce((accumulator, currentValue) => {
    if (currentValue.value !== null) {
      return accumulator + currentValue.value;
    } else {
      return accumulator;
    }
  }, 0);

  totalkWhTime = parseFloat(totalkWhTime.toFixed(3));


  let labelTime = resultIncludeTime.map(item => item.ts.split('T')[0]);
  let kWhData = resultIncludeTime.map(item => item.value);

  const resResult = {
    totalkWhTime: totalkWhTime,
    labelTime: labelTime,
    kWhData: kWhData,
  }

  return resResult;
}

//Xử lý các trường hợp 2 id trong 1 ngày dẫn đến trùng thời gian 2 ngày
//cộng tổng giá trị của chúng
async function handleDuplicateTimeTotalKwh(
  resultTotalAll: DataElectricType[]
): Promise<DataElectricType[]>{
  let map = {};
        resultTotalAll.forEach(item => {
            if (!map[item.ts]) {
                map[item.ts] = item.value;
            } else {
                map[item.ts] += item.value;
            }
        });

        let resultX = [];
        for (let key in map) {
            resultX.push({ ts: key, value: map[key] });
        }
  return resultX;
}

//monthly, deposit, afterCheckICost
async function getBufferOrderAllType(
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
    const unitPriceWifiN = roomData.wifiPriceN; 
    const unitPriceOther = 0;

    const typeRoom: number = orderData.numberDayStay;
    const typeWater: number = roomData.person;
    const typeGarbage: string = "1";
    const typeWifi: number = roomData.vihicle;
    const typeWifiN: number = roomData.person;
    const typeOther = 0;
    let typeElectricity: number = orderData.electricNumber;

    const totalAll = parseInt(orderData.amount);
    const totalAndTaxAll = parseInt(orderData.amount);
    const totalRoom = parseInt(orderData.roomPrice);
    const totalWifi = parseInt(orderData.vehiclePrice);
    const totalWifiN = parseInt(orderData.wifiPrice);
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

        expenseWifiN: "Chi Phí Xe",
        typeWifiN: typeWifiN,
        unitPriceWifiN: unitPriceWifiN,
        totalWifiN: totalWifiN,

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
  } else if(orderData.type === "afterCheckInCost") {
    const bankData = {
      nameBankOwner: banking[0].nameTkLable,
      nameOwnerBankOwner: banking[0].nameTk,
      numberBankOwner: banking[0].stk,
    };
    const idBill: string = orderData.keyOrder;

    const totalAll = parseInt(orderData.amount);
    const totalAndTaxAll = parseInt(orderData.amount);

    const expireTime = moment(new Date(orderData.expireTime)).format("DD/MM/YYYY");
    const startTime = moment(new Date(orderData.createdAt)).format("DD/MM/YYYY");

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

      let json = {};

      json = {
        idBill: idBill,
        phoneOwner: phoneOwner,
        expireTime: expireTime,
        dateBill: startTime,
        startTime: startTime,
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
      };

      const buffer = await generateOrderDepositPendingPayPDF(json, bankData);
      
      return buffer;
    }
  } else if(orderData.type === "deposit") {
    const bankData = {
      nameBankOwner: banking[0].nameTkLable,
      nameOwnerBankOwner: banking[0].nameTk,
      numberBankOwner: banking[0].stk,
    };
    const idBill: string = orderData.keyOrder;

    const totalAll = parseInt(orderData.amount);
    const totalAndTaxAll = parseInt(orderData.amount);

    const expireTime = moment(new Date(orderData.expireTime)).format("DD/MM/YYYY");
    const startTime = moment(new Date(orderData.createdAt)).format("DD/MM/YYYY");

    const userId = orderData.user;
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

    let json = {};

    json = {
      idBill: idBill,
      phoneOwner: phoneOwner,
      expireTime: expireTime,
      dateBill: startTime,
      startTime: startTime,
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
    };

    const buffer = await generateOrderDepositPendingPayPDF(json, bankData);

    return buffer;
  }
}





//---------------------------------
//XỬ LÝ DỮ LIỆU NĂNG LƯỢNG
// start: moment.Moment, 
        // end: moment.Moment, 
        // id: string, 
        // key: string, 
        // intervalType: string,
        // interval: number,
        // aggType: string,
        //-----------------------------
        // let rawDataElectricInDay = await EnergyController.getElectricV2(
        //   start, //start
        //   end, //end
        //   id,
        //   'Total kWh', //key
        //   'HOUR',
        //   1,
        //   'MAX'
        // );

        // rawDataElectricInDay = rawDataElectricInDay.reverse();
        // const rawDataElectricInDayLength = rawDataElectricInDay.length;

        // if (rawDataElectricInDayLength === 0) {
        //   return HttpResponse.returnBadRequestResponse(
        //     res, 
        //     "Không có dữ liệu năng lượng"
        //   );
        // }

        // const dayBefore = moment(day + "T23:59:59+07:00").subtract(1, "days");

        // let dayBeforeOneMonth  = moment(dayBefore).subtract(1, "months");

        // const dataCountOneMonthBefore = await EnergyController.getElectricV2(
        //   dayBeforeOneMonth,
        //   dayBefore,
        //   id,
        //   'Total kWh',
        //   'MONTH',
        //   1,
        //   'COUNT',
        // );

        // //ví dụ: dataCountOneMonthBefore =
        // // [
        // //   {
        // //     "ts": "2024-05-01T00:00:00",
        // //     "value": 590
        // //   },
        // //   {
        // //     "ts": "2024-04-01T00:00:00",
        // //     "value": 2046
        // //   }
        // // ]
        // // api trên được viết chắc chắn trả về {}, các {} được sắp xếp với thời gian giảm dần
        // //=> Lặp qua để kiểm tra 
        // let count = 0;
        // let positionHaveData = -1;
        // for (let i = 0; i < dataCountOneMonthBefore.length; i++) {
        //   if(dataCountOneMonthBefore[i].value !== 0) {
        //     positionHaveData = i;
        //     break;
        //   } else {
        //     count++;
        //   }
        // }
        
        // if (rawDataElectricInDayLength === 1 && count === dataCountOneMonthBefore.length) {
        //   return HttpResponse.returnBadRequestResponse(
        //     res,
        //     "Chỉ có 1 bản ghi dữ liệu vào ngày hôm nay, đã 1 tháng kể từ trước hôm nay không có dữ liệu, không thể tính được điện đã sử dụng"
        //   )
        // } else if (rawDataElectricInDayLength >= 2 && count === dataCountOneMonthBefore.length) {
        //   //không có dữ liệu trong vòng 1 tháng trước nhưng dữ liệu trong khoảng truy xuất có từ 2 bản ghi trở lên
        //   // lấy giá trị đầu tiên của ngày làm mốc
        //   const resResult = await caculateElectricInOneDayForNoDataBefore(rawDataElectricInDay, rawDataElectricInDayLength);
  
        //   return HttpResponse.returnSuccessResponse(res, resResult);
        // }

        //  //TH BÌNH THƯỜNG: có dữ liệu trong vòng 1 tháng trước đó
        // const timeHaveDataBeforeLatest : string = dataCountOneMonthBefore[positionHaveData].ts;

        // const resResult = await caculateElectricInOneDayForHaveDataBefore(
        //   rawDataElectricInDay,
        //   rawDataElectricInDayLength,
        //   id,
        //   timeHaveDataBeforeLatest,
        //   dayBefore
        // );

        // return HttpResponse.returnSuccessResponse(res, resResult);
        //-----------------------------------



