/**
 * FINANCE ROUTES
 *
 * All money mutations sit behind protect + ENTITY_ADMIN + a strict per-user
 * rate limit on the second factor. The limiter counts FAILED attempts only:
 * five wrong password+PCN pairs in fifteen minutes locks the window, but a
 * finance officer doing legitimate back-to-back work is never throttled.
 *
 * The ledger head and full verification are public and unauthenticated by
 * design: tamper-evidence only works if outsiders can check the chain.
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
    createAllocation,
    createDisbursement,
    confirmDisbursement,
    setBudget,
    recordIncome,
    getMine,
    getMinfiOverview,
    getLedgerHead,
    verifyLedger,
} from '../controllers/financeController.js';

const router = express.Router();

const secondFactorLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => req.user?.id || req.ip,
    message: { success: false, error: 'Too many failed confirmations. Try again in fifteen minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Public chain checks, before any auth.
router.get('/ledger/head', getLedgerHead);
router.get('/ledger/verify', verifyLedger);

router.use(protect, authorize('ENTITY_ADMIN'));

router.get('/mine', getMine);
router.get('/minfi', getMinfiOverview);

router.post('/allocations', secondFactorLimiter, createAllocation);
router.post('/allocations/:id/disbursements', secondFactorLimiter, createDisbursement);
router.post('/disbursements/:id/confirm', secondFactorLimiter, confirmDisbursement);
router.put('/budget', secondFactorLimiter, setBudget);
router.post('/income', secondFactorLimiter, recordIncome);

export default router;
