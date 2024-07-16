import * as express from "express";

import AuthMiddleware from "../middlewares/auth";

import JobController from "../controllers/homeKey/job.controller";
import OrderController from "../controllers/homeKey/order";
import UserController from "../controllers/user";
import TransactionsController from "../controllers/homeKey/transactions";
import RequestWithdrawsController from "../controllers/homeKey/requestWithdraws";
import MotelRoomController from "../controllers/homeKey/motelRoom";
// const transactionQueue = require("../controllers/homeKey/transactionQueue");
// import transactionQueue from "../controllers/homeKey/transactionQueue"

const adminRoute = express.Router();

adminRoute
  .route("/listMotel/host/:id")
  .get(MotelRoomController.getBuildingListByHost);

/* -------------------------------------------------------------------------- */
/*                            START USER MIDDLEWARE                           */
/* -------------------------------------------------------------------------- */

/* ---------------------------- CHECK PERMISSION ---------------------------- */

adminRoute
  .route("/homeKey/deleteJobByIdRoom/:id")
  .delete(JobController.deleteJobByIdRoom);

// adminRoute
//   .route("/homeKey/deleteJobOnlyInUser/:id")
//   .delete(JobController.deleteJobOnlyInUser);

adminRoute.use(AuthMiddleware.isAuthenticated);
adminRoute.route("/order/:id").get(OrderController.getOrderByUser);
adminRoute
  .route("/transactions/:id")
  .post(TransactionsController.postTransactionPayment);

adminRoute
  .route("/postTransactionsDepositPendingBanking/:id")
  .post(TransactionsController.postTransactionsDepositPendingBanking);
// adminRoute.route('/postTransactionsDepositPendingBanking/:id').post((req, res, next) => {
//   // Add the job to the queue
//   transactionQueue.add({ req, res })
//     .then(() => {
//       // Send an immediate response to the client
//       res.status(202).send({ message: 'Your request is being processed' });
//     })
//     .catch(next);
// });

adminRoute.route("/bankname/user").get(TransactionsController.getBankNameUser);
adminRoute
  .route("/transactions/user")
  .get(TransactionsController.getTransactionUserPayment);

adminRoute.route("/homeKey/order/:id").get(OrderController.getOrderByAdmin);

adminRoute
  .route("/homeKey/monthly-order/list")
  .get(OrderController.getMonthlyOrderListByHost);

adminRoute.route("/homeKey/job/list").get(JobController.getJobListByAdmin);

adminRoute
  .route("/homeKey/order/list/host")
  .get(OrderController.getOrderListByHost);
adminRoute.route("/homeKey/job/list").get(JobController.getJobListByAdmin);

adminRoute.route("/homeKey/job/list").get(JobController.getJobListByAdmin);
adminRoute
  .route("/homeKey/job/user/list/:id")
  .get(JobController.getJobListByAdminWithUser);
adminRoute
  .route("/homeKey/job/:id")
  .get(JobController.getJobByAdmin)
  .delete(JobController.deleteJobByAdmin);

// Master
adminRoute.use(AuthMiddleware.isMaster);

/* ------------------------------- PRIVATE API ------------------------------ */

adminRoute.route("/hostsPendingCensor")
.get(UserController.getListHostPendingCensorByAdmin)
.put(UserController.censorNewHostById);

adminRoute
  .route("/resetPassword/:id")
  .get(TransactionsController.resetPassword);
adminRoute
  .route("/transactions/:id")
  .put(TransactionsController.putTransactionPayment);

adminRoute
  .route("/transactions")
  .get(TransactionsController.getTransactionPayment);

adminRoute.route("/user/:id").get(UserController.getProfileDeatail);
adminRoute
  .route("/user/:id/recharge")
  .put(UserController.rechargeWalletByAdmin);

adminRoute
  .route("/user")
  .get(UserController.getUserList)
  .delete(UserController.deleteUser);

adminRoute
  .route("/homeKey/order/list/admin")
  .get(OrderController.getOrderListByAdmin);

adminRoute
  .route("/homeKey/order/:id")
  .put(OrderController.editOrderByAdmin)
  .delete(OrderController.deleteOrderByAdmin);

adminRoute
  .route("/bank/:id")
  .post(TransactionsController.postAddBank)
  .get(TransactionsController.getBankDetail)
  .delete(TransactionsController.deleteBankName);

adminRoute.route("/bank").get(TransactionsController.getBank);
adminRoute.route("/bankname").get(TransactionsController.getBankName);

// note
adminRoute
  .route("/requestWithdraws")
  .get(RequestWithdrawsController.getRequestWithdraws);

adminRoute
  .route("/requestWithdraws/:id")
  .put(RequestWithdrawsController.putRequestWithdraw);

adminRoute.route("/host").get(UserController.getHostList);

adminRoute.route("/withdrawRequest/list").get(TransactionsController.getWithdrawRequestListAdmin);
adminRoute.route("/approveWithdrawRequest/:id").put(TransactionsController.approveWithdrawalRequest);
adminRoute.route("/rejectWithdrawRequest/:id").put(TransactionsController.rejectWithdrawalRequest);

// adminRoute
//   .route("/listMotel/host")
//   .get(MotelRoomController.getBuildingListByHost)
// -------------------------------------

/* -------------------------------------------------------------------------- */
/*                             END USER MIDDLEWARE                            */
/* -------------------------------------------------------------------------- */

export default adminRoute;
