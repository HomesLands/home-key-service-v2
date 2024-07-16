import { default as env } from "./env";

import { default as config } from "../config";
import { default as initModel } from "../models";
import MongoDb from "../services/mongoose";
import i18nService from "../services/i18n";
import { IDatabaseConfig } from "../config/database";

const initGlobalVariables = async () => {
  // Config data
  global.configs = config();
  // Env data
  global.env = env();
  // i18n service
  global.i18n = new i18nService(global.configs.i18n, global.env.mode);

  /* -------------------------------------------------------------------------- */
  /*                            START DATABASE CONFIG                           */
  /* -------------------------------------------------------------------------- */

  const { database }: { database: IDatabaseConfig } = global.configs;

  // Create mongo instance, config is read from .env as default
  global.mongoInstances = {
    default: new MongoDb(database.general, database.server),
    smart: new MongoDb(database.smart, database.server),
    homeKey: new MongoDb(database.homeKey, database.server),
  };

  // Create mongo connection, store it in global variable
  global.connections = {
    default: await global.global.mongoInstances["default"].createConnection(),
    smart: await global.global.mongoInstances["smart"].createConnection(),
    homeKey: await global.global.mongoInstances["homeKey"].createConnection(),
  };

  // Init models base on current default tenant
  global.mongoModel = initModel();

  /* -------------------------------------------------------------------------- */
  /*                             END DATABASE CONFIG                            */
  /* -------------------------------------------------------------------------- */
  return global;
};

export default initGlobalVariables;
