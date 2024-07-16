import { Request, Response, NextFunction } from "express";
import * as auth from "basic-auth";
import * as JWT from "jsonwebtoken";
import * as _ from "underscore";
import HttpResponse from "../../services/response";

export default class AuthMiddleware {
  static isAuthenticated(
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    const token = req.headers["authorization"]; //  Bearer token authentication
    const credentials = auth(req); // Basic authentication

    if (token) {
      // If token is specified, process this with Bearer token way

      let authToken = (<string>token).split(" ")[1];

      // Decode jwt token
      JWT.verify(authToken, global.env.jwtSecret, (err, decoded) => {
        if (err) {
          // Return more clear message if jwt token is expired
          if (err.message === "Jwt is expired") {
            let expireTime = _.isObject(err.parsedBody)
              ? new Date(err.parsedBody.exp * 1000)
              : "";
            return HttpResponse.returnUnAuthorizeResponse(
              res,
              `Tài khoản hết hạn: ${expireTime}`
            );
          } else if (err.message === "jwt malformed") {
            return HttpResponse.returnUnAuthorizeResponse(
              res,
              `Chưa đăng nhập`
            );
          } else {
            // Return error directly
            return HttpResponse.returnUnAuthorizeResponse(res, err.message);
          }
        } else {
          const { user: userModel } = global.mongoModel;
          let query = { isDeleted: false };

          // Local account, find by its own Id
          if (decoded.provider === "local") {
            Object.assign(query, { _id: decoded.id });
          } else {
            // Social account
            Object.assign(query, { socialId: decoded.id });
          }

          // Check if this user existed
          userModel
            .findOne(query)
            .lean()
            .exec()
            .then((rs) => {
              if (rs) {
                // Check if this account is active
                if (rs.active === true) {
                  if (rs.token === null || rs.token === "") {
                    return HttpResponse.returnUnAuthorizeResponse(
                      res,
                      "Đăng xuất ra vào lại ,lỗi quyền"
                    );
                  } else {
                    // Attached decoded user id to request
                    Object.assign(req, { userId: rs._id, userProfile: rs });
                    next();
                  }
                } else {
                  return HttpResponse.returnUnAuthorizeResponse(
                    res,
                    "Tài khoản chưa kích hoạt"
                  );
                }
              } else {
                console.log("hihi");

                return HttpResponse.returnUnAuthorizeResponse(
                  res,
                  "Tài khoản không nằm trong hệ thống"
                );
              }
            });
        }
      });
    } else if (credentials) {
      // If user use basic authentication in case server cant generate tokens or for testing
      if (
        credentials.name !== process.env.DEFAULT_ACCESS_USER ||
        credentials.pass !== process.env.DEFAULT_ACCESS_PASS
      ) {
        // Return error
        return HttpResponse.returnUnAuthorizeResponse(
          res,
          "Tài khoản không nằm trong hệ thống"
        );
      } else {
        // Go to the next middleware
        next();
      }
    } else {
      // Return error
      console.log("error")
      return HttpResponse.returnUnAuthorizeResponse(
        res,
        "Tài khoản không nằm trong hệ thống"
      );
    }
  }

  static isMaster(req: Request, res: Response, next: NextFunction): void {
    console.log("TỚI ĐÂY 1")
    if (req["userProfile"].role && req["userProfile"].role.includes("master")) {
      console.log("TỚI ĐÂY 2")
      next();
    } else {
      console.log("TỚI ĐÂY 3")
      // Return error
      return HttpResponse.returnUnAuthorizeResponse(
        res,
        "Tài khoản không nằm trong hệ thống"
      );
    }
  }

  static isHost(req: Request, res: Response, next: NextFunction): void {
    if (req["userProfile"].role && req["userProfile"].role.includes("host")) {
      next();
    } else {
      // Return error
      return HttpResponse.returnUnAuthorizeResponse(
        res,
        "Tài khoản không nằm trong hệ thống"
      );
    }
  }
}
