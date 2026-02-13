import { Router } from "express";
import { adminRouter } from "./modules/admin.routes.js";
import { aiRouter } from "./modules/ai.routes.js";
import { appointmentRouter } from "./modules/appointments.routes.js";
import { authRouter } from "./modules/auth.routes.js";
import { billingRouter } from "./modules/billing.routes.js";
import { commerceRouter } from "./modules/commerce.routes.js";
import { crmRouter } from "./modules/crm.routes.js";
import { dashboardRouter } from "./modules/dashboard.routes.js";
import { inventoryRouter } from "./modules/inventory.routes.js";
import { realtimeRouter } from "./modules/realtime.routes.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/dashboard", dashboardRouter);
apiRouter.use("/crm", crmRouter);
apiRouter.use("/commerce", commerceRouter);
apiRouter.use("/appointments", appointmentRouter);
apiRouter.use("/inventory", inventoryRouter);
apiRouter.use("/billing", billingRouter);
apiRouter.use("/ai", aiRouter);
apiRouter.use("/admin", adminRouter);

apiRouter.use("/realtime", realtimeRouter);
