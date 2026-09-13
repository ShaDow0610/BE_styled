const shimmer = "animate-pulse bg-silver-soft/60 rounded";

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`${shimmer} ${className}`} />;
}

export function SkeletonStatCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow p-6 space-y-3">
          <SkeletonBlock className="h-3 w-24" />
          <SkeletonBlock className="h-7 w-16" />
        </div>
      ))}
    </div>
  );
}

/** Squelette de tableau : imite les colonnes/lignes réelles pour que
 * l'utilisateur reconnaisse la mise en page avant même que les données
 * arrivent (perçu plus rapide qu'un simple spinner, à temps identique). */
export function SkeletonTable({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-silver-soft">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="py-3 px-4">
                <SkeletonBlock className="h-3 w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="border-b border-silver-soft/50">
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} className="py-3 px-4">
                  <SkeletonBlock className="h-4 w-full max-w-[8rem]" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SkeletonCards({ count = 6 }: { count?: number }) {
  return (
    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow overflow-hidden">
          <SkeletonBlock className="h-40 w-full rounded-none" />
          <div className="p-4 space-y-2">
            <SkeletonBlock className="h-4 w-3/4" />
            <SkeletonBlock className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Panneau générique (formulaire, détail) — quelques lignes de texte factices. */
export function SkeletonPanel({ lines = 4 }: { lines?: number }) {
  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock key={i} className={`h-4 ${i % 2 === 0 ? "w-2/3" : "w-1/3"}`} />
      ))}
    </div>
  );
}

/** Colonnes façon kanban (utilisé par la page Commandes). */
export function SkeletonKanban({ columns = 6 }: { columns?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {Array.from({ length: columns }).map((_, i) => (
        <div key={i} className="rounded-lg p-3 bg-ivory-soft space-y-2">
          <SkeletonBlock className="h-3 w-20 mb-2" />
          <SkeletonBlock className="h-16 w-full" />
          <SkeletonBlock className="h-16 w-full" />
        </div>
      ))}
    </div>
  );
}
