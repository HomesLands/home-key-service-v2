import * as express from "express";

import BillController from "../../controllers/homeKey/bill.controller";
import AuthMiddleware from "../../middlewares/auth";
import e = require("express");

const revenueRoute = express.Router();

// Login
revenueRoute.use(AuthMiddleware.isAuthenticated);

/* ------------------------------ PRIVATE APIS ------------------------------ */
revenueRoute.get("/hostRevenue", BillController.saveHostRevenue);

export default revenueRoute;