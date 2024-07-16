export default agenda => {
    // create order
    agenda.define('ChangeRoomStatus', async (job, done) => {

        console.log("Start AGENDA room");
        try {
            //Init models
            const {room: roomModel} = global.mongoModel;

            let data = job.attrs.data;

            // Update room status
            await roomModel.findOneAndUpdate({_id: data.roomId}, {status: data.status}).lean().exec();

            done();
        } catch (err) {
            done();
        }
    });
}