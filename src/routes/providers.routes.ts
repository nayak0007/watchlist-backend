import { Router } from 'express';
import * as providersController from '../controllers/providers.controller';

const router = Router();

// GET /api/providers — Get Indian streaming providers
router.get('/', providersController.getProviders);

export default router;
