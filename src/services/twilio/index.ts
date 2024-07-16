import { Twilio } from 'twilio';

interface ISms {
    to: string,
    message: string
}

export default class TwillioService {
    private twilioClient: any;

    constructor() {
        const { twillio } = global.configs;

        this.twilioClient = new Twilio(twillio.sid, twillio.auth)

    }

    async sendSms(data: ISms): Promise<any> {
        try {
            const vObject = {
                body: `${global.configs.twillio.content}${data.message}`,
                from: global.configs.twillio.number,
                to: data.to,
            };

            return this.twilioClient.messages.create(vObject)
        } catch (err) {
            return err
        }
    }
}