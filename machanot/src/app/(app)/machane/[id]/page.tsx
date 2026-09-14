import { redirect } from "next/navigation";

export default async function PaginaMachane({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/machane/${id}/parametros`);
}
