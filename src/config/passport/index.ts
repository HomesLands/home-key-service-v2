import { Application } from "express";
import * as passport from "passport";
import * as session from "express-session";
import localStrategy from "./strategies/local";

const passportStrategies = (app: Application): void => {
  // Session middleware, enable this if you are using twitter passport or any service requires OAuth 1.0
  app.use(
    session({ secret: "SECRET", resave: true, saveUninitialized: false })
  );
  app.use(passport.initialize());

  // Enable this if you are using twitter passport or any service requires OAuth 1.0
  app.use(passport.session());

  // Init strategy for local authentication
  localStrategy();
};

export default passportStrategies;
