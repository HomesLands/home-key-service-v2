import * as express from "express";

import BillController from "../../controllers/homeKey/bill.controller";
import RevenueController from "../../controllers/homeKey/revenue.controller";
import AuthMiddleware from "../../middlewares/auth";
import e = require("express");

const revenueRoute = express.Router();

revenueRoute.get("/hostRevenue", RevenueController.updateRevenueApi);
revenueRoute.get("/hostBuildingList/:idMotel/:year", RevenueController.buildingRevenue);
// Login
revenueRoute.use(AuthMiddleware.isAuthenticated);

/* ------------------------------ PRIVATE APIS ------------------------------ */


export default revenueRoute;