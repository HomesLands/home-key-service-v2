import * as express from "express";

import roomRoute from "./room";
import floorRoute from "./floor";
import motelRoute from "./motelRoom";
import jobRoute from "./job";
import deviceRoute from "./device";
import billRoute from "./bill";
import revenueRoute from "./revenue";
import billAdminRoute from "./adminBill";
import reportProblemAdminRoute from "./reportProblemAdmin";
import reportProblemHostRoute from "./reportProblemHost";
import reportProblemRoute from "./reportProblem";
import transactionHostRoute from "./transactionHost";
import energyRoute from "./energy";
import orderRoute from "./order.route";

const homeKeyRoute = express.Router();

homeKeyRoute.use("/motelRoom", motelRoute);
homeKeyRoute.use("/floor", floorRoute);
homeKeyRoute.use("/room", roomRoute);
homeKeyRoute.use("/job", jobRoute);
homeKeyRoute.use("/device", deviceRoute);
homeKeyRoute.use("/bill", billRoute);
homeKeyRoute.use("/revenue", revenueRoute);
homeKeyRoute.use("/admin/bill", billAdminRoute);
homeKeyRoute.use("/reportProblem", reportProblemRoute);
homeKeyRoute.use("/host/reportProblem", reportProblemHostRoute);
homeKeyRoute.use("/admin/reportProblem", reportProblemAdminRoute);
homeKeyRoute.use("/host/transactions", transactionHostRoute);
homeKeyRoute.use("/energy", energyRoute);
homeKeyRoute.use("/order", orderRoute);
// Default public route
export default homeKeyRoute;
