import * as express from "express";

import AuthController from "../controllers/auth.controller";
import AuthMiddleware from "../middlewares/auth";

const cors = require("cors");
const authRoute = express.Router();

/* -------------------------------------------------------------------------- */
/*                       START AUTHENTICATION MIDDLEWARE                      */
/* -------------------------------------------------------------------------- */

/* ------------------------------- PUBLIC APIS ------------------------------ */

// Facebook Login
// authRoute.route('/facebook').get(AuthController.facebookLogin);
// // Facebook login callback
// authRoute.route('/facebook/callback').get(AuthController.facebookLoginCallback);
// // Facebook login validate access token
// authRoute.route('/facebook/validate').post(AuthController.validateFromFacebookToken);

// // Google Login
// authRoute.route('/google').get(AuthController.googleLogin);
// // Google login callback
// authRoute.route('/google/callback').get(AuthController.googleLoginCallback);
// // Google login validate access token
// authRoute.route('/google/validate').post(AuthController.validateFromGoogleToken);

// Local login
authRoute.route("/signIn").post(AuthController.signIn);
// Local sign up
authRoute.route("/signUp").post(AuthController.signUp);

// Setup Password (User When sign up by admin)
// authRoute.route('/setupPassword').post(AuthController.setupPassword);

// Request to reset password
authRoute
  .route("/requestResetPassword")
  .post(AuthController.requestResetPassword);

authRoute.route("/resetPassword").put(AuthController.resetPassword);

// ForgotPassword
// authRoute.route('/forgotPassword').post(AuthController.forgotPassword);
authRoute.route("/forgotPassword").put(AuthController.forgotPassword);

// PasswordReissus
authRoute.route("/passwordReissue").put(AuthController.passwordReissue);
authRoute.route("/updateWallet").put(AuthController.updateWallet);

// Send Mail Active
authRoute.route("/sendmailactive").put(AuthController.sendmailactive);

// Active User
authRoute.route("/activeUser").put(AuthController.activeUser);

//Change Phonenumber
// authRoute.route("/changePhoneNumber").put(AuthController.changePhoneNumber);
/* ---------------------------- CHECK PERMISSION ---------------------------- */

authRoute.use(AuthMiddleware.isAuthenticated);

/* ------------------------------ PRIVATE APIS ------------------------------ */

// Verify user
// authRoute.route('/verifyUser').post(AuthController.verifyUser);

// // Resend OTP
// authRoute.route('/verifyUser/resendOTP').get(AuthController.resendOtp);

// // Confirm verify OTP
// authRoute.route('/verifyUser/confirmOTP').post(AuthController.confirmOtp);

// Logout
authRoute.route("/logout").put(AuthController.logout, cors());

// Change password
authRoute.route("/changePassword").put(AuthController.changePassword);

/* -------------------------------------------------------------------------- */
/*                        END AUTHENTICATION MIDDLEWARE                       */
/* -------------------------------------------------------------------------- */

export default authRoute;
