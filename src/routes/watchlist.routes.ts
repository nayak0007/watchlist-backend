import { Router } from 'express';
import * as watchlistController from '../controllers/watchlist.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';

const router = Router();

// All watchlist routes require authentication
router.use(authenticate);

// GET /api/watchlists — Get all watchlists
router.get('/', watchlistController.getWatchlists);

// POST /api/watchlists — Create a new watchlist
router.post('/', validate(watchlistController.createWatchlistSchema), watchlistController.createWatchlist);

// GET /api/watchlists/:id — Get watchlist detail with items
router.get('/:id', watchlistController.getWatchlistDetail);

// PUT /api/watchlists/:id — Update watchlist
router.put('/:id', validate(watchlistController.updateWatchlistSchema), watchlistController.updateWatchlist);

// DELETE /api/watchlists/:id — Delete watchlist
router.delete('/:id', watchlistController.deleteWatchlist);

// POST /api/watchlists/:id/items — Add item to watchlist
router.post('/:id/items', validate(watchlistController.addItemSchema), watchlistController.addItem);

// DELETE /api/watchlists/:id/items/:itemId — Remove item from watchlist
router.delete('/:id/items/:itemId', watchlistController.removeItem);

// PUT /api/watchlists/:id/items/:itemId — Update item notes
router.put('/:id/items/:itemId', validate(watchlistController.updateItemSchema), watchlistController.updateItem);

export default router;
