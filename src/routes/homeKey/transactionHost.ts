import * as express from "express";

import ReportProblem from "../../controllers/homeKey/reportProblem";
import AuthMiddleware from "../../middlewares/auth";
import TransactionsController from "../../controllers/homeKey/transactions";
const transactionHostRoute = express.Router();

/* -------------------------------------------------------------------------- */
/*                         START MOTEL ROOM MIDDLEWARE                        */
/* -------------------------------------------------------------------------- */

/* ------------------------------- PUBLIC APIS ------------------------------ */

/* ---------------------------- CHECK PERMISSION ---------------------------- */

// Login
transactionHostRoute.use(AuthMiddleware.isAuthenticated);

transactionHostRoute.use(AuthMiddleware.isHost);
transactionHostRoute
  .route("/host/:id")
  .put(TransactionsController.putTransactionPayment);
transactionHostRoute
  .route("/host")
  .get(TransactionsController.getTransactionPaymentHost);

transactionHostRoute
  .route("/requestWithdraws")
  .post(TransactionsController.postRequestWithdrawHost);
transactionHostRoute
  .route("/requestWithdraws/list/:userId/:motelName")
  .get(TransactionsController.getWithdrawalsRequestListByHost);


/* ------------------------------ PRIVATE APIS ------------------------------ */

/* -------------------------------------------------------------------------- */
/*                          END MOTEL ROOM MIDDLEWARE                         */
/* -------------------------------------------------------------------------- */

export default transactionHostRoute;
