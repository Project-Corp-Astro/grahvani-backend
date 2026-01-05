import { Request, Response } from 'express';
import { UserService } from '../services/user.service';

export const UserController = {
    async getUsers(req: Request, res: Response) {
        try {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 20;
            const result = await UserService.getAllUsers(page, limit);
            res.json(result);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    },

    async getUser(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const user = await UserService.getUserById(id);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            res.json(user);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    },

    async createUser(req: Request, res: Response) {
        try {
            const user = await UserService.createUser(req.body);
            res.status(201).json(user);
        } catch (error) {
            console.error(error);
            res.status(400).json({ error: 'Failed to create user' });
        }
    },

    async updateUser(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const user = await UserService.updateUser(id, req.body);
            res.json(user);
        } catch (error) {
            console.error(error);
            res.status(400).json({ error: 'Failed to update user' });
        }
    },

    async deleteUser(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await UserService.deleteUser(id);
            res.status(204).send();
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to delete user' });
        }
    },
};
