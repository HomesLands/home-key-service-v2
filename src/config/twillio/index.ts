export interface ITwillio {
  number: string;
  sid: string;
  auth: string;
  content: string;
}

export default (): ITwillio => {
  return {
    number: process.env.TWILIO_NUMBER,
    sid: process.env.TWILIO_SID,
    auth: process.env.TWILIO_AUTH,
    content: "Mã xác thực của bạn là: ",
  };
};
