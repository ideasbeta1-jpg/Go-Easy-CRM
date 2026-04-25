import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import UserManagementClient from './components/UserManagementClient'

export const metadata = {
  title: 'Gestor de Usuarios | Go Easy CRM',
  description: 'Administra los roles, accesos y permisos de todos los miembros del equipo.',
}

export default async function UsersSettingsPage() {
  const adminClient = createAdminClient()
  const supabase = await createClient()

  // Verify the current user is an admin before letting them see this page
  // (In a real scenario, you'd check this via RLS or explicit queries, but let's do a fast verification here)
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    const { data: currentProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (currentProfile?.role !== 'admin') {
      return (
        <div className="max-w-[1200px] mx-auto py-10 px-4 sm:px-6 lg:px-8 text-center animate-in fade-in zoom-in duration-500">
            <div className="bg-rose-50 border border-rose-100 rounded-[2rem] p-12 shadow-xl">
                <span className="material-symbols-outlined text-rose-500 text-6xl mb-4 block">lock</span>
                <h1 className="text-3xl font-black text-rose-900 tracking-tight">Acceso Denegado</h1>
                <p className="mt-2 text-rose-600 font-medium">No tienes los privilegios de administrador necesarios para ver esta página.</p>
            </div>
        </div>
      )
    }
  }

  // Use Admin API to list all users
  const { data: { users }, error: authError } = await adminClient.auth.admin.listUsers()

  if (authError) {
    console.error('Error fetching users via Admin API', authError)
  }

  // Fetch Public Profiles to get avatars and other metadata synced by triggers
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, is_active, avatar_url, first_name, last_name, role, zadarma_sip')

  if (profileError) {
    console.error('Error fetching profiles', profileError)
  }

  // Merge the data
  const mergedUsers = users?.map(u => {
    const p = profiles?.find(prof => prof.id === u.id)
    return {
      id: u.id,
      email: u.email || '',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at || null,
      first_name: p?.first_name || u.user_metadata?.first_name || '',
      last_name: p?.last_name || u.user_metadata?.last_name || '',
      role: p?.role || u.user_metadata?.role || 'agente',
      avatar_url: p?.avatar_url || null,
      is_active: p?.is_active || false,
      zadarma_sip: p?.zadarma_sip || null,
    }
  }) || []

  return (
    <div className="max-w-[1200px] mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <UserManagementClient users={mergedUsers} />
    </div>
  )
}
