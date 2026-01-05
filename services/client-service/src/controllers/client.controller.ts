import { Request, Response } from 'express';
import { ClientService } from '../services/client.service';

// Mock tenant ID for now - In reality, this comes from auth middleware
const MOCK_TENANT_ID = '00000000-0000-0000-0000-000000000000';

export const ClientController = {
    async getClients(req: Request, res: Response) {
        try {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 20;
            // TODO: Extract tenantId from req.user
            const result = await ClientService.getAllClients(MOCK_TENANT_ID, page, limit);
            res.json(result);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    },

    async getClient(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const client = await ClientService.getClientById(MOCK_TENANT_ID, id);
            if (!client) {
                return res.status(404).json({ error: 'Client not found' });
            }
            res.json(client);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    },

    async createClient(req: Request, res: Response) {
        try {
            const client = await ClientService.createClient(MOCK_TENANT_ID, req.body);
            res.status(201).json(client);
        } catch (error) {
            console.error(error);
            res.status(400).json({ error: 'Failed to create client', details: error });
        }
    },

    async updateClient(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const client = await ClientService.updateClient(MOCK_TENANT_ID, id, req.body);
            res.json(client);
        } catch (error) {
            console.error(error);
            res.status(400).json({ error: 'Failed to update client' });
        }
    },

    async deleteClient(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await ClientService.deleteClient(MOCK_TENANT_ID, id);
            res.status(204).send();
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to delete client' });
        }
    },
};
