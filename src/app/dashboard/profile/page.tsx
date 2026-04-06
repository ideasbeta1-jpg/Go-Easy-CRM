import { getProfile } from './actions'
import ProfileClient from './ProfileClient'
import { redirect } from 'next/navigation'

export default async function ProfilePage() {
  const profile = await getProfile()

  if (!profile) {
    redirect('/login')
  }

  return <ProfileClient initialProfile={profile} />
}
