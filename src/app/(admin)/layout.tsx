import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/lib/auth";
import { getDataset } from "@/lib/repository";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const dataset = await getDataset();

  return (
    <AppShell notifications={dataset.notifications} settings={dataset.companySettings} user={user}>
      {children}
    </AppShell>
  );
}
