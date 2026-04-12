'use client'

import { Printer, Download, Loader2 } from 'lucide-react'
import { useState } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

interface VoucherActionsProps {
  voucherNumber: string
}

export function VoucherActions({ voucherNumber }: VoucherActionsProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = async () => {
    try {
      setIsDownloading(true)
      const element = document.getElementById('voucher-document')
      if (!element) return

      // Pre-capture layout adjustment
      const canvas = await html2canvas(element, {
        scale: 2, // High resolution
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: 'a4',
      })

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      
      const imgWidth = canvas.width
      const imgHeight = canvas.height
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight)
      
      const targetWidth = imgWidth * ratio
      const targetHeight = imgHeight * ratio
      
      const offsetX = (pdfWidth - targetWidth) / 2
      const offsetY = (pdfHeight - targetHeight) / 2

      pdf.addImage(imgData, 'PNG', offsetX, offsetY, targetWidth, targetHeight)
      pdf.save(`voucher-${voucherNumber}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert("Hubo un error al generar el PDF. Por favor intenta Imprimir y 'Guardar como PDF'.")
    } finally {
      setIsDownloading(false)
    }
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
        disabled={isDownloading}
        className="bg-slate-900 text-white font-black text-xs uppercase tracking-widest px-6 py-3 rounded-2xl shadow-xl shadow-slate-900/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center gap-2 cursor-pointer group whitespace-nowrap"
      >
        {isDownloading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" /> Generando...
          </>
        ) : (
          <>
            <Download className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" /> Descargar PDF
          </>
        )}
      </button>
    </div>
  )
}
