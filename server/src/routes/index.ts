import { Router } from 'express';
import authRoutes from './auth.routes';
import itemRoutes from './item.routes';
import templateRoutes from './template.routes';
import agreementRoutes from './agreement.routes';
import disputeRoutes from './dispute.routes';
import userRoutes from './user.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/items', itemRoutes);
router.use('/templates', templateRoutes);
router.use('/agreements', agreementRoutes);
router.use('/disputes', disputeRoutes);
router.use('/users', userRoutes);

export default router;
