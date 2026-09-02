import { Router } from 'express';
import { createItem, getItems, getItemById, updateItem, deleteItem } from '../controllers/item.controller';
import { authenticate, requireRoles } from '../middleware/auth';

const router = Router();

router.get('/', getItems);
router.get('/:id', getItemById);
router.post('/', authenticate, requireRoles('OWNER', 'ADMIN_ARBITRATOR'), createItem);
router.put('/:id', authenticate, requireRoles('OWNER', 'ADMIN_ARBITRATOR'), updateItem);
router.delete('/:id', authenticate, requireRoles('OWNER', 'ADMIN_ARBITRATOR'), deleteItem);

export default router;
