const nodemailer = require("nodemailer");
require('dotenv').config();
const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: process.env.Gmail_USER, // generated ethereal user
        pass: process.env.Gmail_PASS, // generated ethereal password
    },
    tls: {
        rejectUnauthorized: false
    }
});

export default {
    sendMail(from, to, subject, html) {
        return new Promise((resolve, reject) => {
            transporter.sendMail({ from, to, subject, html }, (err, info) => {
                if (err)
                    reject(err);
                resolve(info);
            });
        });
    }
}