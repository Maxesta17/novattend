/**
 * Skeleton de carga para DashboardPage.
 * Muestra placeholders animados mientras se obtienen los datos.
 */
export default function DashboardSkeleton() {
  return (
    <div className="min-h-dvh min-h-screen w-full max-w-[430px] mx-auto bg-off-white box-border">
      <div className="bg-burgundy-dark rounded-b-3xl px-4 pt-4 pb-3 animate-pulse">
        <div className="flex items-center gap-3 mb-3">
          <div className="size-[42px] rounded-xl bg-white/10" />
          <div className="space-y-2">
            <div className="h-4 w-24 bg-white/10 rounded" />
            <div className="h-3 w-32 bg-white/10 rounded" />
          </div>
        </div>
        <div className="flex gap-1.5 mb-3">
          <div className="flex-1 h-16 rounded-xl bg-white/[0.06]" />
          <div className="flex-1 h-16 rounded-xl bg-white/[0.06]" />
          <div className="flex-1 h-16 rounded-xl bg-white/[0.06]" />
        </div>
      </div>
      <div className="px-4 pt-4 space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="bg-white border border-border rounded-xl p-3 flex items-center gap-3 animate-pulse"
          >
            <div className="size-[38px] rounded-[9px] bg-border-light" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 bg-border-light rounded w-1/2" />
              <div className="h-3 bg-border-light rounded w-1/3" />
            </div>
            <div className="h-5 w-10 bg-border-light rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
