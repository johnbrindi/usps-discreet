import Link from "next/link";
import { AdminPageTitle } from "@/components/admin/page-title";
import { ShipmentForm } from "@/components/admin/shipment-form";
import { Card } from "@/components/ui/card";
import { createShipment } from "@/server/actions/admin-shipments";

export const metadata = { title: "New shipment" };

export default function NewShipmentPage() {
  return (
    <>
      <Link href="/admin/shipments" className="text-sm text-muted hover:text-navy-900 hover:underline">← Shipments</Link>
      <AdminPageTitle title="New shipment" description="Record a parcel your business is handling. Events are added on the next screen." />
      <Card className="max-w-4xl p-5 sm:p-6">
        <ShipmentForm action={createShipment} mode="create" />
      </Card>
    </>
  );
}
