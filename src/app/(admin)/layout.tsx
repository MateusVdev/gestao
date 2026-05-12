import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/lib/auth";
import { getNotifications, getSettings } from "@/lib/repository";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [notifications, settings] = await Promise.all([
    getNotifications(),
    getSettings(),
  ]);

  return (
    <AppShell notifications={notifications} settings={settings} user={user}>
      {children}
    </AppShell>
  );
}
