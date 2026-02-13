import { Link, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./components/AuthProvider";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RoleGate } from "./components/RoleGate";
import { useI18n } from "./lib/i18n";
import { AdminCompliancePage } from "./pages/AdminCompliancePage";
import { AIDocsPage } from "./pages/AIDocsPage";
import { AppointmentsPage } from "./pages/AppointmentsPage";
import { BillingPage } from "./pages/BillingPage";
import { CRMPage } from "./pages/CRMPage";
import { DashboardPage } from "./pages/DashboardPage";
import { EcommercePage } from "./pages/EcommercePage";
import { FrontendPlanPage } from "./pages/FrontendPlanPage";
import { InventoryPage } from "./pages/InventoryPage";
import { LoginPage } from "./pages/LoginPage";
import { ModulePage } from "./pages/ModulePage";

const modules = [
  { label: "CRM", path: "/crm" },
  { label: "Appointments", path: "/appointments" },
  { label: "Billing", path: "/billing" },
  { label: "Inventory", path: "/inventory" },
  { label: "AI Documentation", path: "/ai-docs" },
  { label: "E-Commerce", path: "/ecommerce" },
  { label: "Marketing", path: "/module/Marketing" },
  { label: "After-Hours AI", path: "/module/After-Hours%20AI" }
];

function Shell({ children }: { children: JSX.Element }) {
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useI18n();

  return (
    <div className="layout">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <aside className="sidebar" aria-label="Primary navigation">
        <h1>VetPro GPT</h1>
        <p className="muted small">{user?.fullName} · {user?.role}</p>
        <label className="lang-switch">
          {t("language")}
          <select value={lang} onChange={(e) => setLang(e.target.value as "en" | "sk")}>
            <option value="en">English</option>
            <option value="sk">Slovensky</option>
          </select>
        </label>
        <nav>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/frontend-plan">Frontend Plan</Link>
          {modules.map((module) => (
            <Link key={module.path} to={module.path}>{module.label}</Link>
          ))}
          <RoleGate roles={["ADMIN"]}>
            <Link to="/admin">Admin/Compliance</Link>
          </RoleGate>
        </nav>
        <button className="logout-btn" onClick={() => void logout()}>{t("logout")}</button>
      </aside>
      <main id="main-content" className="content" tabIndex={-1}>{children}</main>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Shell>
              <Routes>
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="frontend-plan" element={<FrontendPlanPage />} />
                <Route path="crm" element={<CRMPage />} />
                <Route path="appointments" element={<AppointmentsPage />} />
                <Route path="billing" element={<BillingPage />} />
                <Route path="inventory" element={<InventoryPage />} />
                <Route path="ai-docs" element={<AIDocsPage />} />
                <Route path="ecommerce" element={<EcommercePage />} />
                <Route path="admin" element={<AdminCompliancePage />} />
                <Route path="module/:name" element={<ModulePage />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Shell>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
