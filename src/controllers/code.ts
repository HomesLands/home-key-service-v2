import * as moment from 'moment';

export default class CodeController {

    /* -------------------------------------------------------------------------- */
    /*                            START HELPER FUNCTION                           */
    /* -------------------------------------------------------------------------- */

    // Create new code
    static async createOrUpdateCode(userId: string, type: string, code: string, minutes: number, verifyData?: object): Promise<any> {
        const { code: codeModel } = global.mongoModel;
        let data;

        if (verifyData) {
            data = { userId, code, type, verifyData, expiredAt: moment().add(minutes, 'minutes') };
        } else {
            data = { userId, code, type, expiredAt: moment().add(minutes, 'minutes') };
        }

        // Create or update code
        return await codeModel.findOneAndUpdate({ userId, type }, data, { new: true, upsert: true });
    }

    // Get code data
    static async getCode(userId: string, code: string, type: string): Promise<any> {
        const { code: codeModel } = global.mongoModel;

        return await codeModel.findOne({ userId, code, type }).lean();
    }

    // Remove code
    static async removeCode(userId: string, type: string): Promise<any> {
        const { code: codeModel } = global.mongoModel;

        return await codeModel.findOneAndRemove({ userId, type });
    }

    /* -------------------------------------------------------------------------- */
    /*                             END HELPER FUNCTION                            */
    /* -------------------------------------------------------------------------- */

}

