import { Router } from "express";
import {
    handleListFiles,
    handleGetFile,
    handleUpdateFile,
    handleDeleteFile,
} from "../controllers/file.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

// GET /api/v1/media — List files
router.get("/", authMiddleware, handleListFiles);

// GET /api/v1/media/:id — Get file details
router.get("/:id", authMiddleware, handleGetFile);

// PATCH /api/v1/media/:id — Update file
router.patch("/:id", authMiddleware, handleUpdateFile);

// DELETE /api/v1/media/:id — Delete file
router.delete("/:id", authMiddleware, handleDeleteFile);

export default router;
