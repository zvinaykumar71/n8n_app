// src/controllers/tenSecondController.js
import axios from 'axios';
import {
  createTenSecondJob,
  startTenSecondJob,
  stopTenSecondJob,
  getTenSecondJobStatus
} from '../services/tenSecondCron.js';

// Global job instance
let tenSecondJob = null;

// Initialize job function
const initializeJob = () => {
  if (!tenSecondJob) {
    tenSecondJob = createTenSecondJob(async () => {
      // Your actual task logic here
      console.log('🏃‍♂️ Executing task...');
      let payload = {
        videoUrl: 'https://example.com/video.mp4',
        imageUrl: 'https://example.com/image.jpg',
        caption: 'This is a test caption',
        message: 'Task executed'

      }
      // Call your webhook
      try {
        const response = await axios.post(
          'https://n8n.srv934690.hstgr.cloud/webhook-test/my_webhook?brand=workflow&action=subscribe',
          payload,
          {
            headers: { 'Content-Type': 'application/json' }
          }
        );
        
        console.log('Webhook response:', response.data);
      }  catch (err) {
        console.error('Error calling webhook:', err);
      }
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('📊 Task completed successfully');
    });
    console.log('🆕 30-second job initialized (not started yet)');
  }
  return tenSecondJob;
};

// Start the job
export const startJob = async (req, res) => {
  try {
    const job = initializeJob();
    const started = startTenSecondJob(job);
    console.log("vinay===>",started)
    
    if (started) {
      res.json({
        success: true,
        message: '30-second job started successfully',
        status: getTenSecondJobStatus(job),
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Job is already running or not initialized',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error starting job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start job: ' + error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Stop the job
export const stopJob = async (req, res) => {
  try {
    const stopped = stopTenSecondJob(tenSecondJob);
    
    if (stopped) {
      res.json({
        success: true,
        message: '10-second job stopped successfully',
        status: getTenSecondJobStatus(tenSecondJob),
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Job is not running or not initialized',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error stopping job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop job: ' + error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Get job status
export const getStatus = async (req, res) => {
  try {
    res.json({
      success: true,
      status: getTenSecondJobStatus(tenSecondJob),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get job status: ' + error.message,
      timestamp: new Date().toISOString()
    });
  }
};