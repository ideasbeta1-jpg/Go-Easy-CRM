import Link from 'next/link'
import { User, Calendar } from 'lucide-react'
import { STATUS_CONFIG } from '@/lib/leads/transitions'

type SiblingLead = {
  id: string
  status: string
  pickup_date: string | null
  total_amount: number | null
  created_at: string
}

type ContactInfo = {
  id: string
  first_name: string | null
  last_name: string | null
}

function fmtDate(value: string | null) {
  if (!value) return 'Sin fecha'
  try {
    return new Date(value).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return 'Sin fecha'
  }
}

/**
 * Banner que enlaza la reserva actual con el resto de reservas del mismo contacto
 * (historial unificado del cliente). No se muestra si el contacto solo tiene esta reserva.
 */
export default function ContactReservationsBanner({
  contact,
  siblings,
}: {
  contact: ContactInfo | null
  siblings: SiblingLead[]
}) {
  if (!contact || siblings.length === 0) return null

  const fullName = `${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim() || 'Cliente'

  return (
    <div className="mb-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-bold text-indigo-900">
          <User className="h-4 w-4" />
          <span>
            {fullName} tiene {siblings.length} {siblings.length === 1 ? 'otra reserva' : 'otras reservas'}
          </span>
        </div>
        <Link
          href={`/dashboard/contactos/${contact.id}`}
          className="text-xs font-black text-indigo-600 hover:underline shrink-0"
        >
          Ver ficha del cliente →
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {siblings.map((s) => {
          const cfg = STATUS_CONFIG[s.status]
          return (
            <Link
              key={s.id}
              href={`/dashboard/leads/${s.id}`}
              className="group flex items-center gap-2 rounded-lg border border-indigo-100 bg-white px-3 py-1.5 text-xs shadow-sm transition hover:border-indigo-300"
            >
              <span className={`h-2 w-2 rounded-full ${cfg?.color ?? 'bg-slate-400'}`} />
              <span className="font-bold text-slate-700">{cfg?.label ?? s.status}</span>
              <span className="flex items-center gap-1 text-slate-400">
                <Calendar className="h-3 w-3" />
                {fmtDate(s.pickup_date)}
              </span>
              {s.total_amount ? (
                <span className="font-black text-emerald-600">${Math.round(Number(s.total_amount)).toLocaleString('es-ES')}</span>
              ) : null}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
