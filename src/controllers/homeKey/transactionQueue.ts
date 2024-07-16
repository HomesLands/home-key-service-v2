const Queue = require('bull');

import TransactionsController from "./transactions";

const transactionQueue = new Queue('transactionQueue', {
  redis: {
    host: '127.0.0.1', // Use the appropriate host for your Redis instance
    port: 6379, // Use the appropriate port for your Redis instance
  },
});

transactionQueue.process(async (job, done) => {
  // const { req, res } = job.data;
  // try {
  //   await TransactionsController.postTransactionsDepositPendingBanking(req, res);
  //   done();
  // } catch (error) {
  //   done(error);
  // }
});

module.exports = transactionQueue;
