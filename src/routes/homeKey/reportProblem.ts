import * as express from "express";

import ReportProblem from "../../controllers/homeKey/reportProblem";
import AuthMiddleware from "../../middlewares/auth";

const reportProblemRoute = express.Router();

/* -------------------------------------------------------------------------- */
/*                         START MOTEL ROOM MIDDLEWARE                        */
/* -------------------------------------------------------------------------- */

/* ------------------------------- PUBLIC APIS ------------------------------ */

/* ---------------------------- CHECK PERMISSION ---------------------------- */

// Login
reportProblemRoute.use(AuthMiddleware.isAuthenticated);

/* ------------------------------ PRIVATE APIS ------------------------------ */
reportProblemRoute.route("/img/:id").post(ReportProblem.postUploadImgById);
reportProblemRoute
  .route("/status/:id")
  .post(ReportProblem.postChangeStatusById);
// Create floor
reportProblemRoute.route("/:id").get(ReportProblem.getReportProblemDetail);
reportProblemRoute
  .route("/")
  .post(ReportProblem.createReportProblem)
  .get(ReportProblem.getReportProblemList);

/* -------------------------------------------------------------------------- */
/*                          END MOTEL ROOM MIDDLEWARE                         */
/* -------------------------------------------------------------------------- */

export default reportProblemRoute;
