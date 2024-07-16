import * as express from "express";

import BillController from "../../controllers/homeKey/bill.controller";
import AuthMiddleware from "../../middlewares/auth";

const billRoute = express.Router();

// Login
billRoute.use(AuthMiddleware.isAuthenticated);

/* ------------------------------ PRIVATE APIS ------------------------------ */
billRoute.get("/customer", BillController.getAllBillsOfCustomer);
billRoute.route("/:id").get(BillController.getBillDetail);
billRoute
  .route("/")
  .post(BillController.createBill)
  .get(BillController.getBillList);

export default billRoute;
