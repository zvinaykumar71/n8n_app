// index.js
import express from 'express';
import dotenv from 'dotenv';
import { runRepostTask } from './repostService.js';
import { scheduleReposts } from './utils/scheduler.js';
import containerRouter from './routes/createContainerId.js';



dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;


app.use(express.json());
// Routes
app.get('/', (req, res) => {
    res.send('✅ Instagram Reposter is running. Use /repost to trigger a post.');
  });

  
app.get('/repost', async (req, res) => {
  try {
    await runRepostTask();
    res.send('✅ Repost task completed');
  } catch (err) {
    res.status(500).send('❌ Error: ' + err.message);
  }
});
// app.use('/api', containerRouter);

app.listen(PORT, () => {
    console.log("port", PORT);
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  // scheduleReposts();
});