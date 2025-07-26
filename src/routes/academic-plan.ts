import { Router } from 'express';
import { generateAcademicPlan } from '../controllers/APController';

const router = Router();

// Define route to generate academic plan based on selected programmes
router.post('/generate', generateAcademicPlan);

export default router;
