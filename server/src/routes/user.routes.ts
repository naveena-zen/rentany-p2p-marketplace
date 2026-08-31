import { Router } from 'express';
import { getUserProfile, recomputeTrustScoreHandler } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/:id', getUserProfile);
router.post('/:id/recompute-trust-score', authenticate, recomputeTrustScoreHandler);

export default router;
