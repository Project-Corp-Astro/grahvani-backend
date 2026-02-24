import { Router } from "express";
import { handleUpload } from "../controllers/upload.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";

const router = Router();

// POST /api/v1/media/upload — Upload a file
router.post("/upload", authMiddleware, upload.single("file"), handleUpload);

export default router;
