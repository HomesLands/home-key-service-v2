import * as express from "express";

import AuthMiddleware from "../../middlewares/auth";

import JobController from "../../controllers/homeKey/job.controller";

const jobRoute = express.Router();

/* -------------------------------------------------------------------------- */
/*                            START JOB MIDDLEWARE                            */
/* -------------------------------------------------------------------------- */

/* ------------------------------- PUBLIC APIS ------------------------------ */

/* ---------------------------- CHECK PERMISSION ---------------------------- */
// jobRoute.route("/:id/active").put(JobController.activeJob);

jobRoute.route("/getJobByRoom/:idRoom").get(JobController.getJobByRoom);

jobRoute.route("/renewContract/:idJob").put(JobController.renewContract);

//set lại trạng thái phòng sau 7 ngày cọc không đóng tiền 
//nhưng cần xem lại chỗ bấm actived thì status chuyển về rented nhưng chưa thực hiện thanh toán khi chưa nhận phòng
// CHÚ Ý: XEM LẠI TRẠNG THÁI, SAU KHI CỌC XONG, BẤM ACTIVED THÌ TRẠNG THÁI PHÒNG ĐÃ TRẢ VỀ RENTED => ĐỀ XUẤT CẦN HOÀN THÀNH THANH TOÁN
// KHI NHẬN PHÒNG THÌ MỚI CHUYỂN QUA RENTED

//ĐÃ ĐƯA QUA AGENDA 
jobRoute.route("/testSetStatusRoomAuto").get(JobController.setStatusRoomAuto);

//tự động set phòng trống khi hết hạn thuê
//Xóa các job và user liên qua
//ĐÃ ĐỂ QUẢ AGENDA
jobRoute.route("/autoSetAvailableRoom").get(JobController.autoSetAvailableRoom);

// nhắc khách trước 1 tháng hết hạn phòng để gia hạn
//ĐÃ ĐỂ QUA AGENDA
jobRoute.route("/remindUserRenewContract").get(JobController.remindUserRenewContract);



//Nhắc nhở đóng tiền phòng 15, mỗi ngày 1 mail
jobRoute.route("/sendMailRemindMonthlyPayment").get(JobController.sendMailRemindMonthlyPayment);


// jobRoute.route("/:id/images").put(JobController.uploadImageForJob);

jobRoute.use(AuthMiddleware.isAuthenticated);

/* ------------------------------ PRIVATE APIS ------------------------------ */

// Create job
jobRoute.route("/").post(JobController.createJob);

//Create job with cash
jobRoute.route("/cash").post(JobController.createJobWithCash);

// Get job list
jobRoute.route("/list").get(JobController.getJobList);

// Delete job
jobRoute
  .route("/:id")
  .get(JobController.getJobById)
  .delete(JobController.deleteJobByUser);

// upload image for job
jobRoute.route("/:id/images").put(JobController.uploadImageForJob);
// upload image for job
jobRoute
  .route("/:id/images/profile")
  .put(JobController.uploadImageForJobProfile);

jobRoute.route("/:id/active").put(JobController.activeJob);

jobRoute
  .route("/:id/updateReturnRoomDate")
  .put(JobController.updateReturnRoomDate);

/* -------------------------------------------------------------------------- */
/*                             END JOB MIDDLEWARE                             */
/* -------------------------------------------------------------------------- */

export default jobRoute;
