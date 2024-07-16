import * as GoogleMap from '@google/maps';

import HttpResponse from '../response';

export default class GoogleMapService {
    private googleMapsClient;

    constructor() {
        const {googleMap} = global.configs;
        this.googleMapsClient = GoogleMap.createClient({
            key: googleMap.googleMapApiKey,
            Promise: Promise
        });
    }

    public async getAddressDetail(address: string, lang?: string): Promise<any> {
        try {
            const googleMapResponse = await this.googleMapsClient.geocode({
                address: address
            }).asPromise();
            return googleMapResponse.json;
        } catch (e) {
            return HttpResponse.returnErrorWithMessage(e.message);
        }
    }

}