'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { exportLeadsToCsv } from '../actions'

export function ExportLeadsButton() {
  const [isLoading, setIsLoading] = useState(false)

  async function handleExport() {
    if (isLoading) return
    setIsLoading(true)
    try {
      const { csv } = await exportLeadsToCsv()
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const today = new Date().toISOString().slice(0, 10)
      const a = document.createElement('a')
      a.href = url
      a.download = `leads-${today}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('[ExportLeadsButton] Error al exportar CSV:', err)
      alert('No se pudo exportar el CSV. Inténtalo de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={isLoading}
      title="Descargar leads en CSV"
      className="flex items-center gap-2 px-3 md:px-4 py-2.5 md:py-3 transition-all font-bold text-sm rounded-full border text-slate-500 hover:text-primary hover:bg-slate-50/80 border-transparent hover:border-slate-200/60 shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" />
      ) : (
        <Download className="w-3.5 h-3.5 md:w-4 md:h-4" />
      )}
      <span className="hidden sm:inline">CSV</span>
    </button>
  )
}
