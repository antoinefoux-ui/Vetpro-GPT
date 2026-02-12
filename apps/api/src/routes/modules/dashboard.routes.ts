import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { lowStockAlerts } from "../../services/inventory.service.js";
import { listAppointments } from "../../services/scheduling.service.js";
import { listInvoices } from "../../services/billing.service.js";

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

dashboardRouter.get("/overview", (_req, res) => {
  const appointments = listAppointments();
  const invoices = listInvoices();
  const approvedRevenue = invoices
    .filter((inv) => inv.status === "APPROVED" || inv.status === "PAID")
    .reduce((sum, inv) => sum + inv.total, 0);

  res.json({
    alerts: {
      critical: [],
      high: [`${invoices.filter((i) => i.status === "DRAFT").length} invoice drafts pending approval`],
      medium: lowStockAlerts().map((item) => `${item.name} low stock`)
    },
    clinicalSnapshot: {
      waitingPatients: appointments.filter((apt) => apt.status === "CHECKED_IN").length,
      completedAppointments: appointments.filter((apt) => apt.status === "COMPLETED").length,
      scheduledAppointments: appointments.length
    },
    revenueToday: Number(approvedRevenue.toFixed(2))
  });
});
