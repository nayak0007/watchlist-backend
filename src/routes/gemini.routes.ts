import { Router } from 'express';
import * as providersController from '../controllers/providers.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';

const router = Router();

// POST /api/gemini/enrich — Enrich media with AI (public)
router.post('/enrich', validate(providersController.enrichSchema), providersController.enrichMedia);

// POST /api/gemini/recommend — Get AI recommendations (authenticated)
router.post('/recommend', authenticate, validate(providersController.recommendSchema), providersController.getRecommendations);

export default router;
