import Link from "next/link";
import { AdminPageTitle } from "@/components/admin/page-title";
import { ShipmentForm } from "@/components/admin/shipment-form";
import { Card } from "@/components/ui/card";
import { createShipment } from "@/server/actions/admin-shipments";
import { configuredProviders } from "@/server/carriers/registry";
import { requireStaffPage } from "@/lib/authz";

export const metadata = { title: "New shipment" };

export default async function NewShipmentPage() {
  await requireStaffPage();
  return (
    <>
      <Link href="/admin/shipments" className="text-sm text-muted hover:text-navy-900 hover:underline">← Shipments</Link>
      <AdminPageTitle title="New shipment" description="Track a parcel live from its carrier, or record one your business handles yourself." />
      <Card className="max-w-4xl p-5 sm:p-6">
        <ShipmentForm action={createShipment} mode="create" configuredProviders={configuredProviders()} />
      </Card>
    </>
  );
}
