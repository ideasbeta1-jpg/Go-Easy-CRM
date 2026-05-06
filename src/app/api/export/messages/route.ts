import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const PIPELINE_LABELS: Record<string, string> = {
  lead_nuevo: 'Lead Nuevo',
  en_cotizacion: 'En Cotización',
  reserva_confirmada: 'Reserva Confirmada',
  voucher_enviado: 'Voucher Enviado',
  cerrado_ganado: 'Cerrado Ganado',
  cerrado_perdido: 'Cerrado Perdido',
}

function escapeCSV(value: string | null | undefined): string {
  if (value == null) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('es-MX', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  })
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const direction = searchParams.get('direction') // 'inbound' | 'outbound' | null

  let query = supabase
    .from('messages')
    .select(`
      id,
      content,
      direction,
      media_url,
      media_type,
      status,
      is_read,
      created_at,
      lead:leads (
        id,
        full_name,
        phone,
        status
      )
    `)
    .order('created_at', { ascending: true })

  if (from) query = query.gte('created_at', new Date(from).toISOString())
  if (to) {
    const toDate = new Date(to)
    toDate.setHours(23, 59, 59, 999)
    query = query.lte('created_at', toDate.toISOString())
  }
  if (direction && (direction === 'inbound' || direction === 'outbound')) {
    query = query.eq('direction', direction)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const headers = [
    'Fecha',
    'Cliente',
    'Teléfono',
    'Dirección',
    'Mensaje',
    'Estado',
    'Tipo Media',
    'URL Media',
    'Leído',
    'Etapa Pipeline',
  ]

  const rows = (data ?? []).map((msg: any) => {
    const lead = Array.isArray(msg.lead) ? msg.lead[0] : msg.lead
    return [
      escapeCSV(formatDate(msg.created_at)),
      escapeCSV(lead?.full_name),
      escapeCSV(lead?.phone),
      escapeCSV(msg.direction === 'inbound' ? 'Recibido' : 'Enviado'),
      escapeCSV(msg.content),
      escapeCSV(msg.status),
      escapeCSV(msg.media_type),
      escapeCSV(msg.media_url),
      escapeCSV(msg.is_read ? 'Sí' : 'No'),
      escapeCSV(PIPELINE_LABELS[lead?.status] ?? lead?.status),
    ].join(',')
  })

  const bom = '﻿'
  const csv = bom + [headers.join(','), ...rows].join('\r\n')

  const dateStr = new Date().toISOString().slice(0, 10)
  const filename = `historial_whatsapp_${dateStr}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
