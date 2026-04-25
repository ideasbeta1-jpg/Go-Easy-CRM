import { redirect } from 'next/navigation';

export default async function ShortQuoteRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/cotizacion/${id}`);
}
