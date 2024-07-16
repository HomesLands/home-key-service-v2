import * as express from "express";

import AuthMiddleware from "../../middlewares/auth";
import OrderController from "../../controllers/homeKey/order";
import TransactionsController from "../../controllers/homeKey/transactions";
import EnergyController from "../../controllers/homeKey/energy.controller";

const orderRoute = express.Router();

orderRoute
  .route("/exportBillPaidByTransaction/:id")
  .post(EnergyController.exportBillPaidByTransaction);
orderRoute
  .route("/exportBillPaidByOrder/:id")
  .post(EnergyController.exportBillPaidByOrder);

orderRoute
  .route("/exportBillRoomPendingPayByOrder/:id")
  .post(EnergyController.exportBillRoomPendingPayByOrder);

orderRoute
    .route("/exportAllBillRoomPendingPayByOrderToMail/")
    .post(EnergyController.exportAllBillRoomPendingPayByOrderToMail);

orderRoute
    .route("/getPayDepositList/:id")
    .get(OrderController.getPayDepositList);
orderRoute
  .route("/getDepositAfterCheckInCostHistoryList/:id")
  .get(OrderController.getDepositAfterCheckInCostHistoryList);

orderRoute
  .route("/getMonthlyHistoryList/:id")
  .get(OrderController.getMonthlyHistoryList);

//Phiên bản V1 là: getOrderListByHost
orderRoute
  .route("/orderDeposit/list/host/:id")
  .get(OrderController.getOrderDepositListByHostV2);
// Login

orderRoute
  .route("/orderMonthlyPendingPaymentListByMotel/:id") //by motel
  .get(TransactionsController.getOrderMonthlyPendingPaymentListByMotel)
orderRoute
  .route("/orderDepositAfterCheckInCostPendingPaymentListByMotel/:id") //by motel
  .get(TransactionsController.getOrderDepositAfterCheckInCostPendingPaymentListByMotel)
orderRoute
  .route("/listOrderNoPayOfPayDeposit/:id") // + id payDeposit
  .get(TransactionsController.getListOrderNoPayOfPayDeposit)

// orderRoute
//   .route("/putBankingCashPendingTransactionByMotel/:id")
//   .put(TransactionsController.putBankingCashPendingTransactionByMotel);

orderRoute
  .route("/payDeposit/:id")
  .put(TransactionsController.putPayDeposit);


//-------------------------------------------------
orderRoute.use(AuthMiddleware.isAuthenticated);

orderRoute
    .route("/getPayDepositListUser/")
    .get(OrderController.getPayDepositListUser);

orderRoute
  .route("/orderPendingPaymentList/") //by user
  .get(TransactionsController.getOrderPendingPaymentList)



orderRoute
  .route("/postTransactionAfterCheckInCostPendingBanking/")
  .post(TransactionsController.postTransactionAfterCheckInCostPendingBanking)


//user
orderRoute
  .route("/bankingCashTransactionsList/")
  .get(TransactionsController.getBankingCashTransactionsList);

orderRoute
  .route("/bankingCashPendingDepositListByMotel/:id")
  .get(TransactionsController.getBankingCashPendingDepositListByMotel)

orderRoute
  .route("/bankingCashPendingAfterCheckInCostListByMotel/:id")
  .get(TransactionsController.getBankingCashPendingAfterCheckInCostListByMotel)

orderRoute
  .route("/bankingCashPendingMonthlyByMotel/:id")
  .get(TransactionsController.getBankingCashPendingMonthlyByMotel)
//--------------------------------------------------------------------
orderRoute.use(AuthMiddleware.isHost);

//hosts
// orderRoute
//   .route("/bankingCashPendingDepositListByMotel/:id")
//   .get(TransactionsController.getBankingCashPendingDepositListByMotel)

// orderRoute
//   .route("/bankingCashPendingMonthlyByMotel/:id")
//   .get(TransactionsController.getBankingCashPendingMonthlyByMotel)
  
  




/* ------------------------------ PRIVATE APIS ------------------------------ */
orderRoute.use(AuthMiddleware.isMaster);

orderRoute
  .route("/putBankingCashPendingTransactionByMotel/:id")
  .put(TransactionsController.putBankingCashPendingTransactionByMotel);

export default orderRoute;


