import { redirect } from 'next/navigation';

export default async function ShortQuoteRedirect({ params }: { params: { id: string } }) {
  const { id } = await params;
  redirect(`/cotizacion/${id}`);
}
