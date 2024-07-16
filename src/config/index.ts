import {default as twillio} from './twillio';
import {default as uploadImage} from './uploadImage';
import {default as database} from './database';
import {default as agenda} from './agenda';
import {default as i18n} from './i18n';
import {default as googleMap} from './googleMap';
import {default as vnpay} from './vnpay';

export default () => {
    return {
        database: database(),
        twillio: twillio(),
        uploadImage: uploadImage(),
        agenda: agenda(),
        i18n: i18n(),
        googleMap: googleMap(),
        vnpay: vnpay()
    }
}