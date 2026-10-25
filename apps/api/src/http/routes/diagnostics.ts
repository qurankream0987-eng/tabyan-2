import { Router, type IRouter } from "express";
import { PLACEMENT_DIAGNOSTIC_VERSION } from "../../media/placementPlayback";

const router: IRouter = Router();

router.get("/diagnostics/placement-version", (_req, res) => {
  res.status(200).json({
    placementDiagnosticVersion: PLACEMENT_DIAGNOSTIC_VERSION,
  });
});

export default router;