import * as querystring from 'qs';
import * as lodash from 'lodash';
import * as crypto from 'crypto';
import * as moment from 'moment';
import { helpers } from '../../utils';
import * as dateFormat from 'dateformat';


export default class VnpayService {

    constructor() {

    }

    public async getRedirectUrl(data: any, lang?: string): Promise<any> {

        const now = moment();

        var vnp_Params = helpers.sortObject(lodash.omitBy({
            vnp_Version: '2',
            vnp_Command: 'pay',
            vnp_TmnCode: global.configs.vnpay.vnpTmnCode,
            // vnp_Merchant:'',
            vnp_Locale: lang ? lang : 'vn',
            vnp_CurrCode: 'VND',
            vnp_TxnRef: data.orderId,
            vnp_OrderInfo: `Paid ${data.orderId} at ${now.format('DD/MM/YYYY HH:MM:SS')}`,
            vnp_OrderType: 'billpayment',
            vnp_Amount: data.amount * 100,
            vnp_ReturnUrl: global.configs.vnpay.vnpReturnUrl,
            vnp_IpAddr: data.ipAddr,
            vnp_CreateDate: dateFormat(new Date(), 'yyyymmddHHmmss'),
            vnp_BankCode: data.bankCode ? data.bankCode : undefined
        }, lodash.isUndefined));

        var signData = global.configs.vnpay.vnpHashSecret + querystring.stringify(vnp_Params, { encode: false });

        vnp_Params['vnp_SecureHashType'] = 'SHA256';
        vnp_Params['vnp_SecureHash'] = crypto.createHash('sha256').update(signData).digest('hex');

        return `${global.configs.vnpay.vnpUrl}?${querystring.stringify(vnp_Params, { encode: true })}`;
    }

    public async checkSumData(data: any, lang?: string): Promise<any> {
        var vnp_Params = data;

        var secureHash = vnp_Params['vnp_SecureHash'];

        delete vnp_Params['vnp_SecureHash'];
        delete vnp_Params['vnp_SecureHashType'];

        var signData = global.configs.vnpay.vnpHashSecret + querystring.stringify(vnp_Params, { encode: false });

        var checkSum = crypto.createHash('sha256').update(signData).digest('hex');

        return secureHash === checkSum
    }

}