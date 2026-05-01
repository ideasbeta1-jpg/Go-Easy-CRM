'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Send, Trash2, FileText } from 'lucide-react'
import type { LeadNote } from '@/lib/leads/types'

interface Props {
  notes: LeadNote[]
  notesError?: any
  newNote: string
  isAdding: boolean
  activeVoucher?: any
  onChange: (value: string) => void
  onAdd: () => void
  onDelete: (id: string) => void
}

export function NotesPanel({ notes, notesError, newNote, isAdding, activeVoucher, onChange, onAdd, onDelete }: Props) {
  return (
    <div className="pt-6 mt-6 border-t border-slate-100 flex flex-col h-[350px]">
      <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] pl-1 mb-4">Notas Internas del Agente</p>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide mb-4">
        {notesError ? (
          <div className="bg-red-50/50 rounded-2xl p-4 border border-red-100 flex flex-col items-center justify-center h-full">
            <p className="text-xs font-black text-red-500">Error cargando notas</p>
          </div>
        ) : notes?.length === 0 ? (
          <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-100/50 flex items-center justify-center h-full">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center py-4">Sin notas registradas</p>
          </div>
        ) : (
          notes.map((note) => {
            const isVoucherNote = note.content?.includes('[VOUCHER_GENERATED]')
            return (
              <div key={note.id} className={`${isVoucherNote ? 'bg-indigo-50/50 border-indigo-100/50' : 'bg-amber-50/50 border-amber-100/50'} rounded-2xl p-4 border group relative`}>
                <div className="flex flex-col gap-3">
                  <p className={`text-sm ${isVoucherNote ? 'font-black text-indigo-900' : 'font-medium text-slate-700'} whitespace-pre-wrap leading-relaxed pr-6`}>
                    {isVoucherNote ? note.content.replace('[VOUCHER_GENERATED] ', '') : note.content}
                  </p>
                  {isVoucherNote && activeVoucher && (
                    <Link
                      href={`/voucher/${activeVoucher.id}`}
                      target="_blank"
                      className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all self-start shadow-lg shadow-indigo-600/20"
                    >
                      <FileText className="w-3 h-3" /> Ver Voucher Oficial
                    </Link>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100/30">
                  <div className="flex items-center gap-2">
                    {note.profiles?.avatar_url ? (
                      <img src={note.profiles.avatar_url} alt="" className="w-4 h-4 rounded-full object-cover" />
                    ) : (
                      <div className={`w-4 h-4 ${isVoucherNote ? 'bg-indigo-200 text-indigo-800' : 'bg-amber-200 text-amber-800'} rounded-full flex items-center justify-center text-[8px] font-bold`}>
                        {note.profiles?.full_name?.[0] ?? '?'}
                      </div>
                    )}
                    <span className={`text-[9px] font-bold uppercase tracking-wider ${isVoucherNote ? 'text-indigo-700' : 'text-amber-700'}`}>
                      {note.profiles?.full_name || 'Sistema'}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 capitalize">
                      • {format(new Date(note.created_at), 'h:mm a · MMM d', { locale: es })}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onDelete(note.id)}
                  className="absolute top-4 right-4 text-slate-900/10 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  title="Eliminar nota"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )
          })
        )}
      </div>

      <div className="flex items-end gap-2 shrink-0">
        <textarea
          value={newNote}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onAdd() }
          }}
          placeholder="Escribe una nota rápida..."
          className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm font-medium outline-none resize-none min-h-[44px] max-h-[120px] focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-400"
          rows={1}
        />
        <button
          onClick={onAdd}
          disabled={!newNote.trim() || isAdding}
          className="w-11 h-[44px] shrink-0 bg-primary hover:bg-primary/90 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl flex items-center justify-center transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
