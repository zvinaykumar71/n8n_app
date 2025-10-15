// index.js
import express from 'express';
import dotenv from 'dotenv';
import { runRepostTask } from './repostService.js';
import tenSecondRoutes from './routes/tenSecondRoutes.js'


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
    const result = await runRepostTask(); // await the result from the task

    if (result) {
      res.json(result); // respond with JSON if repost was done
    } else {
      res.send('✅ No new media to repost');
    }
  } catch (err) {
    res.status(500).send('❌ Error: ' + err.message);
  }
});



 // Routes
  app.use('/api/ten-second-job', tenSecondRoutes);


app.listen(PORT, () => {
  console.log("port", PORT);
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  // scheduleReposts();
});