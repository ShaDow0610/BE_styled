export default function BoutiqueLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="relative w-24 h-24 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-2 border-silver-soft border-t-ink animate-ring-spin" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/icon-black.png" alt="Be Styled" className="h-11 w-11 animate-logo-pulse" />
      </div>
    </div>
  );
}
