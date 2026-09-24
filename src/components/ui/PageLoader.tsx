import { KishanSevaLogo } from '@/components/brand/KishanSevaLogo';

export default function PageLoader() {
  return (
    <div className="flex h-screen w-full bg-slate-50 items-center justify-center overflow-hidden">
      <div className="flex flex-col items-center justify-center">
        <KishanSevaLogo size="xl" animated={true} />
        <p className="text-emerald-700/60 font-semibold text-sm mt-6 tracking-widest uppercase">Loading...</p>
      </div>
    </div>
  );
}
