'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Users, Repeat, DollarSign, Search, ArrowUpDown } from 'lucide-react'

export type ContactRow = {
  id: string
  name: string
  phone: string | null
  email: string | null
  reservations: number
  won: number
  ltv: number
  lastActivity: string
}

type SortKey = 'ltv' | 'reservations' | 'name' | 'lastActivity'

function fmtMoney(n: number) {
  return `$${Math.round(n).toLocaleString('es-ES')}`
}

function fmtRelative(iso: string) {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'
  const days = Math.floor((Date.now() - then) / 86_400_000)
  if (days <= 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  if (days < 30) return `Hace ${days} d`
  if (days < 365) return `Hace ${Math.floor(days / 30)} m`
  return `Hace ${Math.floor(days / 365)} a`
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

export default function ContactsDirectoryClient({ rows }: { rows: ContactRow[] }) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('ltv')

  const totalContacts = rows.length
  const recurrentes = rows.filter((r) => r.reservations > 1).length
  const totalLtv = rows.reduce((sum, r) => sum + r.ltv, 0)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = q
      ? rows.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            (r.phone || '').toLowerCase().includes(q) ||
            (r.email || '').toLowerCase().includes(q)
        )
      : rows.slice()

    base.sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'reservations':
          return b.reservations - a.reservations || b.ltv - a.ltv
        case 'lastActivity':
          return b.lastActivity.localeCompare(a.lastActivity)
        case 'ltv':
        default:
          return b.ltv - a.ltv || b.reservations - a.reservations
      }
    })
    return base
  }, [rows, query, sortKey])

  return (
    <div className="flex flex-col h-full gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Contactos</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {totalContacts} clientes · historial unificado de reservas
          </p>
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar nombre, teléfono o email…"
            className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
        <div className="bg-white rounded-2xl px-5 py-4 border border-slate-100 shadow-sm">
          <p className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
            <Users className="w-3.5 h-3.5" /> Total Contactos
          </p>
          <p className="text-2xl font-black text-slate-900 tracking-tight">{totalContacts}</p>
        </div>
        <div className="bg-white rounded-2xl px-5 py-4 border border-slate-100 shadow-sm">
          <p className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
            <Repeat className="w-3.5 h-3.5" /> Recurrentes (2+)
          </p>
          <p className="text-2xl font-black text-primary tracking-tight">{recurrentes}</p>
        </div>
        <div className="bg-white rounded-2xl px-5 py-4 border border-slate-100 shadow-sm">
          <p className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
            <DollarSign className="w-3.5 h-3.5" /> Valor Total Ganado
          </p>
          <p className="text-2xl font-black text-emerald-600 tracking-tight">{fmtMoney(totalLtv)}</p>
        </div>
      </div>

      {/* Tabla */}
      <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50/95 backdrop-blur text-left text-[10px] uppercase tracking-widest text-slate-400 font-black border-b border-slate-100">
              <tr>
                <th className="px-5 py-3">
                  <button onClick={() => setSortKey('name')} className="flex items-center gap-1 hover:text-slate-600">
                    Cliente {sortKey === 'name' && <ArrowUpDown className="w-3 h-3" />}
                  </button>
                </th>
                <th className="px-5 py-3">Contacto</th>
                <th className="px-5 py-3 text-center">
                  <button onClick={() => setSortKey('reservations')} className="inline-flex items-center gap-1 hover:text-slate-600">
                    Reservas {sortKey === 'reservations' && <ArrowUpDown className="w-3 h-3" />}
                  </button>
                </th>
                <th className="px-5 py-3 text-center">Ganadas</th>
                <th className="px-5 py-3">
                  <button onClick={() => setSortKey('lastActivity')} className="flex items-center gap-1 hover:text-slate-600">
                    Últ. actividad {sortKey === 'lastActivity' && <ArrowUpDown className="w-3 h-3" />}
                  </button>
                </th>
                <th className="px-5 py-3 text-right">
                  <button onClick={() => setSortKey('ltv')} className="inline-flex items-center gap-1 hover:text-slate-600">
                    LTV {sortKey === 'ltv' && <ArrowUpDown className="w-3 h-3" />}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    {query ? 'Ningún contacto coincide con la búsqueda.' : 'No hay contactos todavía.'}
                  </td>
                </tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-3">
                    <Link href={`/dashboard/contactos/${r.id}`} className="flex items-center gap-3 group">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-black shrink-0">
                        {initials(r.name) || '?'}
                      </span>
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-slate-800 group-hover:text-primary truncate">{r.name}</span>
                        {r.reservations > 1 && (
                          <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-indigo-600">
                            Recurrente
                          </span>
                        )}
                      </span>
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-slate-500">
                    <div className="leading-tight">
                      {r.phone && <div className="text-slate-700">{r.phone}</div>}
                      {r.email && <div className="text-xs text-slate-400 truncate max-w-[220px]">{r.email}</div>}
                      {!r.phone && !r.email && '—'}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center font-bold text-slate-700">{r.reservations}</td>
                  <td className="px-5 py-3 text-center text-slate-500">{r.won}</td>
                  <td className="px-5 py-3 text-slate-500">{fmtRelative(r.lastActivity)}</td>
                  <td className={`px-5 py-3 text-right font-black tracking-tight ${r.ltv > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>
                    {fmtMoney(r.ltv)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
