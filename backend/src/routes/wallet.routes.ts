import { Router } from 'express';
import { WalletController } from '../controllers/wallet.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody, depositSchema } from '../middleware/validator';

const router = Router();

router.get('/balance', authenticate, WalletController.getBalance);
router.post('/deposit', authenticate, validateBody(depositSchema), WalletController.deposit);
router.post('/khqr/generate', authenticate, WalletController.generateKhqr);
router.post('/khqr/verify', authenticate, WalletController.verifyKhqr);
router.get('/transactions', authenticate, WalletController.getTransactions);

export default router;
