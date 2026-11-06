import { redirect } from "next/navigation";
import { getRouteContext } from "@/lib/api/context";
import DashboardLayoutClient from "@/components/dashboard/DashboardLayoutClient";
export const dynamic = "force-dynamic";
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  try { await getRouteContext(); } catch { redirect("/login"); }
  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
