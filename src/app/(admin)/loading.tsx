import { Section } from "@/components/page";

export default function AdminLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-3 px-1">
        <div className="h-3 w-32 rounded bg-teal-300/20" />
        <div className="h-9 w-72 rounded bg-white/10" />
        <div className="h-4 w-full max-w-xl rounded bg-white/5" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Section key={i}>
            <div className="flex items-center justify-between gap-4">
              <div className="h-4 w-24 rounded bg-white/5" />
              <div className="h-8 w-8 rounded bg-white/10" />
            </div>
            <div className="mt-4 h-8 w-32 rounded bg-white/10" />
          </Section>
        ))}
      </div>

      <Section>
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div className="h-6 w-48 rounded bg-white/10" />
            <div className="h-10 w-32 rounded bg-white/10" />
          </div>
          
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-12 w-full rounded bg-white/5" />
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
}
