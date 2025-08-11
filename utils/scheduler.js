import cron from 'node-cron';
import { runRepostTask } from '../repostService.js';

export const scheduleReposts = () => {
  cron.schedule('*/180 * * * *', async () => {
    console.log('⏰ Scheduled repost started...');
    await runRepostTask();
  });
};
