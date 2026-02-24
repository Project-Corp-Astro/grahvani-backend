import { Router } from "express";
import uploadRoutes from "./upload.routes";
import fileRoutes from "./file.routes";

const router = Router();

// Media routes
router.use("/media", uploadRoutes);  // /api/v1/media/upload
router.use("/media", fileRoutes);    // /api/v1/media, /api/v1/media/:id

export default router;
