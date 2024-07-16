import * as express from "express";

import FloorController from "../../controllers/homeKey/floor.controller";
import AuthMiddleware from "../../middlewares/auth";

const floorRoute = express.Router();

/* -------------------------------------------------------------------------- */
/*                         START MOTEL ROOM MIDDLEWARE                        */
/* -------------------------------------------------------------------------- */

/* ------------------------------- PUBLIC APIS ------------------------------ */

// Get floor by id
floorRoute.route("/:id").get(FloorController.getFloorDetail);

/* ---------------------------- CHECK PERMISSION ---------------------------- */

// Login
floorRoute.use(AuthMiddleware.isAuthenticated);

// Host
floorRoute.use(AuthMiddleware.isHost);

/* ------------------------------ PRIVATE APIS ------------------------------ */

// Create floor
floorRoute.route("/").post(FloorController.createFloor);

// Delete floor by id
floorRoute.route("/:id").delete(FloorController.deleteFloor);

/* -------------------------------------------------------------------------- */
/*                          END MOTEL ROOM MIDDLEWARE                         */
/* -------------------------------------------------------------------------- */

export default floorRoute;
