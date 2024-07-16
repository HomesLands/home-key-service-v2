import "reflect-metadata";

import { RoomModel } from "./room";
import { FloorModel } from "./floor";
import { MotelRoomModel } from "./motelRoom";
import { JobModel } from "./job";
import { NotificationModel } from "./notification";
import { OrderModel } from "./order";
import { BankingModel } from "./bank";
import { TransactionsModel } from "./transaction";
import { DeviceModel } from "./device";
import { BillModel } from "./bill";
import { OptionsTypeModel } from "./optionsType";
import { ReportProblemModel } from "./reportProblem";
import { ElectricsModel } from "./electric";
import { RequestWithdrawsModel } from "./requestWithdraws";
import { HistoryEnergyModel } from "./historyEnergy";
import { PayDepositListModel } from "./payDepositList";
import { TotalKwhModel } from "./totalKwh";
import { RevenueModel } from "./revenue";
export default (connection: any) => {
  return {
    room: RoomModel(connection),
    floor: FloorModel(connection),
    motelRoom: MotelRoomModel(connection),
    order: OrderModel(connection),
    banking: BankingModel(connection),
    transactions: TransactionsModel(connection),
    job: JobModel(connection),
    device: DeviceModel(connection),
    notification: NotificationModel(connection),
    bill: BillModel(connection),
    optionsType: OptionsTypeModel(connection),
    reportProblem: ReportProblemModel(connection),
    electrics: ElectricsModel(connection),
    requestWithdraws: RequestWithdrawsModel(connection),
    historyEnergy: HistoryEnergyModel(connection),
    payDepositList: PayDepositListModel(connection),
    totalKwh: TotalKwhModel(connection),
    revenue: RevenueModel(connection),
  };
};
