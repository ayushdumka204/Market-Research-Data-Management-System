import { AlertCircle, CheckCircle2, X } from "lucide-react";
export default function Toast({
  message,
  onClose,
}: {
  message: { text: string; kind: "success" | "error" } | null;
  onClose: () => void;
}) {
  if (!message) return null;
  const Icon = message.kind === "success" ? CheckCircle2 : AlertCircle;
  return (
    <div className={`toast ${message.kind}`}>
      <Icon size={17} />
      <span>{message.text}</span>
      <button onClick={onClose} aria-label="Dismiss">
        <X size={15} />
      </button>
    </div>
  );
}
