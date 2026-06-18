import { createClient } from '@/utils/supabase/server'
import ContactsDirectoryClient, { type ContactRow } from './components/ContactsDirectoryClient'

export const metadata = {
  title: 'Contactos | Go Easy CRM',
  description: 'Directorio de clientes con su historial de reservas y valor de vida.',
}

type ContactRecord = {
  id: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  email: string | null
  created_at: string
  assigned_to: string | null
}

type LeadRecord = {
  contact_id: string | null
  status: string
  total_amount: number | null
  created_at: string
}

export default async function ContactsDirectoryPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).single()
    : { data: null }
  const isAdmin = !profile || profile.role === 'admin'

  // Alcance: admin ve todos los contactos; el agente, solo los suyos.
  let contactsQuery = supabase
    .from('contacts')
    .select('id, first_name, last_name, phone, email, created_at, assigned_to')
    .is('deleted_at', null)
  if (!isAdmin && user) contactsQuery = contactsQuery.eq('assigned_to', user.id)

  const { data: contacts } = await contactsQuery
  const contactList = (contacts || []) as ContactRecord[]
  const contactIds = contactList.map((c) => c.id)

  // Reservas de esos contactos para agregar métricas (recurrencia + LTV).
  let leads: LeadRecord[] = []
  if (contactIds.length > 0) {
    const { data: leadsData } = await supabase
      .from('leads')
      .select('contact_id, status, total_amount, created_at')
      .is('deleted_at', null)
      .in('contact_id', contactIds)
    leads = (leadsData || []) as LeadRecord[]
  }

  const stats = new Map<string, { count: number; won: number; ltv: number; last: string }>()
  for (const l of leads) {
    if (!l.contact_id) continue
    const s = stats.get(l.contact_id) || { count: 0, won: 0, ltv: 0, last: '' }
    s.count++
    if (l.status === 'cerrado_ganado') {
      s.won++
      s.ltv += Number(l.total_amount) || 0
    }
    if (!s.last || l.created_at > s.last) s.last = l.created_at
    stats.set(l.contact_id, s)
  }

  const rows: ContactRow[] = contactList
    .map((c) => {
      const s = stats.get(c.id) || { count: 0, won: 0, ltv: 0, last: c.created_at }
      return {
        id: c.id,
        name: `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || 'Cliente',
        phone: c.phone,
        email: c.email,
        reservations: s.count,
        won: s.won,
        ltv: s.ltv,
        lastActivity: s.last || c.created_at,
      }
    })
    .sort((a, b) => b.ltv - a.ltv || b.reservations - a.reservations)

  return <ContactsDirectoryClient rows={rows} />
}
