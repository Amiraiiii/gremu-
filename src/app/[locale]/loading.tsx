export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="bg-brand h-72 md:h-80" />
      <div className="wrap grid grid-cols-1 gap-4 py-10 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="rounded-[22px] bg-paper p-3 ring-1 ring-line">
            <div className="aspect-[4/3] animate-pulse rounded-[18px] bg-paper-2" />
            <div className="mt-4 h-5 w-3/4 animate-pulse rounded bg-paper-2" />
            <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-paper-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
