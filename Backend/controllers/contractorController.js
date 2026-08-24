/**
 * CONTRACTOR CONTROLLER
 * HTTP translation only; every rule lives in services/contractorService.js.
 */

import * as contractorService from '../services/contractorService.js';
import { sendError } from '../utils/AppError.js';

/** GET /api/v1/contractor/profile */
export const getProfile = async (req, res) => {
    try {
        res.json({ success: true, data: await contractorService.getProfile(req.user.id) });
    } catch (error) {
        sendError(res, error);
    }
};

/** PUT /api/v1/contractor/profile */
export const saveProfile = async (req, res) => {
    try {
        res.json({ success: true, data: await contractorService.saveProfile(req.user.id, req.body) });
    } catch (error) {
        sendError(res, error);
    }
};

/** POST /api/v1/contractor/documents (multipart: file + label) */
export const addDocument = async (req, res) => {
    try {
        const fileUrl = req.file ? (req.file.path || req.file.secure_url) : null;
        const data = await contractorService.addDocument(req.user.id, {
            label: req.body.label,
            fileUrl,
        });
        res.status(201).json({ success: true, data });
    } catch (error) {
        sendError(res, error);
    }
};

/** GET /api/v1/contractor/queue (MINTP) */
export const getQueue = async (req, res) => {
    try {
        res.json({ success: true, data: await contractorService.listQueue(req.user) });
    } catch (error) {
        sendError(res, error);
    }
};

/** POST /api/v1/contractor/:userId/verify (MINTP) */
export const verify = async (req, res) => {
    try {
        const data = await contractorService.decide({
            actor: req.user,
            userId: req.params.userId,
            decision: req.body.decision,
            reason: req.body.reason,
        });
        res.json({ success: true, data });
    } catch (error) {
        sendError(res, error);
    }
};
