import { frontendMilestones, frontendPlan } from "../data/frontendPlan";

export function FrontendPlanPage() {
  return (
    <section>
      <header className="page-header stack">
        <h2>Frontend Delivery Plan (from your original full prompt)</h2>
        <p>
          This plan maps what is already implemented versus what remains to reach your full veterinary platform UI scope.
        </p>
      </header>

      <div className="grid plan-grid">
        {frontendPlan.map((module) => (
          <article className="card" key={module.module}>
            <div className="module-head">
              <h3>{module.module}</h3>
              <span className="badge">{module.phase}</span>
            </div>
            <p className="muted">Delivered</p>
            <ul>
              {module.delivered.map((item) => (
                <li key={item}>✅ {item}</li>
              ))}
            </ul>
            <p className="muted">Left to do</p>
            <ul>
              {module.leftToDo.map((item) => (
                <li key={item}>⬜ {item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <section className="milestones">
        <h3>Execution milestones</h3>
        <div className="grid">
          {frontendMilestones.map((m) => (
            <article className="card" key={m.name}>
              <h4>{m.name}</h4>
              <p className="muted">Target: {m.target}</p>
              <ul>
                {m.scope.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
