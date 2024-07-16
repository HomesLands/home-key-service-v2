import "reflect-metadata";

import { UserModel, User } from "./user";
import { Image, ImageModel } from "./image";
import { Address, AddressModel } from "./address";
import { CodeModel, Code } from "./code";
import { TransactionModel } from "./transaction";
import { default as initSmartModel } from "./smart";
import { default as initHomeKeyModel } from "./homeKey";

export default () => {
  return Object.assign(
    {
      user: UserModel(global.connections["default"].currentTenantConnection),
      image: ImageModel(global.connections["default"].currentTenantConnection),
      address: AddressModel(
        global.connections["default"].currentTenantConnection
      ),
      transaction: TransactionModel(
        global.connections["default"].currentTenantConnection
      ),
      code: CodeModel(global.connections["default"].currentTenantConnection),
    },
    initHomeKeyModel(global.connections["default"].currentTenantConnection),
    initSmartModel(global.connections["default"].currentTenantConnection)
  );
};
