const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Credentials missing from .env.local!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testExactReport() {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setUTCHours(1, 0, 0, 0);

  if (now.getUTCHours() < 1) {
    endDate.setUTCDate(endDate.getUTCDate() - 1);
  }

  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - 1);

  const startDateStr = startDate.toISOString();
  const endDateStr = endDate.toISOString();

  console.log(`Reporting Period (UTC): ${startDateStr} to ${endDateStr}`);

  const { data: createdLeads, error: createdErr } = await supabase
    .from('leads')
    .select('id, first_name, last_name, source, created_at, total_amount')
    .gte('created_at', startDateStr)
    .lt('created_at', endDateStr)
    .is('deleted_at', null);

  if (createdErr) {
    console.error('Error fetching created leads:', createdErr);
    return;
  }

  const { data: logs, error: logsErr } = await supabase
    .from('automation_logs')
    .select('lead_id, created_at')
    .eq('stage', 'reserva_confirmada')
    .eq('channel', 'system')
    .eq('template_name', 'engine_complete')
    .eq('status', 'success')
    .gte('created_at', startDateStr)
    .lt('created_at', endDateStr);

  if (logsErr) {
    console.error('Error fetching logs:', logsErr);
    return;
  }

  const paidLeadIds = [...new Set(logs.map(log => log.lead_id))];

  let totalPaymentsAmount = 0;
  let paidLeadsCount = 0;
  const paidLeadsDetails = [];

  if (paidLeadIds.length > 0) {
    const { data: leadsWithQuotes, error: fetchErr } = await supabase
      .from('leads')
      .select('id, first_name, last_name, total_amount, quotes(*)')
      .in('id', paidLeadIds);
    
    if (fetchErr) {
      console.error('Error fetching paid leads details:', fetchErr);
      return;
    }

    paidLeadsCount = leadsWithQuotes.length;

    for (const lead of leadsWithQuotes) {
      const activeQuote = lead.quotes.find(q => q.is_active === true) || lead.quotes[0];
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

  const todayLabel = endDate.toLocaleDateString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'America/Bogota'
  });
  const todayLabelCap = todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1);

  const createdLines = createdLeads.map(l => {
    const sourceLabel = l.source || 'Sin origen';
    const name = `${l.first_name} ${l.last_name || ''}`.trim();
    return `   • *${name}* (${sourceLabel})`;
  }).join('\n');

  const paymentLines = paidLeadsDetails.map(p => {
    return `   • *${p.name}*: $${p.amount.toFixed(2)} USD (Total reserva: $${p.total} USD)`;
  }).join('\n');

  const message = [
    `📊 *REPORTE DIARIO DE VENTAS* 🌴`,
    `Go Easy CRM - Generado a las 08:00 p. m. (Col)`,
    `📅 *Periodo:* ${todayLabelCap}`,
    ``,
    `✨ *Resumen del Día:*`,
    `   • Leads creados hoy: *${createdLeads.length}*`,
    `   • Reservas pagadas hoy: *${paidLeadsCount}*`,
    `   • Total recaudado hoy: *$${totalPaymentsAmount.toFixed(2)}* USD`,
    ``,
    createdLeads.length > 0 ? `🧑‍💼 *Detalle de Leads Creados:*\n${createdLines}\n` : null,
    paidLeadsCount > 0 ? `💰 *Detalle de Pagos Recibidos:*\n${paymentLines}\n` : null,
    (createdLeads.length === 0 && paidLeadsCount === 0) ? `No se registraron nuevos leads ni pagos en este periodo.\n` : null,
    `_Reporte automático - Go Easy CRM_ 🤖`
  ].filter(x => x !== null).join('\n');

  console.log('\n--- GENERATED MESSAGE ---');
  console.log(message);
}

testExactReport();
