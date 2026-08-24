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
    initiatePayment,
    affirmPayment,
    getPaymentInbox,
    getProjectPayments,
    createDisbursement,
    confirmDisbursement,
    setBudget,
    recordIncome,
    getMine,
    getMinfiOverview,
    getAllBudgets,
    getLedgerHead,
    getPublicMoney,
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

// Public reads, before any auth: the chain checks and a project's payments.
router.get('/ledger/head', getLedgerHead);
router.get('/ledger/verify', verifyLedger);
router.get('/projects/:projectId/payments', getProjectPayments);
router.get('/overview', getPublicMoney);

router.use(protect);

// Institution desks.
router.get('/mine', authorize('ENTITY_ADMIN'), getMine);
router.get('/minfi', authorize('ENTITY_ADMIN'), getMinfiOverview);
router.get('/budgets', authorize('ENTITY_ADMIN'), getAllBudgets);

router.post('/allocations', authorize('ENTITY_ADMIN'), secondFactorLimiter, createAllocation);
router.post('/allocations/:id/disbursements', authorize('ENTITY_ADMIN'), secondFactorLimiter, createDisbursement);
router.post('/disbursements/:id/confirm', authorize('ENTITY_ADMIN'), secondFactorLimiter, confirmDisbursement);
router.put('/budget', authorize('ENTITY_ADMIN'), secondFactorLimiter, setBudget);
router.post('/income', authorize('ENTITY_ADMIN'), secondFactorLimiter, recordIncome);
router.post('/projects/:projectId/payments', authorize('ENTITY_ADMIN'), secondFactorLimiter, initiatePayment);

// The contractor's side of the pair of records.
router.get('/payments/inbox', authorize('CONTRACTOR'), getPaymentInbox);
router.post('/payments/:id/affirm', authorize('CONTRACTOR'), secondFactorLimiter, affirmPayment);

export default router;
