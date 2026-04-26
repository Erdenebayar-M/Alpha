export default function Loading() {
  return (
    <div className="flex-1 flex items-center justify-center" role="status" aria-live="polite">
      <span className="sr-only">Ачаалж байна…</span>
      <div className="animate-pulse text-lg">Ачаалж байна…</div>
    </div>
  );
}
