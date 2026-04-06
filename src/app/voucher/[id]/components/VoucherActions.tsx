'use client'

import { Printer, Download } from 'lucide-react'

export function VoucherActions() {
  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    // For now, since it's formatted for print, we can use print to save as PDF
    // In a more advanced scenario, we could use jspdf/html2canvas, but print is very reliable for high-quality layouts
    window.print()
  }

  return (
    <div className="flex items-center gap-3 no-print">
      <button 
        onClick={handlePrint}
        className="bg-white text-slate-700 font-black text-xs uppercase tracking-widest px-6 py-3 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2 cursor-pointer group"
      >
        <Printer className="w-4 h-4 group-hover:scale-110 transition-transform" /> Imprimir
      </button>
      <button 
        onClick={handleDownload}
        className="bg-slate-900 text-white font-black text-xs uppercase tracking-widest px-6 py-3 rounded-2xl shadow-xl shadow-slate-900/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer group"
      >
        <Download className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" /> Descargar PDF
      </button>
    </div>
  )
}
