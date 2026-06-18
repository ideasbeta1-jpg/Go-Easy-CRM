import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, Phone, User, Calendar } from 'lucide-react'
import { STATUS_CONFIG } from '@/lib/leads/transitions'

function fmtDate(value: string | null) {
  if (!value) return 'Sin fecha'
  try {
    return new Date(value).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return 'Sin fecha'
  }
}

export default async function ContactDetailPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await paramsPromise
  const supabase = await createClient()

  const { data: contact, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !contact) return notFound()

  const [{ data: reservations }, { data: agent }] = await Promise.all([
    supabase
      .from('leads')
      .select('id, status, pickup_date, return_date, total_amount, created_at, category:categories(name)')
      .eq('contact_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    contact.assigned_to
      ? supabase.from('profiles').select('full_name, first_name, last_name').eq('id', contact.assigned_to).single()
      : Promise.resolve({ data: null }),
  ])

  const fullName = `${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim() || 'Cliente'
  const agentName = agent
    ? agent.full_name || `${agent.first_name ?? ''} ${agent.last_name ?? ''}`.trim()
    : null
  const list = reservations || []
  const totalWon = list
    .filter((r: any) => r.status === 'cerrado_ganado')
    .reduce((sum: number, r: any) => sum + (Number(r.total_amount) || 0), 0)
  const initials =
    fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w: string) => w[0]?.toUpperCase())
      .join('') || '?'

  return (
    <div className="mx-auto max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Link
        href="/dashboard/contactos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a Contactos
      </Link>

      {/* Ficha del contacto */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary text-lg font-black shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-slate-900">{fullName}</h1>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
              {contact.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> {contact.phone}
                </span>
              )}
              {contact.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> {contact.email}
                </span>
              )}
            </div>
            {agentName && <p className="mt-2 text-xs text-slate-400">Asesor asignado: {agentName}</p>}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-slate-50 p-3 text-center">
            <p className="text-2xl font-black text-slate-900 tracking-tight">{list.length}</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Reservas</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-center">
            <p className="text-2xl font-black text-emerald-600 tracking-tight">${Math.round(totalWon).toLocaleString('es-ES')}</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Ganado</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-center">
            <p className="text-base font-black text-slate-900 tracking-tight pt-1.5">{fmtDate(contact.created_at)}</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Cliente desde</p>
          </div>
        </div>
      </div>

      {/* Reservas del contacto */}
      <div className="mt-6">
        <h2 className="mb-3 text-[11px] font-black text-slate-400 uppercase tracking-widest">
          Reservas de este cliente
        </h2>
        <div className="space-y-2">
          {list.length === 0 && (
            <p className="text-sm text-slate-400">Este contacto no tiene reservas activas.</p>
          )}
          {list.map((r: any) => {
            const cfg = STATUS_CONFIG[r.status]
            return (
              <Link
                key={r.id}
                href={`/dashboard/leads/${r.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-primary/40 hover:shadow"
              >
                <div className="flex items-center gap-3">
                  <span className={`h-2.5 w-2.5 rounded-full ${cfg?.color ?? 'bg-slate-400'}`} />
                  <div>
                    <p className="text-sm font-bold text-slate-800">{cfg?.label ?? r.status}</p>
                    <p className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Calendar className="h-3 w-3" /> {fmtDate(r.pickup_date)}
                      {r.category?.name ? ` · ${r.category.name}` : ''}
                    </p>
                  </div>
                </div>
                {r.total_amount ? (
                  <span className="text-sm font-black text-emerald-600">${Math.round(Number(r.total_amount)).toLocaleString('es-ES')}</span>
                ) : null}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
