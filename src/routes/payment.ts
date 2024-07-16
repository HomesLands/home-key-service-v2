import * as express from 'express';

// Middlewares
import AuthMiddleware from '../middlewares/auth';

// Controllers
import VnpayController from '../controllers/vnpay';
import PaymentController from '../controllers/homeKey/payment';

// Init payment route
const paymentRoute = express.Router();

/* -------------------------------------------------------------------------- */
/*                          START PAYMENT MIDDLEWARE                          */
/* -------------------------------------------------------------------------- */

/* ------------------------------- PUBLIC APIS ------------------------------ */

// Create vnpay payment url
paymentRoute.post('/vnpay/createPaymentUrl', VnpayController.createPaymentUrl);

// Vnpay payment call back url
paymentRoute.get('/vnpay/callBack', VnpayController.callBack);

// Vnpay payment ipn url
paymentRoute.get('/vnpay/ipn', VnpayController.ipn);

/* ---------------------------- CHECK PERMISSION ---------------------------- */

paymentRoute.use(AuthMiddleware.isAuthenticated);

/* ------------------------------ PRIVATE APIS ------------------------------ */

paymentRoute.put('/order/pay', PaymentController.payOrder);

/* -------------------------------------------------------------------------- */
/*                           END PAYMENT MIDDLEWARE                           */
/* -------------------------------------------------------------------------- */

export default paymentRoute;
