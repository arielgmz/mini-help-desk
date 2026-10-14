import type { Metadata } from "next";
import { AdminApp } from "@/components/admin/AdminApp";

export const metadata: Metadata = { title: "Administración" };

export default function AdminPage() {
  return <AdminApp />;
}
