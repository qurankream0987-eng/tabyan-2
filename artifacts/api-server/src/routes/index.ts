import { Router, type IRouter } from "express";
import diagnosticsRouter from "./diagnostics";
import healthRouter from "./health";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(diagnosticsRouter);
router.use(healthRouter);
router.use(storageRouter);

export default router;
