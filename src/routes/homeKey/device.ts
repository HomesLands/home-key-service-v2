import * as express from "express";

import DeviceController from "../../controllers/homeKey/device.controller";
import AuthMiddleware from "../../middlewares/auth";

const deviceRoute = express.Router();

/* -------------------------------------------------------------------------- */
/*                         START MOTEL ROOM MIDDLEWARE                        */
/* -------------------------------------------------------------------------- */

/* ------------------------------- PUBLIC APIS ------------------------------ */

/* ---------------------------- CHECK PERMISSION ---------------------------- */

// Login
deviceRoute.use(AuthMiddleware.isAuthenticated);

// Host
deviceRoute.use(AuthMiddleware.isMaster);

/* ------------------------------ PRIVATE APIS ------------------------------ */

// Create floor
deviceRoute.route("/").post(DeviceController.createDevice);

/* -------------------------------------------------------------------------- */
/*                          END MOTEL ROOM MIDDLEWARE                         */
/* -------------------------------------------------------------------------- */

export default deviceRoute;
