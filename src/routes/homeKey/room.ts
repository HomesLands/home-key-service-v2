import * as express from "express";

import JobController from "../../controllers/homeKey/job.controller";
import OrderController from "../../controllers/homeKey/order";
import RoomController from "../../controllers/homeKey/room";
import AuthMiddleware from "../../middlewares/auth";

const roomRoute = express.Router();

/* -------------------------------------------------------------------------- */
/*                            START ROOM MIDDLEWARE                           */
/* -------------------------------------------------------------------------- */

/* ------------------------------- PUBLIC API ------------------------------- */
roomRoute.route("/:id/job").get(JobController.getJobByRoomId);

// Get room detail
roomRoute.route("/:id").get(RoomController.getRoomDetail);
// Post room detail
roomRoute.route("/:id").post(RoomController.editRoomByIdStatus);

/* ---------------------------- CHECK PERMISSION ---------------------------- */

// Login
roomRoute.use(AuthMiddleware.isAuthenticated);

// Host
roomRoute.use(AuthMiddleware.isHost);

/* ------------------------------ PRIVATE APIS ------------------------------ */

// Create room
roomRoute.route("/").post(RoomController.createRoom);
// edit utilities to room
roomRoute.route("/").put(RoomController.updateUtilitiesRoom);
// List Room
roomRoute.route("/").get(RoomController.ListRoom);

// Edit room
roomRoute
  .route("/:id")
  .put(RoomController.editRoomById)
  .delete(RoomController.deleteRoom);

// Edit room


// Edit order for room
roomRoute.route("/:id/order").put(OrderController.editOrderByOwner);

/* -------------------------------------------------------------------------- */
/*                             END ROOM MIDDLEWARE                            */
/* -------------------------------------------------------------------------- */

export default roomRoute;
