/**
 * ENTITY CONTROLLER
 *
 * Public reads of the administrative hierarchy. No auth: which councils exist
 * under which region, and what each body is working on, is exactly the public
 * information this platform exists to publish.
 */

import * as entityService from '../services/entityService.js';
import * as projectService from '../services/projectService.js';
import { sendError } from '../utils/AppError.js';

/** GET /api/v1/entities */
export const getEntities = async (req, res) => {
    try {
        const tree = await entityService.getEntityTree();
        res.json({ success: true, data: tree });
    } catch (error) {
        sendError(res, error);
    }
};

/** GET /api/v1/entities/:code */
export const getEntity = async (req, res) => {
    try {
        const profile = await entityService.getEntityProfile(req.params.code);

        // The entity's projects reuse the standard list pipeline, so they arrive
        // with images, health and flags exactly like every other project list.
        const scopeIds = await entityService.entityScopeIds(profile.entity);
        const projects = await projectService.listProjects({ entityIds: scopeIds, limit: 100 });

        res.json({ success: true, data: { ...profile, projects } });
    } catch (error) {
        sendError(res, error);
    }
};
