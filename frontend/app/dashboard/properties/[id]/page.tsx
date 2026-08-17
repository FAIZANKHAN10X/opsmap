import { PropertyDetailsPage } from "@/features/properties/PropertyDetailsPage";

type PropertyPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PropertyPage({ params }: PropertyPageProps) {
  const { id } = await params;
  return <PropertyDetailsPage assetId={id} />;
}