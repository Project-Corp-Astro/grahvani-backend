import { Response, NextFunction } from 'express';
import { clientService } from '../services/client.service';
import { AuthRequest } from '../middleware/auth.middleware';

export class ClientController {
    /**
     * GET /clients
     */
    async getClients(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const tenantId = req.user!.tenantId;
            const userId = req.user!.id;
            const result = await clientService.getAllClients(tenantId, { ...req.query, userId });
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /clients/:id
     */
    async getClient(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const tenantId = req.user!.tenantId;
            const metadata = {
                userId: req.user!.id,
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
            };
            const client = await clientService.getClient(tenantId, id, metadata);
            res.json(client);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /clients
     */
    async createClient(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const tenantId = req.user!.tenantId;
            const metadata = {
                userId: req.user!.id,
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
            };
            const client = await clientService.createClient(tenantId, req.body, metadata);
            res.status(201).json(client);
        } catch (error) {
            next(error);
        }
    }

    /**
     * PATCH /clients/:id
     */
    async updateClient(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const tenantId = req.user!.tenantId;
            const metadata = {
                userId: req.user!.id,
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
            };
            const client = await clientService.updateClient(tenantId, id, req.body, metadata);
            res.json(client);
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /clients/:id
     */
    async deleteClient(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const tenantId = req.user!.tenantId;
            const metadata = {
                userId: req.user!.id,
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
            };
            await clientService.deleteClient(tenantId, id, metadata);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}

export const clientController = new ClientController();
