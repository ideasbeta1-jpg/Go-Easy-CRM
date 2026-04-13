import { redirect } from 'next/navigation';

export default async function ShortVoucherRedirect({ params }: { params: { id: string } }) {
  const { id } = await params;
  redirect(`/voucher/${id}`);
}
