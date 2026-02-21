// User Controller - LLD Compliant Implementation
import { Response, NextFunction } from "express";
import { userService } from "../services/user.service";
import { AuthRequest } from "../middleware/auth.middleware";
import {
  GetUsersQuerySchema,
  UpdateProfileRequestSchema,
  ErrorResponse,
} from "../dtos";
import { BaseError, ValidationError } from "../errors";
import { logger } from "../config/logger";
import { v4 as uuidv4 } from "uuid";
import { addressService } from "../services/address.service";
import {
  CreateAddressRequestSchema,
  UpdateAddressRequestSchema,
} from "../dtos/address.dto";

// Helper to create structured error response
const createErrorResponse = (
  error: BaseError,
  requestId: string,
): ErrorResponse => ({
  error: {
    code: error.code,
    message: error.message,
    requestId,
    timestamp: new Date().toISOString(),
    ...(error instanceof ValidationError && { errors: error.errors }),
  },
});

export const UserController = {
  /**
   * GET /users - List users (Admin only)
   */
  async getUsers(req: AuthRequest, res: Response, next: NextFunction) {
    const requestId = uuidv4();
    try {
      const validation = GetUsersQuerySchema.safeParse(req.query);
      if (!validation.success) {
        const errors: Record<string, string[]> = {};
        validation.error.errors.forEach((e) => {
          const path = e.path.join(".");
          if (!errors[path]) errors[path] = [];
          errors[path].push(e.message);
        });
        const validationError = new ValidationError(errors);
        return res
          .status(400)
          .json(createErrorResponse(validationError, requestId));
      }

      const tenantId = req.user!.tenantId;
      const result = await userService.getUsers(tenantId, validation.data);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /users/me - Get current user profile
   */
  async getMe(req: AuthRequest, res: Response, next: NextFunction) {
    const requestId = uuidv4();
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;

      logger.debug({ userId, tenantId }, "getMe request");

      const user = await userService.getCurrentUser(tenantId, userId);

      // Update last active (non-blocking)
      userService.updateLastActive(tenantId, userId).catch((err) => logger.error({ err }, "Failed to update last active"));

      logger.debug({ userId: user.id }, "getMe user found");

      res.json(user);
    } catch (error) {
      logger.error({ err: error }, "getMe error");
      if (error instanceof BaseError) {
        return res
          .status(error.statusCode)
          .json(createErrorResponse(error, requestId));
      }
      next(error);
    }
  },

  /**
   * PATCH /users/me - Update current user profile
   */
  async updateMe(req: AuthRequest, res: Response, next: NextFunction) {
    const requestId = uuidv4();
    try {
      const validation = UpdateProfileRequestSchema.safeParse(req.body);
      if (!validation.success) {
        const errors: Record<string, string[]> = {};
        validation.error.errors.forEach((e) => {
          const path = e.path.join(".");
          if (!errors[path]) errors[path] = [];
          errors[path].push(e.message);
        });
        const validationError = new ValidationError(errors);
        return res
          .status(400)
          .json(createErrorResponse(validationError, requestId));
      }

      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;

      const updatedUser = await userService.updateProfile(
        tenantId,
        userId,
        validation.data,
        {
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        },
      );

      res.json(updatedUser);
    } catch (error) {
      if (error instanceof BaseError) {
        return res
          .status(error.statusCode)
          .json(createErrorResponse(error, requestId));
      }
      next(error);
    }
  },

  /**
   * DELETE /users/me - Delete current user account (soft delete)
   */
  async deleteMe(req: AuthRequest, res: Response, next: NextFunction) {
    const requestId = uuidv4();
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;

      await userService.deleteAccount(tenantId, userId, {
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.status(204).send();
    } catch (error) {
      if (error instanceof BaseError) {
        return res
          .status(error.statusCode)
          .json(createErrorResponse(error, requestId));
      }
      next(error);
    }
  },

  /**
   * GET /users/:id - Get user by ID
   */
  async getUser(req: AuthRequest, res: Response, next: NextFunction) {
    const requestId = uuidv4();
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const requesterId = req.user!.id;

      const user = await userService.getUserById(tenantId, id, requesterId);
      res.json(user);
    } catch (error) {
      if (error instanceof BaseError) {
        return res
          .status(error.statusCode)
          .json(createErrorResponse(error, requestId));
      }
      next(error);
    }
  },

  /**
   * PATCH /users/:id/status - Update user status (Admin only)
   */
  async updateUserStatus(req: AuthRequest, res: Response, next: NextFunction) {
    const requestId = uuidv4();
    try {
      const { id } = req.params;
      const { status, reason } = req.body;
      const tenantId = req.user!.tenantId;
      const adminId = req.user!.id;

      // Validate status
      if (!status || !["active", "suspended"].includes(status)) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: 'Status must be "active" or "suspended"',
            requestId,
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Prevent self-suspension
      if (id === adminId && status === "suspended") {
        return res.status(400).json({
          error: {
            code: "CANNOT_SUSPEND_SELF",
            message: "You cannot suspend your own account",
            requestId,
            timestamp: new Date().toISOString(),
          },
        });
      }

      const user = await userService.getUserById(tenantId, id);
      if (!user) {
        return res.status(404).json({
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found",
            requestId,
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Update status via repository
      const { userRepository } = await import("../repositories");
      await userRepository.update(tenantId, id, { status });

      // Log the action
      await userRepository.createActivityLog({
        userId: id,
        action: `status_changed_to_${status}`,
        entityType: "user",
        entityId: id,
        newValues: { status, reason, changedBy: adminId },
      });

      logger.info({ userId: id, status, adminId }, "User status changed");

      res.json({
        id,
        status,
        updatedBy: adminId,
        reason: reason || null,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof BaseError) {
        return res
          .status(error.statusCode)
          .json(createErrorResponse(error, requestId));
      }
      next(error);
    }
  },

  /**
   * PATCH /users/:id/role - Update user role (Admin only)
   */
  async updateUserRole(req: AuthRequest, res: Response, next: NextFunction) {
    const requestId = uuidv4();
    try {
      const { id } = req.params;
      const { role } = req.body;
      const tenantId = req.user!.tenantId;
      const adminId = req.user!.id;
      const adminRole = req.user!.role;

      // Validate role
      if (!role || !["user", "admin", "moderator"].includes(role)) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: 'Role must be "user", "admin", or "moderator"',
            requestId,
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Prevent self-demotion
      if (id === adminId && role !== adminRole) {
        return res.status(400).json({
          error: {
            code: "CANNOT_CHANGE_OWN_ROLE",
            message: "You cannot change your own role",
            requestId,
            timestamp: new Date().toISOString(),
          },
        });
      }

      const user = await userService.getUserById(tenantId, id);
      if (!user) {
        return res.status(404).json({
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found",
            requestId,
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Update role via repository
      const { userRepository } = await import("../repositories");
      await userRepository.update(tenantId, id, { role });

      // Log the action
      await userRepository.createActivityLog({
        userId: id,
        action: `role_changed_to_${role}`,
        entityType: "user",
        entityId: id,
        newValues: { role, previousRole: user.role, changedBy: adminId },
      });

      logger.info({ userId: id, role, adminId }, "User role changed");

      res.json({
        id,
        role,
        previousRole: user.role,
        updatedBy: adminId,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof BaseError) {
        return res
          .status(error.statusCode)
          .json(createErrorResponse(error, requestId));
      }
      next(error);
    }
  },

  // ============ ADDRESS ENDPOINTS ============

  /**
   * GET /users/me/addresses - Get current user addresses
   */
  async getMyAddresses(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const addresses = await addressService.getUserAddresses(userId);
      res.json(addresses);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /users/me/addresses - Add a new address
   */
  async addAddress(req: AuthRequest, res: Response, next: NextFunction) {
    const requestId = uuidv4();
    try {
      const validation = CreateAddressRequestSchema.safeParse(req.body);
      if (!validation.success) {
        const errors: Record<string, string[]> = {};
        validation.error.errors.forEach((e) => {
          const path = e.path.join(".");
          if (!errors[path]) errors[path] = [];
          errors[path].push(e.message);
        });
        return res
          .status(400)
          .json(createErrorResponse(new ValidationError(errors), requestId));
      }

      const userId = req.user!.id;
      const address = await addressService.addAddress(userId, validation.data, {
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.status(201).json(address);
    } catch (error) {
      if (error instanceof BaseError) {
        return res
          .status(error.statusCode)
          .json(createErrorResponse(error, requestId));
      }
      next(error);
    }
  },

  /**
   * PATCH /users/me/addresses/:id - Update an address
   */
  async updateAddress(req: AuthRequest, res: Response, next: NextFunction) {
    const requestId = uuidv4();
    try {
      const { id } = req.params;
      const validation = UpdateAddressRequestSchema.safeParse(req.body);
      if (!validation.success) {
        const errors: Record<string, string[]> = {};
        validation.error.errors.forEach((e) => {
          const path = e.path.join(".");
          if (!errors[path]) errors[path] = [];
          errors[path].push(e.message);
        });
        return res
          .status(400)
          .json(createErrorResponse(new ValidationError(errors), requestId));
      }

      const userId = req.user!.id;
      const address = await addressService.updateAddress(
        userId,
        id,
        validation.data,
        {
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        },
      );

      res.json(address);
    } catch (error) {
      if (error instanceof BaseError) {
        return res
          .status(error.statusCode)
          .json(createErrorResponse(error, requestId));
      }
      next(error);
    }
  },

  /**
   * DELETE /users/me/addresses/:id - Delete an address
   */
  async deleteAddress(req: AuthRequest, res: Response, next: NextFunction) {
    const requestId = uuidv4();
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      await addressService.deleteAddress(userId, id, {
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.status(204).send();
    } catch (error) {
      if (error instanceof BaseError) {
        return res
          .status(error.statusCode)
          .json(createErrorResponse(error, requestId));
      }
      next(error);
    }
  },
};
