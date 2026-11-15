import { getPasswordCriteria } from "@portal-inmobiliario/contracts/auth";

export function PasswordCriteria({ password, id }: { password: string; id: string }) {
  const criteria = getPasswordCriteria(password);
  return (
    <div id={id} className="mt-2 text-xs leading-6">
      <ul aria-label="Critérios da senha" className="space-y-1">
        {criteria.map(({ id, label, met }) => (
          <li key={id} data-criterion={id} data-met={met} className={met ? "text-emerald-800" : "text-slate-600"}>
            <span aria-hidden="true" className="mr-2">{met ? "✓" : "○"}</span>
            <span className="sr-only">{met ? "Atendido: " : "Pendente: "}</span>{label}
          </li>
        ))}
      </ul>
      <p role="status" className="sr-only">{criteria.filter((criterion) => criterion.met).length} de {criteria.length} critérios atendidos.</p>
    </div>
  );
}

export function PasswordMatch({ password, confirmation, id }: { password: string; confirmation: string; id: string }) {
  const matches = confirmation.length > 0 && password === confirmation;
  return (
    <p id={id} role="status" className={`mt-2 text-xs leading-6 ${matches ? "text-emerald-800" : "text-slate-600"}`}>
      {confirmation ? <><span aria-hidden="true">{matches ? "✓ " : "○ "}</span>{matches ? "As senhas são iguais." : "As senhas ainda não são iguais."}</> : null}
    </p>
  );
}
