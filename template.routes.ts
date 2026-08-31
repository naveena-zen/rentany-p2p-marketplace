import { Router } from 'express';
import { createTemplate, getOwnerTemplates, getTemplateById, updateTemplate } from '../controllers/template.controller';
import { authenticate, requireRoles } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, requireRoles('OWNER', 'ADMIN_ARBITRATOR'), createTemplate);
router.get('/', authenticate, requireRoles('OWNER', 'ADMIN_ARBITRATOR'), getOwnerTemplates);
router.get('/:id', authenticate, getTemplateById);
router.put('/:id', authenticate, requireRoles('OWNER', 'ADMIN_ARBITRATOR'), updateTemplate);

export default router;
