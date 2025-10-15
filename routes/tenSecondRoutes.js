// src/routes/tenSecondRoutes.js
import { Router } from 'express';
import { startJob, stopJob, getStatus } from './../services/tenSecondController.js';

const router = Router();

router.post('/start', startJob);
router.post('/stop', stopJob);
router.get('/status', getStatus);

export default router;