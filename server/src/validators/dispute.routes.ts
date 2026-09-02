import { Router } from 'express';
import { createDispute, getOpenDisputes, updateDisputeStatus, resolveDispute } from '../controllers/dispute.controller';
import { authenticate, requireRoles } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, createDispute);
router.get('/', authenticate, requireRoles('ADMIN_ARBITRATOR'), getOpenDisputes);
router.patch('/:id/status', authenticate, requireRoles('ADMIN_ARBITRATOR'), updateDisputeStatus);
router.post('/:id/resolve', authenticate, requireRoles('ADMIN_ARBITRATOR'), resolveDispute);

export default router;
