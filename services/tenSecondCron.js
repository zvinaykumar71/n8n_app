// src/services/tenSecondCron.js
import { CronJob } from 'cron';

// Create and export the job instance
export const createTenSecondJob = (taskFn) => {
  return new CronJob(
    '*/30 * * * * *', // Every 10 seconds
    async () => {
      try {
        console.log('🔄 30-second job started at:', new Date().toISOString());
        await taskFn();
        console.log('✅ 30-second job completed at:', new Date().toISOString());
      } catch (error) {
        console.error('❌ 30-second job failed:', error);
      }
    },
    null,
    false // Don't start automatically
  );
};

export const startTenSecondJob = (job) => {
  if (job && !job.running) {
    job.start();
    console.log('⏰ 30-second job STARTED');
    return true;
  }
  return false;
};

export const stopTenSecondJob = (job) => {
  if (job && job.running) {
    job.stop();
    console.log('⏹️ 30-second job STOPPED');
    return true;
  }
  return false;
};

export const getTenSecondJobStatus = (job) => {
  if (!job) return { exists: false, running: false, nextDate: null };
  
  return {
    exists: true,
    running: job.running,
    nextDate: job.nextDate()
  };
};