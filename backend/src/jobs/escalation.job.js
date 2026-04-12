const cron              = require('node-cron');
const EscalationService = require('../services/escalation.service');
const { logger }        = require('../utils/logger');

const startEscalationJob = (io) => {
  // Run every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    logger.info('Running escalation job...');
    await EscalationService.processEscalations(io);
  });

  logger.info('Escalation cron job started — runs every 30 minutes');
};

module.exports = { startEscalationJob };