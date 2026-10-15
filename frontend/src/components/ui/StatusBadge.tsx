export default function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase().split("_").join("-");
  return (
    <span className={`status status-${key}`}>
      <i />
      {status.split("_").join(" ")}
    </span>
  );
}
