import * as express from "express";

import UploadImgController from "../controllers/uploading";

const authRoute = express.Router();

/* -------------------------------------------------------------------------- */
/*                       START AUTHENTICATION MIDDLEWARE                      */
/* -------------------------------------------------------------------------- */

/* ------------------------------- PUBLIC APIS ------------------------------ */
// Local sign up
authRoute.route("/").post(UploadImgController.postUpload);
authRoute.route("/img").get(UploadImgController.getUpload);
authRoute.route("/img/:id").post(UploadImgController.postUploadImgByRoomId);

authRoute
  .route("/img/:id/user")
  .post(UploadImgController.postUploadImgByRoomIdUser);

authRoute
  .route("/img/:id/user/back")
  .post(UploadImgController.postUploadImgByBackIdUser);

authRoute
  .route("/img/:id/user/front")
  .post(UploadImgController.postUploadImgByFrontIdUser);

authRoute
  .route("/img/:id/order")
  .post(UploadImgController.postUploadImgByOrder);

authRoute
  .route("/img/:id/transaction")
  .post(UploadImgController.postUploadImgByRoomIdTransaction);

authRoute
  .route("/img/:id/payDeposit")
  .post(UploadImgController.postUploadImgPayDeposit);

/* ---------------------------- CHECK PERMISSION ---------------------------- */

export default authRoute;
