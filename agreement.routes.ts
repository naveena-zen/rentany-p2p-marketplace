import { Router } from 'express';
import {
  createBookingRequest,
  acceptAgreement,
  confirmCompletion,
  getAgreementById,
  getAgreementContractView,
  getUserAgreements,
  createReview,
} from '../controllers/agreement.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, createBookingRequest);
router.get('/', authenticate, getUserAgreements);
router.get('/:id', authenticate, getAgreementById);
router.get('/:id/contract', getAgreementContractView);
router.post('/:id/accept', authenticate, acceptAgreement);
router.post('/:id/confirm', authenticate, confirmCompletion);
router.post('/:id/reviews', authenticate, createReview);

export default router;
