import { Request, Response, NextFunction } from 'express';
import HttpResponse from '../services/response';

export default class AgendaController {
  // /**
  //  * @swagger
  //  * tags:
  //  *   - name: Agenda
  //  *     description: Agenda APIs (used for dev/test purpose only)
  //  */

  // /**
  //  * @swagger
  //  * /v1/agenda/create:
  //  *   post:
  //  *     description: Create a test agenda API
  //  *     tags: [Agenda]
  //  *     responses:
  //  *       200:
  //  *         description: Success
  //  *       400:
  //  *         description: Invalid request params
  //  *       401:
  //  *         description: Unauthorized
  //  *       404:
  //  *         description: Resource not found
  //  */

  static async createTestAgenda(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      global.agendaInstance.agenda.now('UpdateExpiredInvitation', 'test');

      return HttpResponse.returnSuccessResponse(res, null);
    } catch (e) {
      // Pass error to the next middleware
      next(e);
    }
  }
}
