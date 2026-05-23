'use client'

import { Printer, Download, Loader2 } from 'lucide-react'
import { useState } from 'react'
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

      // Dynamically import to avoid SSR issues
      const html2canvas = (await import('html2canvas')).default

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 15000,
        onclone: (clonedDoc) => {
          // Ensure images in the cloned doc are loaded
          const imgs = clonedDoc.querySelectorAll('img')
          imgs.forEach((img: HTMLImageElement) => {
            img.crossOrigin = 'anonymous'
          })
        },
      })

      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: 'a4',
      })

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()

      const ratio = pdfWidth / canvas.width
      const scaledTotalHeight = canvas.height * ratio
      const imgData = canvas.toDataURL('image/jpeg', 0.92)

      let currentY = 0
      let page = 0

      while (currentY < scaledTotalHeight) {
        if (page > 0) pdf.addPage()
        pdf.addImage(imgData, 'JPEG', 0, -currentY, pdfWidth, scaledTotalHeight)
        currentY += pdfHeight
        page++
      }

      pdf.save(`voucher-${voucherNumber}.pdf`)
    } catch (error) {
      console.error('[VoucherPDF] Error:', error)
      // Fallback: open print dialog so user can Save as PDF
      window.print()
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="flex items-center gap-3 no-print">
      <button
        onClick={handlePrint}
        className="bg-white text-slate-700 font-semibold text-xs uppercase tracking-widest px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer"
      >
        <Printer className="w-4 h-4" /> Imprimir
      </button>
      <button
        onClick={handleDownload}
        disabled={isDownloading}
        className="bg-slate-900 text-white font-semibold text-xs uppercase tracking-widest px-5 py-2.5 rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap"
      >
        {isDownloading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Generando...
          </>
        ) : (
          <>
            <Download className="w-4 h-4" /> Descargar PDF
          </>
        )}
      </button>
    </div>
  )
}
