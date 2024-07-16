import { NextFunction, Request, Response } from "express";
import * as passport from "passport";
import * as moment from "moment";
import * as rn from "random-number";
import * as bcrypt from "bcryptjs";

import { helpers, jwtHelper, normalizeError } from "../utils";

import ImageService from "../services/image";
import HttpResponse from "../services/response";

// import mailer from '../Mailer/mailer.ts';
import sendMail from "../utils/Mailer/mailer";

var options = {
  // example input , yes negative values do work
  min: 100000,
  max: 999999,
};

export default class AuthController {
  /**
   * @swagger
   * tags:
   *   - name: Auth
   *     description: Authentication
   */

  /* -------------------------------------------------------------------------- */
  /*                              START LOCAL LOGIN                             */
  /* -------------------------------------------------------------------------- */

  // Local login

  /**
   * @swagger
   * definitions:
   *   SignIn:
   *     required:
   *       - phoneNumber
   *       - password
   *     properties:
   *       phoneNumber:
   *         type: string
   *       password:
   *         type: string
   */

  /**
   * @swagger
   * /v1/auth/signIn:
   *   post:
   *     description: Sign in API
   *     tags: [Auth]
   *     produces:
   *       - application/json
   *     parameters:
   *       - in: body
   *         name: body
   *         description: Request body
   *         schema:
   *           $ref: '#definitions/SignIn'
   *           type: object
   *     responses:
   *       200:
   *         description: Success
   *       400:
   *         description: Invalid request params
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Resource not found
   */

  static async signIn(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init user model
      const { user: userModel, code: codeModel } = global.mongoModel;

      // Local authentication
      passport.authenticate("local", { session: false }, async (err, rs) => {
        req.body.phoneNumber = {
          countryCode: "+84",
          number: helpers.stripeZeroOut(req.body.phoneNumber),
        };

        // Error, pass to the next middleware
        if (err) {
          return HttpResponse.returnUnAuthorizeResponse(res, err.errors);
        }

        // get user data
        let resData = await userModel
          .findOne(
            { phoneNumber: req.body.phoneNumber, isDeleted: false },
            { token: 0, password: 0, social: 0 }
          )
          .lean()
          .exec();
        // If user was deleted
        if (!resData) {
          return HttpResponse.returnBadRequestResponse(
            res,
            "Tài khoản không tồn tại"
          );
        }

        // // Check active of user
        // if (resData.active === false) {
        //     return HttpResponse.returnBadRequestResponse(res, 'Tài khoản chưa được kích hoạt');
        // }

        // Generate jwt token
        resData.token = jwtHelper.signToken(resData._id, "local");

        // Update token to user data
        await userModel.update(
          { phoneNumber: req.body.phoneNumber },
          { token: resData.token }
        );

        if (resData.currentProgress === 2) {
          const codeData = await codeModel
            .findOne({ userId: resData._id, type: "verify" })
            .lean()
            .exec();
          resData.verifyData = codeData.verifyData;
        }

        //Get avatar url
        if (resData.avatar) {
          resData.avatar = await helpers.getImageUrl(resData.avatar);
        }

        return HttpResponse.returnSuccessResponse(res, resData);
      })(req, res, next);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /v1/auth/signUp:
   *   post:
   *     description: Sign up API (by email)
   *     tags: [Auth]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: firstName
   *         in: formData
   *         paramType: formData
   *         type: string
   *       - name: lastName
   *         in: formData
   *         description: lastName
   *         paramType: formData
   *         type: string
   *       - name: phoneNumber
   *         in: formData
   *         description: phoneNumber
   *         paramType: formData
   *         type: string
   *         required: true
   *       - name: password
   *         in: formData
   *         description: Password
   *         paramType: formData
   *         type: string
   *         required: true
   *       - name: confirmPassword
   *         in: formData
   *         description: Confirm password
   *         paramType: formData
   *         type: string
   *         required: true
   *       - name: role
   *         in: formData
   *         description: Role
   *         paramType: formData
   *         type: string
   *         required: true
   *         enum:
   *              - customer
   *              - host
   *     responses:
   *       200:
   *         description: Success
   *       400:
   *         description: Invalid request params
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Resource not found
   */
  static async signUp(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      console.log("signUp");
      // Init user model
      const { user: userModel, code: codeModel } = global.mongoModel;
      const { body: data } = req;

      const numberPhone = req.body.phoneNumber;
      // Remove the first 0 at phone number
      req.body.phoneNumber = {
        countryCode: "+84",
        number: helpers.stripeZeroOut(req.body.phoneNumber),
      };

      // Validate input data for signUp
      const validateResults = await userModel.validateData(["signUp"], data);

      // Parse error list form validation results
      const errorList = normalizeError(validateResults);

      

      // Validation Error
      if (errorList.length > 0) {
        return HttpResponse.returnBadRequestResponse(res, errorList);
      }

      

      // Check if password and confirm password is matched
      if (data.password !== data.confirmPassword) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Mật khẩu không trùng nhau"
        );
      }

