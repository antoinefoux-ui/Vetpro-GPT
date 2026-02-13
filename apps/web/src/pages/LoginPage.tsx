import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";
import { api } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { email, minLength, validate } from "../lib/validation";

export function LoginPage() {
  const { login, setSession } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "admin@vetpro.local", password: "password123" });
  const [resetEmail, setResetEmail] = useState("admin@vetpro.local");
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("newPassword123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const validationError = validate([
      () => email(form.email),
      () => minLength(form.password, 8, "Password")
    ]);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }


  async function loginWithGoogle() {
    try {
      const result = await api.oauthGoogle(`demo-google-token-${Date.now()}`);
      setSession(result.user, result.accessToken, result.refreshToken);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function requestReset() {
    try {
      const response = await api.requestPasswordReset(resetEmail);
      setResetToken(response.resetToken);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function confirmReset() {
    if (!resetToken) return;
    try {
      await api.confirmPasswordReset(resetToken, newPassword);
      setError(null);
      alert("Password reset complete. You can now login with new password.");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <section className="auth-wrap" aria-labelledby="login-heading">
      <div className="grid auth-grid">
        <form className="card auth-card" onSubmit={onSubmit}>
          <h2 id="login-heading">{t("login")}</h2>
          <label>Email<input aria-label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
          <label>Password<input aria-label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} required /></label>
          {error ? <p className="error">{error}</p> : null}
          <button type="submit" disabled={loading}>{loading ? "Signing in…" : "Sign In"}</button>
          <button type="button" onClick={() => void loginWithGoogle()}>Sign in with Google</button>
        </form>

        <article className="card auth-card">
          <h3>Password reset</h3>
          <label>Account email<input value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} /></label>
          <button onClick={() => void requestReset()}>Request reset token</button>
          {resetToken ? (
            <>
              <p className="muted">Reset token (demo): {resetToken}</p>
              <label>New password<input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></label>
              <button onClick={() => void confirmReset()}>Confirm password reset</button>
            </>
          ) : null}
        </article>
      </div>
    </section>
  );
}
