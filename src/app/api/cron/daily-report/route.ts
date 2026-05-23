import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '');
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();

    // 1. Obtener el periodo de reporte con corte a las 8:00 PM Colombia (01:00 UTC)
    const now = new Date();
    const endDate = new Date(now);
    endDate.setUTCHours(1, 0, 0, 0);

    // Si la hora actual en UTC es menor a la 1:00 AM UTC (es decir, antes de las 8:00 PM Col del mismo día),
    // el corte de "hoy" a las 8:00 PM aún no ha ocurrido. Queremos el periodo de 24h que cierra en el corte
    // más reciente en el pasado.
    if (now.getUTCHours() < 1) {
      endDate.setUTCDate(endDate.getUTCDate() - 1);
    }

    const startDate = new Date(endDate);
    startDate.setUTCDate(startDate.getUTCDate() - 1);

    const startDateStr = startDate.toISOString();
    const endDateStr = endDate.toISOString();

    // 2. Obtener leads creados en el periodo
    const { data: createdLeads, error: leadsError } = await supabase
      .from('leads')
      .select('id, first_name, last_name, source, total_amount')
      .gte('created_at', startDateStr)
      .lt('created_at', endDateStr)
      .is('deleted_at', null);

    if (leadsError) {
      throw new Error(`Error consultando leads: ${leadsError.message}`);
    }

    // 3. Obtener logs de pagos procesados hoy (reserva_confirmada)
    const { data: paymentLogs, error: logsError } = await supabase
      .from('automation_logs')
      .select('lead_id')
      .eq('stage', 'reserva_confirmada')
      .eq('channel', 'system')
      .eq('template_name', 'engine_complete')
      .eq('status', 'success')
      .gte('created_at', startDateStr)
      .lt('created_at', endDateStr);

    if (logsError) {
      throw new Error(`Error consultando logs de pago: ${logsError.message}`);
    }

    const paidLeadIds = [...new Set((paymentLogs || []).map((log: any) => log.lead_id))];

    let totalPaymentsAmount = 0;
    let paidLeadsCount = 0;
    const paidLeadsDetails: any[] = [];

    if (paidLeadIds.length > 0) {
      // Obtener detalles de los leads pagados y sus cotizaciones
      const { data: leadsWithQuotes, error: quotesError } = await supabase
        .from('leads')
        .select('id, first_name, last_name, total_amount, quotes(is_active, deposit_amount, total_amount)')
        .in('id', paidLeadIds);

      if (quotesError) {
        throw new Error(`Error consultando cotizaciones: ${quotesError.message}`);
      }

      if (leadsWithQuotes) {
        paidLeadsCount = leadsWithQuotes.length;

        for (const lead of leadsWithQuotes) {
          const activeQuote = lead.quotes.find((q: any) => q.is_active === true) || lead.quotes[0];
          let paidAmount = 0;

          if (activeQuote) {
            paidAmount = activeQuote.deposit_amount !== null ? Number(activeQuote.deposit_amount) : Number(activeQuote.total_amount || 0) * 0.2;
          } else {
            paidAmount = Number(lead.total_amount || 0) * 0.2;
          }

          totalPaymentsAmount += paidAmount;
          paidLeadsDetails.push({
            name: `${lead.first_name} ${lead.last_name || ''}`.trim(),
            amount: paidAmount,
            total: lead.total_amount
          });
        }
      }
    }

    // Formatear la etiqueta de la fecha en Colombia
    const todayLabel = endDate.toLocaleDateString('es-CO', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      timeZone: 'America/Bogota'
    });
    const todayLabelCap = todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1);

    // Construir líneas de detalle
    const createdLines = (createdLeads || []).map((l: any) => {
      const sourceLabel = l.source || 'Sin origen';
      const name = `${l.first_name} ${l.last_name || ''}`.trim();
      return `   • *${name}* (${sourceLabel})`;
    }).join('\n');

    const paymentLines = paidLeadsDetails.map((p: any) => {
      return `   • *${p.name}*: $${p.amount.toFixed(2)} USD (Total reserva: $${p.total} USD)`;
    }).join('\n');

    // Armar el mensaje de WhatsApp
    const message = [
      `📊 *REPORTE DIARIO DE VENTAS* 🌴`,
      `Go Easy CRM - Generado a las 08:00 p. m. (Col)`,
      `📅 *Periodo:* ${todayLabelCap}`,
      ``,
      `✨ *Resumen del Día:*`,
      `   • Leads creados hoy: *${createdLeads?.length || 0}*`,
      `   • Reservas pagadas hoy: *${paidLeadsCount}*`,
      `   • Total recaudado hoy: *$${totalPaymentsAmount.toFixed(2)}* USD`,
      ``,
      createdLeads && createdLeads.length > 0 ? `🧑‍💼 *Detalle de Leads Creados:*\n${createdLines}\n` : null,
      paidLeadsCount > 0 ? `💰 *Detalle de Pagos Recibidos:*\n${paymentLines}\n` : null,
      ((createdLeads?.length || 0) === 0 && paidLeadsCount === 0) ? `No se registraron nuevos leads ni pagos en este periodo.\n` : null,
      `_Reporte automático - Go Easy CRM_ 🤖`
    ].filter(x => x !== null).join('\n');

    return NextResponse.json({
      ok: true,
      startDate: startDateStr,
      endDate: endDateStr,
      createdCount: createdLeads?.length || 0,
      paidCount: paidLeadsCount,
      totalPayments: totalPaymentsAmount,
      message
    });

  } catch (error: any) {
    console.error('[DailyReportCron] Error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