      // Check if whether user existed already
      const existingUser = await userModel
        .findOne({
          phoneNumber: data.phoneNumber,
          isDeleted: false,
        })
        .lean()
        .exec();

      // Return error
      if (existingUser) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Số điện thoại đã tồn tại"
        );
      }
      // Check email
      const existingUserEmail = await userModel
        .findOne({
          email: data.email,
          isDeleted: false,
        })
        .lean()
        .exec();

      // Return error
      if (existingUserEmail) {
        return HttpResponse.returnBadRequestResponse(res, "Email đã tồn tại");
      }

      data.role = [data.role];

      // active
      data["active"] = true;

      if (!data.role.includes("customer")) {
        data.role.push("customer");
      }

      if(data.role.includes("host")) {
        data["isCensorHost"] = false;
      }

      // Create the new user with provided info
      let userData = new userModel(data);
      userData.phoneNumberFull = numberPhone;

      // Generate jwt token
      userData.token = jwtHelper.signToken(userData._id, "local");

      let resData = await userData.save();
      console.log({ resData, userData });
      resData = resData.toObject();

      // //Sent OTP
      // await AuthController.sendOTP(resData, 'verify');

      // Remove password property
      delete resData.password;
      delete resData.social;

      

      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      next(e);
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                               END LOCAL LOGIN                              */

  /* -------------------------------------------------------------------------- */

  /**
   * @swagger
   * /v1/auth/requestResetPassword:
   *   post:
   *     description: Request reset Password
   *     tags: [Auth]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: phoneNumber
   *         in: formData
   *         required: true
   *         description: phoneNumber
   *         paramType: formData
   *         type: string
   *     responses:
   *       200:
   *         description: Success
   *       400:
   *         description: Invalid request params
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Resource not found
   */

  static async requestResetPassword(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Models
      const { user: userModel, code: codeModel } = global.mongoModel;

      const imageService = new ImageService("local", true);

      // Process form data
      const processDataInfo = await imageService.processFormData(req, res);

      if (processDataInfo && processDataInfo.error) {
        return HttpResponse.returnBadRequestResponse(
          res,
          processDataInfo.error
        );
      }

      const { body: data } = req;

      // Remove the first 0 at phone number
      req.body.phoneNumber = {
        countryCode: "+84",
        number: helpers.stripeZeroOut(req.body.phoneNumber),
      };

      // Check if this user existed
      const userData = await userModel
        .findOne({
          phoneNumber: data.phoneNumber,
          isDeleted: false,
          signUpCompleted: true,
        })
        .lean()
        .exec();

      // User doesn't not exist, return error
      if (!userData) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Số điện thoại không tồn tại"
        );
      }

      // Get exist code data
      const codeData = await codeModel
        .findOne({ userId: userData._id, type: "resetPassword" })
        .lean()
        .exec();

      if (
        codeData &&
        moment().isBefore(moment(codeData.updatedAt).add(90, "seconds"))
      ) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Hết thời gian đổi mật khẩu"
        );
      }

      // await AuthController.sendOTP(userData, 'resetPassword');

      return HttpResponse.returnSuccessResponse(res, null);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /v1/auth/resetPassword:
   *   put:
   *     description: Reset password
   *     tags: [Auth]
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: code
   *         in: query
   *         required: true
   *         description: Code Data
   *         type: string
   *       - name: password
   *         in: formData
   *         required: true
   *         description: Password
   *         paramType: formData
   *         type: string
   *       - name: confirmPassword
   *         in: formData
   *         required: true
   *         description: Confirm Password
   *         paramType: formData
   *         type: string
   *     responses:
   *       200:
   *         description: Success
   *       400:
   *         description: Invalid request params
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Resource not found
   */

  static async resetPassword(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init  models
      const { user: userModel, code: codeModel } = global.mongoModel;

      const imageService = new ImageService("local", true);

      // Process form data
      const processDataInfo = await imageService.processFormData(req, res);

      if (processDataInfo && processDataInfo.error) {
        return HttpResponse.returnBadRequestResponse(
          res,
          processDataInfo.error
        );
      }

      const { body: data } = req;
      // const { code } = req.query;

      // Validate input data for reset
      const validateResults = await userModel.validateData(
        ["resetPassword"],
        data
      );

      // Parse error list form validation results
      const errorList = normalizeError(validateResults);

      // Validation Error
      if (errorList.length > 0) {
        return HttpResponse.returnBadRequestResponse(res, errorList);
      }

      // // Check the latest code
      // const codeData = await codeModel
      //   .findOne({ code, type: "resetPassword" })
      //   .sort({ updatedAt: -1 })
      //   .exec();

      // // If code does not exist or too old
      // if (!codeData) {
      //   return HttpResponse.returnBadRequestResponse(
      //     res,
      //     "resetPassword.code.invalid"
      //   );
      // }

      // // If password and confirm password does not match
      // if (data.password !== data.confirmPassword) {
      //   return HttpResponse.returnBadRequestResponse(
      //     res,
      //     "resetPassword.password.confirmPassword.not.match"
      //   );
      // }

      // Generate the new hash password
      const hashPassword = await helpers.generateHashPassword(data.password);
      // Update the new one
      await userModel
        .findOneAndUpdate(
          { _id: data.userId },
          { password: hashPassword },
          { new: true }
        )
        .lean()
        .exec();

      // // Remove old reset codes
      // codeModel
      //   .findOneAndRemove({ userId: codeData.userId, type: "resetPassword" })
      //   .exec();

      return HttpResponse.returnSuccessResponse(res, null);
    } catch (e) {
      // Pass error to the next middleware
      next(e);
    }
  }

  /**
   * @swagger
   * /v1/auth/verifyUser/confirmOTP:
   *   post:
   *     description: Confirm OTP after verifying user
   *     tags: [Auth]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: code
   *         in: formData
   *         description: code
   *         paramType: formData
   *         type: string
   *     responses:
   *       200:
   *         description: Success
   *       400:
   *         description: Invalid request params
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Resource not found
   *     security:
   *          - auth: []
   */

  // static async confirmOtp(req: Request, res: Response, next: NextFunction): Promise<any> {
  //     try {
  //         const imageService = new ImageService('local', true);

  //         // Process form data
  //         const processDataInfo = await imageService.processFormData(req, res);

  //         if (processDataInfo && processDataInfo.error) {
  //             return HttpResponse.returnBadRequestResponse(res, processDataInfo.error);
  //         }

  //         const userData = req['userProfile'];

  //         const { body: data } = req;

  //         // Check if current code existed and not expired
  //         const existedCode = await CodeController.getCode(userData._id, data.code, 'verify');

  //         // Code not existed
  //         if (!existedCode) {
  //             return HttpResponse.returnBadRequestResponse(res, 'verifyCode.invalid');
  //         }

  //         //Confirm verify user
  //         if (userData.isVerified && !existedCode.verifyData.changePhoneNumber) {
  //             return HttpResponse.returnBadRequestResponse(res, 'isVerified');
  //         }

  //         // Check expired
  //         if (helpers.checkExpiredTime(existedCode.expiredAt)) {
  //             // Expired code, return error
  //             return HttpResponse.returnBadRequestResponse(res, 'verifyCode.expired');
  //         } else {
  //             // Update verified data to user collection
  //             await UserController.updateUser(existedCode.userId, { isVerified: true });

  //             // Remove old OTP
  //             await CodeController.removeCode(existedCode.userId, 'verify');
  //         }

  //         return HttpResponse.returnSuccessResponse(res, null);
  //     } catch (e) {
  //         next(e);
  //     }
  // }

  /**
   * @swagger
   * /v1/auth/verifyUser/resendOTP:
   *   get:
   *     description: Resend OTP code
   *     tags: [Auth]
   *     produces:
   *       - application/json
   *     responses:
   *       200:
   *         description: Success
   *       400:
   *         description: Invalid request params
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Resource not found
   *     security:
   *          - auth: []
   */

  // static async resendOtp(req: Request, res: Response, next: NextFunction): Promise<any> {
  //     try {
  //         const { code: codeModel } = global.mongoModel;

  //         // Check if this code existed
  //         let codeData = await codeModel.findOne({ userId: req['userProfile']._id, type: 'verify' }).lean().exec();

  //         if (req['userProfile'].isVerified) {
  //             return HttpResponse.returnBadRequestResponse(res, 'user.isVerified');
  //         }

  //         // Check if codeData is updated less than 90s
  //         if (codeData) {
  //             if (moment(codeData.updatedAt).add(90, 's') < moment()) {
  //                 await AuthController.sendOTP(req['userProfile'], 'verify');
  //             } else {
  //                 return HttpResponse.returnBadRequestResponse(res, 'resendOTP.wait.resend');
  //             }
  //         } else {
  //             return HttpResponse.returnBadRequestResponse(res, 'verify.code.not.exist');
  //         }

  //         return HttpResponse.returnSuccessResponse(res, null);
  //     } catch (e) {
  //         next(e);
  //     }
  // }

  /**
   * @swagger
   * /v1/auth/logout:
   *   put:
   *     description: Logout
   *     tags: [Auth]
   *     responses:
   *       200:
   *         description: Success
   *       400:
   *         description: Invalid request params
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Resource not found
   *     security:
   *          - auth: []
   */

  static async logout(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init  models
      const { user: userModel } = global.mongoModel;

      // Remove token
      let userUpdate = await userModel
        .findOneAndUpdate({ _id: req["userId"] }, { token: "", playerId: "" })
        .lean()
        .exec();

      // Close socket connection
      // global.socket.closeSocketByUserId(req['userProfile']._id.toString());

      return HttpResponse.returnSuccessResponse(res, null);
    } catch (e) {
      // Pass error to the next middleware

      next(e);
    }
  }

  /**
   * @swagger
   * definitions:
   *   ChangePassword:
   *     required:
   *       - currentPassword
   *       - newPassword
   *       - confirmNewPassword
   *     properties:
   *       currentPassword:
   *         type: string
   *       newPassword:
   *         type: string
   *       confirmNewPassword:
   *         type: string
   *
   */

  /**
   * @swagger
   * /v1/auth/changePassword:
   *   put:
   *     description: Change password
   *     tags: [Auth]
   *     produces:
   *       - application/json
   *     parameters:
   *       - in: body
   *         name: body
   *         description: Request body
   *         schema:
   *           $ref: '#definitions/ChangePassword'
   *           type: object
   *     responses:
   *       200:
   *         description: Success
   *       400:
   *         description: Invalid request params
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Resource not found
   *     security:
   *          - auth: []
   */

  static async changePassword(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init  models
      const { user: userModel } = global.mongoModel;

      const { body: data } = req;

      const id = data._id;
      const passwordOld = data.passwordOld;
      const password = data.password;

      // // Validate current password
      // const currentPasswordIsCorrect = await userModel.validatePassword(
      //     data.currentPassword,
      //     req['userProfile'].password,
      // );

      // // Current password is not correct
      // if (!currentPasswordIsCorrect) {
      //     return HttpResponse.returnBadRequestResponse(res, 'changePassword.currentPassword.not.correct');
      // }

      // // If password and confirm password does not match
      // if (data.newPassword !== data.confirmNewPassword) {
      //     return HttpResponse.returnBadRequestResponse(res, 'resetPassword.password.confirmPassword.not.match');
      // }

      // find user
      const rsuser = await userModel
        .findOne({ _id: id })
        .lean()
        .exec();

      // check password
      const rs = bcrypt.compareSync(passwordOld, rsuser.password);
      const salt = await bcrypt.genSaltSync(parseInt(global.env.hashSalt));

      if (rs) {
        const passwordnew = bcrypt.hashSync(password, salt);

        // Update the new one
        const userData = await userModel
          .findOneAndUpdate(
            { _id: id },
            { password: passwordnew },
            { new: true }
          )
          .lean()
          .exec();

        return HttpResponse.returnSuccessResponse(res, userData);
      } else {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Mật khẩu cũ không chính xác"
        );
      }
    } catch (e) {
      // Pass error to the next middleware
      next(e);
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                            START HELPER FUNCTION                           */

  /* -------------------------------------------------------------------------- */

  // static async sendOTP(userData: any, type: string): Promise<any> {
  //     // Save code, verified data to db and send sms to user
  //     const saveCode = await CodeController.createOrUpdateCode(userData._id, type, helpers.generateVerifyCode().toString(), 5);

  //     // Call twillio service
  //     const twillioService = new TwillioService();

  //     // Send sms to user
  //     return await twillioService.sendSms({
  //         to: `${userData.phoneNumber.countryCode}${userData.phoneNumber.number}`,
  //         message: saveCode.code
  //     });

  // }
  // ForgotPassword
  static async forgotPassword(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    const token = parseInt(rn(options));

    const email = req.body.email;
    // const url = req.body.url;

    const { user: userModel } = global.mongoModel;

    const userData = await userModel
      .findOneAndUpdate(
        { email: email },
        { tokenForgotPassword: token },
        { new: true }
      )
      .lean()
      .exec();

    let name = "";
    let sttoken = "";
    if (!userData) {
      return HttpResponse.returnBadRequestResponse(res, "Email không tồn tại");
    } else {
      name = userData.firstName;
      sttoken = userData.tokenForgotPassword;
    }
    const html = `Hi ${name},
                <br/>
                Cảm ơn bạn , Dưới đây là mã xác nhận để cung cấp lại mật khẩu cho bạn!
                <br/> <br/>
                Mã Xác Nhận: <b>${sttoken}</b>
                <br/> <br/>
               
                `;

    await sendMail.sendMail(process.env.Gmail_USER, email, "Mã Xác Nhận", html);

    return HttpResponse.returnSuccessResponse(res, userData);
  }

  // Send Mail Active
  static async sendmailactive(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    const token = parseInt(rn(options));

    const email = req.body.email;
    // const url = req.body.url;

    const { user: userModel } = global.mongoModel;

    const userData = await userModel
      .findOneAndUpdate({ email: email }, { tokenActive: token }, { new: true })
      .lean()
      .exec();

    let name = "";
    let sttoken = "";
    if (!userData) {
      return HttpResponse.returnBadRequestResponse(res, "Email không tồn tại");
    } else {
      name = userData.firstName;
      sttoken = userData.tokenActive;
    }
    const html = `Hi ${name},
                <br/>
                Cảm ơn bạn , Đây Là Mã Xác Nhận Tài Khoản!
                <br/>
                Mã Xác Nhận: <b>${sttoken}</b>
                <br/>
                <a href="${process.env.BASE_PATH_CLINET1}/${email}">Xác nhận 1</a>
                <br/>
                <a href="${process.env.BASE_PATH_CLINET2}/${email}">Xác nhận 2</a>
                `;

    await sendMail.sendMail(process.env.Gmail_USER, email, "Mã Xác Nhận", html);

    return HttpResponse.returnSuccessResponse(res, userData);
  }

  static async passwordReissue(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    const { user: userModel } = global.mongoModel;
    const salt = await bcrypt.genSaltSync(parseInt(global.env.hashSalt));

    const email = req.body.email;

    const tokenForgotPassword = req.body.tokenKey;

    const password = bcrypt.hashSync(req.body.password, salt);

    const userData = await userModel
      .findOneAndUpdate(
        {
          email: email,
          tokenForgotPassword: tokenForgotPassword,
        },
        {
          $set: {
            password: password,
            tokenForgotPassword: "",
          },
        },
        {
          new: true,
        }
      )
      .lean()
      .exec();
    if (!userData) {
      return HttpResponse.returnBadRequestResponse(res, "Sai mã xác nhận");
    }

    return HttpResponse.returnSuccessResponse(res, userData);
  }
  // ActiveUser
  static async activeUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    const { user: userModel } = global.mongoModel;

    const email = req.body.email;

    const barcode = req.body.barcode;

    const userData = await userModel
      .findOneAndUpdate(
        {
          email: email,
          tokenActive: barcode,
        },
        {
          $set: {
            active: true,
            tokenActive: "",
          },
        },
        {
          new: true,
        }
      )
      .lean()
      .exec();

    if (!userData) {
      return HttpResponse.returnBadRequestResponse(
        res,
        "Mã xác nhận không tồn tại"
      );
    }

    return HttpResponse.returnSuccessResponse(res, userData);
  }
  static async updateWallet(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    const { user: userModel } = global.mongoModel;

    const userData = await userModel
      .findOneAndUpdate(
        {
          _id: req.body.userId,
        },
        {
          $set: {
            wallet: req.body.wallet,
          },
        },
        {
          new: true,
        }
      )
      .lean()
      .exec();

    if (!userData) {
      return HttpResponse.returnBadRequestResponse(
        res,
        "Không cập nhật được tiền"
      );
    }

    return HttpResponse.returnSuccessResponse(res, userData);
  }

  //Change Phonenumber
  // static async changePhoneNumber(
  //   req: Request,
  //   res: Response,
  //   next: NextFunction
  // ): Promise<any> {
  //   const { user: userModel } = global.mongoModel;

  //   const phoneNumber = req.body.phoneNumber;
  //   const id = req.body.id;

  //   const userData = await userModel
  //     .findOneAndUpdate(
  //       {

  //       },
  //       {
  //         $set: {
  //           active: true,
  //           tokenActive: "",
  //         },
  //       },
  //       {
  //         new: true,
  //       }
  //     )
  //     .lean()
  //     .exec();

  //   if (!userData) {
  //     return HttpResponse.returnBadRequestResponse(
  //       res,
  //       "Mã xác nhận không tồn tại"
  //     );
  //   }

  //   return HttpResponse.returnSuccessResponse(res, userData);
  // }


  /* -------------------------------------------------------------------------- */
  /*                             END HELPER FUNCTION                            */
  /* -------------------------------------------------------------------------- */
}
