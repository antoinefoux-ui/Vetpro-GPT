import { useParams } from "react-router-dom";

const moduleNotes: Record<string, string[]> = {
  Marketing: [
    "Newsletter campaign builder",
    "Client segmentation",
    "Automated lifecycle sequences",
    "Review request automation"
  ],
  "After-Hours AI": [
    "Call transcript inbox",
    "Emergency triage review",
    "On-call transfer logs",
    "AI prompt administration"
  ]
};

export function ModulePage() {
  const { name = "Module" } = useParams();
  const notes = moduleNotes[name] ?? ["Module backlog to be defined"];

  return (
    <section>
      <h2>{name}</h2>
      <div className="card">
        <p>This module is still in planning detail and will be implemented after current critical paths.</p>
        <ul>
          {notes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
