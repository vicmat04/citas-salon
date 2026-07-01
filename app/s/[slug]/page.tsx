import { redirect } from 'next/navigation'

export default function SalonIndexPage({ params }: { params: { slug: string } }) {
  redirect(`/s/${params.slug}/dashboard`)
}
