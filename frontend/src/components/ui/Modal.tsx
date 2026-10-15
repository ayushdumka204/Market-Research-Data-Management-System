import type { FormEvent, ReactNode } from "react";
import { X } from "lucide-react";
export default function Modal({
  title,
  eyebrow,
  children,
  onClose,
  onSubmit,
  submitLabel = "Save",
  busy = false,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  submitLabel?: string;
  busy?: boolean;
}) {
  return (
    <div className="modal-backdrop">
      <form className="modal-card" onSubmit={onSubmit}>
        <div className="modal-heading">
          <div>
            <p className="eyebrow">{eyebrow || "WORKSPACE"}</p>
            <h2>{title}</h2>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? "Saving…" : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
