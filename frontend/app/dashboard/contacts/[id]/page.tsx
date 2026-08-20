import { ContactDetailPage } from "@/features/contacts/ContactDetailPage";

export default async function ContactDetailRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ContactDetailPage contactId={id} />;
}