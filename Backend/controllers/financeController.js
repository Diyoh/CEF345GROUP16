/**
 * FINANCE CONTROLLER
 *
 * Thin HTTP translation over financeService and ledgerService. Every rule
 * (MINFI-only powers, second factor, receiving-entity confirmation) lives in
 * the services; this file only moves fields.
 *
 * The second factor (password + pcn) arrives in the request body of every
 * mutation and is passed straight through, never logged, never stored.
 */

import * as finance from '../services/financeService.js';
import * as ledger from '../services/ledgerService.js';
import { sendError } from '../utils/AppError.js';

export const createAllocation = async (req, res) => {
    try {
        const { toEntityId, fiscalYear, amountXaf, purpose, password, pcn } = req.body;
        const data = await finance.createAllocation({ actor: req.user, toEntityId, fiscalYear, amountXaf, purpose, password, pcn });
        res.status(201).json({ success: true, data });
    } catch (error) {
        sendError(res, error);
    }
};

export const createDisbursement = async (req, res) => {
    try {
        const { amountXaf, password, pcn } = req.body;
        const data = await finance.createDisbursement({ actor: req.user, allocationId: req.params.id, amountXaf, password, pcn });
        res.status(201).json({ success: true, data });
    } catch (error) {
        sendError(res, error);
    }
};

export const confirmDisbursement = async (req, res) => {
    try {
        const { amountConfirmedXaf, password, pcn } = req.body;
        const data = await finance.confirmDisbursement({ actor: req.user, disbursementId: req.params.id, amountConfirmedXaf, password, pcn });
        res.json({ success: true, data });
    } catch (error) {
        sendError(res, error);
    }
};

export const setBudget = async (req, res) => {
    try {
        const { fiscalYear, plannedAmountXaf, note, password, pcn } = req.body;
        const data = await finance.setBudget({ actor: req.user, fiscalYear, plannedAmountXaf, note, password, pcn });
        res.json({ success: true, data });
    } catch (error) {
        sendError(res, error);
    }
};

export const recordIncome = async (req, res) => {
    try {
        const { fiscalYear, label, amountXaf, password, pcn } = req.body;
        const data = await finance.recordIncome({ actor: req.user, fiscalYear, label, amountXaf, password, pcn });
        res.status(201).json({ success: true, data });
    } catch (error) {
        sendError(res, error);
    }
};

export const getMine = async (req, res) => {
    try {
        if (!req.user.entity_id) {
            return res.status(403).json({ success: false, error: 'Your account is not attached to an institution' });
        }
        const data = await finance.getEntityFinance(req.user.entity_id);
        res.json({ success: true, data });
    } catch (error) {
        sendError(res, error);
    }
};

export const getMinfiOverview = async (req, res) => {
    try {
        const data = await finance.getMinfiOverview(req.user);
        res.json({ success: true, data });
    } catch (error) {
        sendError(res, error);
    }
};

export const initiatePayment = async (req, res) => {
    try {
        const { amountXaf, note, password, pcn } = req.body;
        const data = await finance.initiatePayment({ actor: req.user, projectId: req.params.projectId, amountXaf, note, password, pcn });
        res.status(201).json({ success: true, data });
    } catch (error) {
        sendError(res, error);
    }
};

export const affirmPayment = async (req, res) => {
    try {
        const { amountAffirmedXaf, password, pcn } = req.body;
        const data = await finance.affirmPayment({ actor: req.user, paymentId: req.params.id, amountAffirmedXaf, password, pcn });
        res.json({ success: true, data });
    } catch (error) {
        sendError(res, error);
    }
};

export const getPaymentInbox = async (req, res) => {
    try {
        const data = await finance.getContractorPayments(req.user);
        res.json({ success: true, data });
    } catch (error) {
        sendError(res, error);
    }
};

export const getProjectPayments = async (req, res) => {
    try {
        const data = await finance.listProjectPayments(req.params.projectId);
        res.json({ success: true, data });
    } catch (error) {
        sendError(res, error);
    }
};

/* Public: anyone can read the chain head and run a full verification. */

export const getLedgerHead = async (_req, res) => {
    try {
        const data = await ledger.getHead();
        res.json({ success: true, data });
    } catch (error) {
        sendError(res, error);
    }
};

export const verifyLedger = async (_req, res) => {
    try {
        const data = await ledger.verifyChain();
        res.json({ success: true, data });
    } catch (error) {
        sendError(res, error);
    }
};
