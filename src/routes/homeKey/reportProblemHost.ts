import * as express from "express";

import ReportProblem from "../../controllers/homeKey/reportProblem";
import AuthMiddleware from "../../middlewares/auth";

const reportProblemHostRoute = express.Router();

/* -------------------------------------------------------------------------- */
/*                         START MOTEL ROOM MIDDLEWARE                        */
/* -------------------------------------------------------------------------- */

/* ------------------------------- PUBLIC APIS ------------------------------ */

/* ---------------------------- CHECK PERMISSION ---------------------------- */

// Login
reportProblemHostRoute.use(AuthMiddleware.isAuthenticated);

reportProblemHostRoute.use(AuthMiddleware.isHost);
reportProblemHostRoute
  .route("/host")
  .get(ReportProblem.getReportProblemListHost);

/* ------------------------------ PRIVATE APIS ------------------------------ */

/* -------------------------------------------------------------------------- */
/*                          END MOTEL ROOM MIDDLEWARE                         */
/* -------------------------------------------------------------------------- */

export default reportProblemHostRoute;
