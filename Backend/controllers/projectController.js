/**
 * PROJECT CONTROLLER
 *
 * Controllers do exactly three things:
 *   1. Pull data out of the HTTP request.
 *   2. Call a service (which owns the business rules).
 *   3. Turn the result — or the thrown error — back into an HTTP response.
 *
 * There are NO permission checks, validation rules or SQL queries in this file.
 * Those live in services/projectService.js so that every caller gets them.
 */

import * as projectService from '../services/projectService.js';
import { sendError } from '../utils/AppError.js';
import { camelizeKeys } from '../utils/serialize.js';

/**
 * Socket payloads bypass res.json, so they do not get the global camelCase conversion.
 * They must be serialized here or clients receive a different shape over the socket than
 * over HTTP — which is exactly the drift the serializer exists to prevent.
 */
const emit = (req, event, payload) => req.app.get('io')?.emit(event, camelizeKeys(payload));

/**
 * GET /api/v1/projects
 * Public.
 */
export const getProjects = async (req, res) => {
    try {
        const projects = await projectService.listProjects(req.query);
        res.json({ success: true, data: projects });
    } catch (error) {
        sendError(res, error);
    }
};

/**
 * GET /api/v1/projects/:id
 * Public.
 */
export const getProjectById = async (req, res) => {
    try {
        const project = await projectService.getProjectDetail(req.params.id);
        res.json({ success: true, data: project });
    } catch (error) {
        sendError(res, error);
    }
};

/**
 * POST /api/v1/projects
 * Admin only.
 */
export const createProject = async (req, res) => {
    try {
        const project = await projectService.createProject({
            actor: req.user,
            body: req.body,
            files: req.files || []
        });

        // Broadcast the stored row so every connected client renders real data.
        emit(req, 'project:created', project);

        res.status(201).json({ success: true, data: project });
    } catch (error) {
        sendError(res, error);
    }
};

/**
 * PATCH /api/v1/projects/:id
 * Admins may edit any project; contractors only their own (enforced in the service).
 */
export const updateProject = async (req, res) => {
    try {
        const project = await projectService.updateProject({
            actor: req.user,
            projectId: req.params.id,
            body: req.body,
            files: req.files || []
        });

        emit(req, 'project:updated', project);

        res.json({ success: true, data: project });
    } catch (error) {
        sendError(res, error);
    }
};

/**
 * DELETE /api/v1/projects/:id
 * Admin only.
 */
export const deleteProject = async (req, res) => {
    try {
        const { id } = await projectService.deleteProject({
            actor: req.user,
            projectId: req.params.id
        });

        emit(req, 'project:deleted', { id });

        res.json({ success: true, message: 'Project deleted' });
    } catch (error) {
        sendError(res, error);
    }
};

/**
 * POST /api/v1/projects/:id/updates
 * Appends a timeline entry. Same ownership rule as editing.
 */
export const addProjectUpdate = async (req, res) => {
    try {
        const project = await projectService.addTimelineUpdate({
            actor: req.user,
            projectId: req.params.id,
            message: req.body.message,
            date: req.body.date
        });

        emit(req, 'project:updated', project);

        res.status(201).json({ success: true, data: project });
    } catch (error) {
        sendError(res, error);
    }
};
