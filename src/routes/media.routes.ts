import { Router } from 'express';
import * as mediaController from '../controllers/media.controller';
import { validateQuery } from '../middleware/validate';
import { searchLimiter } from '../middleware/rateLimiter';
import { optionalAuth } from '../middleware/auth';

const router = Router();

// GET /api/media/trending
router.get('/trending', validateQuery(mediaController.trendingQuerySchema), mediaController.getTrending);

// GET /api/media/search
router.get('/search', searchLimiter, validateQuery(mediaController.searchQuerySchema), mediaController.search);

// GET /api/media/movie/:id
router.get('/movie/:id', optionalAuth, mediaController.getMovieDetail);

// GET /api/media/tv/:id
router.get('/tv/:id', optionalAuth, mediaController.getTvDetail);

// GET /api/media/person/:id
router.get('/person/:id', mediaController.getPersonDetail);

// GET /api/media/providers
router.get('/providers', mediaController.getProviders);

export default router;
