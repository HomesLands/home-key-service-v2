import * as mongoose from "mongoose";
var nodemailer = require('nodemailer');

// export default agenda => {
//     // create order
//     agenda.define('SendMailEnergyReport', async (job, done) => {

//         // const data = job.attrs.data;


//         console.log("SendMailEnergyReport");
//         // console.log("job attrs data: ", job.attrs.data);

//         const today = new Date();
//         console.log("SendMailEnergyReport Time: ", today);
//         try {

//             // Tự động gửi mail
//             // cách lấy "Mật khẩu ứng dụng của mail": https://support.google.com/mail/answer/185833?hl=vi
//             const { user: userModel, motelRoom: motelRoomModel, address: addressModel } = global.mongoModel;

//             // query list host
//             let listHost = await userModel.find({
//                 role: {
//                     $in: ['host']
//                 }
//             }).lean().exec();


//             if (listHost.length !== 0) {
//                 for (let i = 0; i < listHost.length; i++) {
//                     console.log("listHost.data[i]._id", listHost[i]._id);
//                     const resData = await motelRoomModel
//                         .find({ owner: mongoose.Types.ObjectId(listHost[i]._id) })
//                         .lean()
//                         .exec();

//                     // console.log("resData", resData);

//                     if (resData.length !== 0) {
//                         for (let j = 0; j < resData.length; j++) {
//                             // console.log('resData[j].address', resData[j].address);

//                             const addressDisplay = await addressModel
//                                 .find({ _id: mongoose.Types.ObjectId(resData[j].address) })
//                                 .lean()
//                                 .exec();

//                             // console.log("addressDisplay", addressDisplay);

//                             if (listHost[i].email) {
//                                 console.log('listHost.data[i].email', listHost[i].email);
//                                 const transporter = nodemailer.createTransport({
//                                     service: 'gmail',
//                                     auth: {
//                                         user: 'cr7ronadol12345@gmail.com',
//                                         pass: 'wley oiaw yhpl oupy'
//                                     }
//                                 });

//                                 const files = ['a.txt', 'b.pdf', 'c.png'];
//                                 const mailOptions = {
//                                     from: 'cr7ronadol12345@gmail.com',
//                                     // to: listHost[i].email,
//                                     to: 'quyetthangmarvel@gmail.com',
//                                     subject: `[${resData[j].name}]TỔNG KẾT TIỀN ĐIỆN NƯỚC THÁNG X NĂM Y`,
//                                     text: `Dãy phòng ${resData[j].name} địa chỉ ${addressDisplay[0].address}`,
//                                     attachments: files.map(file => ({
//                                         filename: file,
//                                         // path: filePath
//                                     }))
//                                 };

//                                 // Gửi email
//                                 transporter.sendMail(mailOptions, function (error, info) {
//                                     if (error) {
//                                         console.error(error);
//                                     } else {
//                                         console.log('Email đã được gửi: ' + info.response);
//                                     }
//                                 });
                                
//                             }
//                         }
//                     }
//                 }
//             }


//             done();
//         } catch (err) {
//             done();
//         }
//     });

//     (async function () {
//         await agenda.start();

//         // cuối mỗi tháng, lúc 0h00 của ngày đầu tiên tháng tiếp theo
//         await agenda.every('0 0 1 * *', 'SendMailEnergyReport');
//         // await agenda.schedule('in 2 minutes', 'SendMailEnergyReport');

//     })();
// }