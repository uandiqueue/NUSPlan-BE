import { Router } from 'express';
import { generateAcademicPlan } from '../controllers/APController';

const router = Router();

/**
 * POST /api/academic-plan/generate
 * Main endpoint to generate academic plan payloads
 */
router.post('/generate', generateAcademicPlan);

export default router;
