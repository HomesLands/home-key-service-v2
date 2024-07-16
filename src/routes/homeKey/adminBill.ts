import * as express from "express";

import BillController from "../../controllers/homeKey/bill.controller";
import AuthMiddleware from "../../middlewares/auth";
import MotelRoomController from "../../controllers/homeKey/motelRoom";

const billAdminRoute = express.Router();

/* -------------------------------------------------------------------------- */
/*                         START MOTEL ROOM MIDDLEWARE                        */
/* -------------------------------------------------------------------------- */

/* ------------------------------- PUBLIC APIS ------------------------------ */

/* ---------------------------- CHECK PERMISSION ---------------------------- */

// Login
billAdminRoute.use(AuthMiddleware.isAuthenticated);
billAdminRoute.route("/pdf/:id").post(MotelRoomController.postExportPdfById);
billAdminRoute.use(AuthMiddleware.isMaster);

/* ------------------------------ PRIVATE APIS ------------------------------ */

billAdminRoute.route("/").get(BillController.getBillListAdmin);

// Admin

/* -------------------------------------------------------------------------- */
/*                          END MOTEL ROOM MIDDLEWARE                         */
/* -------------------------------------------------------------------------- */

export default billAdminRoute;
