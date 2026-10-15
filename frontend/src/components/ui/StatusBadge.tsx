export default function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase().replaceAll("_", "-");
  return (
    <span className={`status status-${key}`}>
      <i />
      {status.replaceAll("_", " ")}
    </span>
  );
}
