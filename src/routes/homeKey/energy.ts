import * as express from "express";

import EnergyController from "../../controllers/homeKey/energy.controller";
import AuthMiddleware from "../../middlewares/auth";

const energyRoute = express.Router();
energyRoute.route("/testFunction").get(EnergyController.testFunction);

//for current user rented room
energyRoute
  .route("/device/historyEnergyByJob/:id/:year")
  .get(EnergyController.getHistoryEnergyByJob);

//for host, admin to manage
energyRoute
  .route("/device/historyEnergyByRoom/:id/:year")
  .get(EnergyController.getHistoryEnergyByRoom);

// 
energyRoute
  .route("/device/historyEnergyByRoomV2/:id/:year")
  .get(EnergyController.getHistoryEnergyByRoomV2);

energyRoute
  .route("/device/getTotalKWhPerHourInOneDay/:idRoom/:day")
  .get(EnergyController.getTotalKWhPerHourInOneDay);


//có xử lý việc thay đồng hồ
energyRoute
  .route("/device/getTotalKWhPerHourInOneDayV2/:idRoom/:day")
  .get(EnergyController.getTotalKWhPerHourInOneDayV2);

energyRoute
  .route("/device/getTotalKWhPerDayInOneMonthV2/:idRoom/:month")
  .get(EnergyController.getTotalKWhPerDayInOneMonthV2);

energyRoute
  .route("/device/getTotalKWhPerDayForDayToDayV2/:idRoom/:start/:end")
  .get(EnergyController.getTotalKWhPerDayForDayToDayV2);


energyRoute
  .route("/device/getListIdMetterElectricByRoom/:id")
  .get(EnergyController.getListIdMetterByRoom);

energyRoute
  .route("/device/addIdMetterElectricForRoom/")
  .put(EnergyController.addIdMetterForRoom);

/* -------------------------------------------------------------------------- */
/*                            START ROOM MIDDLEWARE                           */
/* -------------------------------------------------------------------------- */

/* ------------------------------- PUBLIC API ------------------------------- */

//V1
// energyRoute.route("/device/dataV1/:id").get(EnergyController.getDeviceDataV1);
// energyRoute.route("/device/latestDataV1/:id").get(EnergyController.getLatestDeviceDataV1);
// energyRoute.route("/device/currentDayDataPerHourV1/:id")
//                     .get(EnergyController.getCurrentDayDataPerHourV1);

// energyRoute.route("/device/currentMonDataPerDayV1/:id")
//                     .get(EnergyController.getCurrentMonDataPerDayV1);

// ----------------------BACKUP----------------------------------------


energyRoute.route("/export-pdf").get(EnergyController.exportPdf);

energyRoute
  .route("/device/historyDataPerMon/:id")
  .get(EnergyController.historyDataEnergyPerMon);

energyRoute.route("/device/latestData/:id").get(EnergyController.latestData);

energyRoute
  .route("/device/currentDayDataPerHour/:id")
  .get(EnergyController.getCurrentDayDataPerHour);

energyRoute
  .route("/device/dataInDayPerHourByTime/:id/:time")
  .get(EnergyController.getDataInDayPerHourByTime);

energyRoute
  .route("/device/exportBillRoom/:idMotel/:idRoom/:startTime/:endTime")
  .get(EnergyController.exportBillRoom);

energyRoute
  .route("/device/exportBillAllRoom/:idMotel/:startTime/:endTime")
  .get(EnergyController.exportBillAllRoom);

// energyRoute
//   .route("/device/exportBillAllRoom/:idMotel/:startTime/:endTime")
//   .get(EnergyController.buildingRevenue);

energyRoute
  .route("/device/exportBillBuilding/:idMotel/:startTime/:endTime")
  .get(EnergyController.exportBillBuilding);

// energyRoute
//   .route("/device/buildingRevenue/:idMotel/:startTime/:endTime")
//   .get(EnergyController.buildingRevenue);

// energyRoute
//   .route("/device/buildingRevenue/:idMotel")
//   .get(EnergyController.buildingRevenue);

energyRoute
  .route("/device/hostBuildingList/:idOwner")
  .get(EnergyController.hostBuildingList);

energyRoute
  .route("/device/buildingRevenue/:idMotel/:year")
  .get(EnergyController.buildingRevenue);


energyRoute
  .route("/device/getLastRecordsOfPreviousMonth/:year/:month")
  .get(EnergyController.getLastRecordsOfPreviousMonth);

// V2

/* ---------------------------- CHECK PERMISSION ---------------------------- */
/* ------------------------------ PRIVATE APIS ------------------------------ */
// Login
energyRoute
  .route("/device/getAllDataByYearMonth/:year/:month/:motelId")
  .get(EnergyController.getAllDataByYearMonthV3);
energyRoute.use(AuthMiddleware.isAuthenticated);

energyRoute
  .route("/device/getDataPerDayTimeToTime/:id/:startTime/:endTime")
  .get(EnergyController.getDataTimeToTime);

//Host
energyRoute
  .route("/device/getNameRoomById/:id")
  .get(EnergyController.getNameRoomById);

// energyRoute
//   .route("/device/getAllDataByYearMonth/:year/:month/:motelId")
//   .get(EnergyController.getAllDataByYearMonth);

energyRoute
  .route("/device/currentMonDataPerDay/:id/:year/:month")
  .get(EnergyController.getCurrentMonDataPerDay);

energyRoute
  .route("/device/currentMonDataPerDayV2/:id/")
  .get(EnergyController.getCurrentMonDataPerDayV2);

// Master
energyRoute.use(AuthMiddleware.isMaster);
energyRoute.route("/devices").get(EnergyController.getAllDevice);

energyRoute
  .route("/devices/backUpData/:startTime/:endTime")
  .get(EnergyController.backUpDataPerDay);

energyRoute
  .route("/devices/clearData/:startTime/:endTime")
  .get(EnergyController.clearData);

/* -------------------------------------------------------------------------- */
/*                             END ROOM MIDDLEWARE                            */
/* -------------------------------------------------------------------------- */

export default energyRoute;
