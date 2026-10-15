import type { ReactNode } from "react";
export default function PageTitle({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <p className="eyebrow">NEXGEN MARKET RESEARCH</p>
        <h1>{title}</h1>
        <p className="subtitle">{description}</p>
      </div>
      <div className="page-actions">{actions}</div>
    </div>
  );
}
