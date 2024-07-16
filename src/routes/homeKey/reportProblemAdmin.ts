import * as express from "express";

import ReportProblem from "../../controllers/homeKey/reportProblem";
import AuthMiddleware from "../../middlewares/auth";

const reportProblemAdminRoute = express.Router();

/* -------------------------------------------------------------------------- */
/*                         START MOTEL ROOM MIDDLEWARE                        */
/* -------------------------------------------------------------------------- */

/* ------------------------------- PUBLIC APIS ------------------------------ */

/* ---------------------------- CHECK PERMISSION ---------------------------- */

// Login
reportProblemAdminRoute.use(AuthMiddleware.isAuthenticated);
// // Admin
reportProblemAdminRoute.use(AuthMiddleware.isMaster);
reportProblemAdminRoute
  .route("/admin")
  .get(ReportProblem.getReportProblemListAdmin);

/* ------------------------------ PRIVATE APIS ------------------------------ */

/* -------------------------------------------------------------------------- */
/*                          END MOTEL ROOM MIDDLEWARE                         */
/* -------------------------------------------------------------------------- */

export default reportProblemAdminRoute;
