import * as express from 'express';

import authRoute from './auth';
import uploadimgRoute from './uploading';
// import uploadimgRoute from './_uploadimg';
import userRoute from './user';
import homeKeyRoute from './homeKey';
import paymentRoute from './payment';
import adminRoute from './admin';

const baseApi = express.Router();
const adminApi = express.Router();

// Default public route
export = app => {

	app.use(express.json({ limit: '50mb' }));
	app.use(express.urlencoded({ limit: '50mb', extended: true }));

	// Admin APIs
	adminApi.use('/admin', adminRoute);

	// Auth APIs
	baseApi.use('/auth', authRoute);

	// About APIs
	baseApi.use('/uploading', uploadimgRoute);




	// User APIs
	baseApi.use('/user', userRoute);

	// HomeKey APIs
	baseApi.use('/homeKey', homeKeyRoute);

	// Payment APIs
	baseApi.use('/payment', paymentRoute);

	app.use('/api/v1', baseApi);

	app.use('/api/v1', adminApi);


	// // About APIs
	// app.use('/uploading', uploadimgRoute);

};
