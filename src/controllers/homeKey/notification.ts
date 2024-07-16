export default class NotificationController {
  /* -------------------------------------------------------------------------- */
  /*                            START HELPER FUNCTION                           */
  /* -------------------------------------------------------------------------- */

  // Get motel room by id
  static async createNotification(data: any): Promise<any> {
    // Init models
    const { notification: notificationModel } = global.mongoModel;

    return await notificationModel.create(data);
  }

  /* -------------------------------------------------------------------------- */
  /*                             END HELPER FUNCTION                            */
  /* -------------------------------------------------------------------------- */
}
