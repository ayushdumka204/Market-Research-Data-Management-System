import { Inbox } from "lucide-react";
export default function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="empty-state">
      <Inbox size={25} />
      <b>{title}</b>
      <span>{description}</span>
    </div>
  );
}
