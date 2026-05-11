import { CooperativeNameLabel } from "@/components/settings-context";
import { cn } from "@/lib/format";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm uppercase tracking-[0.18em] text-teal-200">
          <CooperativeNameLabel />
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal text-white sm:text-3xl">
          {title}
        </h1>
        {description ? <p className="mt-2 max-w-3xl text-sm text-zinc-400">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Section({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("app-surface min-w-0 rounded-[8px] p-4 sm:p-5", className)}>
      {children}
    </section>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[8px] border border-dashed border-white/15 px-4 py-10 text-center text-sm text-zinc-500">
      {children}
    </div>
  );
}
