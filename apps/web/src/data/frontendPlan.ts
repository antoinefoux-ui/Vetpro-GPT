export interface FrontendModulePlan {
  module: string;
  delivered: string[];
  leftToDo: string[];
  phase: string;
}

export const frontendPlan: FrontendModulePlan[] = [
  {
    module: "Design System & Layout",
    delivered: ["Base shell", "Sidebar navigation", "Dashboard cards"],
    leftToDo: ["Component library", "WCAG AA audit", "Dark mode tokens", "Form standards"],
    phase: "Phase 1"
  },
  {
    module: "Authentication & Staff Access",
    delivered: ["Backend auth endpoints available"],
    leftToDo: ["Login UI", "Session persistence", "Role-aware route guards", "Profile menu + logout"],
    phase: "Phase 1"
  },
  {
    module: "CRM",
    delivered: ["Backend create/list clients and pets", "Client timeline endpoint"],
    leftToDo: ["Client directory UI", "Client detail page", "Timeline filters", "Pet profile tabs"],
    phase: "Phase 1-2"
  },
  {
    module: "Appointments",
    delivered: ["Backend create/list/status update", "Conflict prevention"],
    leftToDo: ["Day/week/month calendar", "Drag/drop rescheduling", "Check-in queue", "Color-coded visit types"],
    phase: "Phase 1-2"
  },
  {
    module: "Billing & Checkout",
    delivered: ["Invoice draft/approve/pay APIs", "VAT total logic"],
    leftToDo: ["Invoice review screen", "Checkout flow", "Split payment UX", "Receipt timeline"],
    phase: "Phase 2"
  },
  {
    module: "Inventory",
    delivered: ["List/adjust items", "Low-stock alerts", "Auto deduction on approval"],
    leftToDo: ["Stock table UI", "Batch/expiry screens", "PO approval queue", "Supplier module"],
    phase: "Phase 2"
  },
  {
    module: "AI Documentation",
    delivered: ["Backend AI transcription stub endpoint"],
    leftToDo: ["Live transcript panel", "Draft approval queue", "Diff review UI", "One-click push to record"],
    phase: "Phase 3"
  },
  {
    module: "E-commerce",
    delivered: ["No frontend implementation yet"],
    leftToDo: ["Apple-style storefront", "PLP/PDP", "Cart + checkout", "Order history"],
    phase: "Phase 4"
  },
  {
    module: "Admin & Compliance",
    delivered: ["System health endpoint", "Audit logs endpoint"],
    leftToDo: ["Audit explorer UI", "GDPR export/delete UI", "Permission matrix editor", "Backup controls"],
    phase: "Phase 5"
  }
];

export const frontendMilestones = [
  {
    name: "Milestone A - Usable clinic flow",
    target: "4-6 weeks",
    scope: [
      "Auth screens",
      "CRM list/detail",
      "Appointment booking calendar",
      "Invoice review and payment posting"
    ]
  },
  {
    name: "Milestone B - Clinical productivity",
    target: "6-8 weeks",
    scope: [
      "Patient timeline UX",
      "Inventory management screens",
      "Alert center",
      "Role-based dashboard variants"
    ]
  },
  {
    name: "Milestone C - Differentiators",
    target: "8-12 weeks",
    scope: [
      "AI transcript approval workflow",
      "Admin compliance center",
      "E-commerce MVP",
      "Responsive polish + accessibility hardening"
    ]
  }
];
