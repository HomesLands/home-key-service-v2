import {default as job} from './job';
import {default as room} from './room';

export default agenda => {
    console.log("Start AGENDA Job");
    return {
        job: job(agenda),
        room: room(agenda),
    }
}