import { createAdminClient } from './supabase/admin';
import { sendTemplateMessage, sendWABATextMessage } from './waba';
import { sendEmail, getStageEmailTemplate } from './email';
import { sendLeadToN8n } from './n8n';

/**
 * Motor central de automatización de Go Easy CRM
 * Ejecuta acciones de WhatsApp y Email según el cambio de etapa del Lead
 */
export async function executeStageAutomation(
  leadId: string, 
  stage: string, 
  extraData: any = {}
) {
  const supabase = createAdminClient();
  console.log(`[AutomationEngine] Procesando etapa ${stage} para Lead ${leadId}`);

  try {
    // 1. Obtener datos del lead y su agente si existe
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*, category:categories(name), assigned_agent:profiles!leads_assigned_to_fkey(first_name, phone, email)')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      console.error('[AutomationEngine] Error al obtener lead:', leadError);
      return;
    }

    // 2. Configuración por defecto por etapa
    const defaultTemplates: Record<string, string> = {
      'lead_nuevo': 'bienvenida_lead',
      'en_cotizacion': 'cotizacion_enviada',
      'reserva_confirmada': 'pago_confirmado',
      'voucher_enviado': 'voucher_disponible',
      'cerrado': 'gracias_feedback'
    };

    // Intentar buscar un mapping manual para esta etapa
    const { data: mapping } = await supabase
      .from('whatsapp_template_mappings')
      .select('*')
      .eq('stage', stage)
      .maybeSingle();

    const templateName = mapping?.template_name || defaultTemplates[stage];
    
    if (!templateName) {
      console.log(`[AutomationEngine] No hay plantilla definida para la etapa: ${stage}`);
    } else if (lead.phone) {
      // 3. Resolver parámetros de WhatsApp
      let params: string[] = [];

      if (mapping && mapping.mappings) {
        // Usar mapeo dinámico
        const sortedKeys = Object.keys(mapping.mappings).sort((a, b) => parseInt(a) - parseInt(b));
        params = sortedKeys.map(key => resolveLeadField(mapping.mappings[key], lead, extraData));
      } else {
        // Fallback a lógica cableada anterior si no hay mapping
        switch(stage) {
          case 'lead_nuevo': params = [lead.first_name || 'Cliente']; break;
          case 'en_cotizacion': params = [lead.first_name || 'Cliente', extraData.stripe_link || 'pendiente']; break;
          case 'reserva_confirmada': params = [lead.first_name || 'Cliente', formatValue(lead.pickup_date, 'date')]; break;
          case 'voucher_enviado': params = [lead.first_name || 'Cliente', extraData.voucher_url || 'pendiente']; break;
          default: params = [lead.first_name || 'Cliente'];
        }
      }

      // Enviar WhatsApp
      const components = [{
        type: 'body',
        parameters: params.map(p => ({ type: 'text', text: p }))
      }];

      const waSuccess = await sendTemplateMessage(lead.phone, templateName, mapping?.language_code || 'es', components);
      await logAutomation(leadId, stage, 'whatsapp', templateName, waSuccess ? 'sent' : 'failed');
    }

    // 4. Ejecutar Email (si hay email)
    const automationConfig = { email: true }; // Por ahora siempre activado
    if (automationConfig.email && lead.email) {
      const { subject, html } = await getStageEmailTemplate(stage, lead, extraData);
      const emailResult = await sendEmail({ to: lead.email, subject, html });
      
      await logAutomation(
        leadId, 
        stage, 
        'email', 
        'html_template', 
        emailResult.success ? 'sent' : 'failed', 
        emailResult.error
      );
    }

    // 5. Fallback a n8n
    await sendLeadToN8n(leadId, stage, extraData);

    // 6. Notificación al Vendedor (Si es reserva confirmada)
    if (stage === 'reserva_confirmada' && lead.assigned_agent?.phone) {
      const depositAmount = typeof extraData.amount === 'number' ? extraData.amount.toFixed(2) : (extraData.amount || '—');
      const agentMsg = `🎉 *¡Felicidades!* Tu cliente *${lead.first_name} ${lead.last_name || ''}* ha pagado el depósito de *$${depositAmount}*. Ahora ayúdanos gestionando el voucher.`;
      
      console.log(`[AutomationEngine] Notificando al vendedor ${lead.assigned_agent.first_name} (${lead.assigned_agent.phone})`);
      await sendWABATextMessage(lead.assigned_agent.phone, agentMsg);
    }

  } catch (error: any) {
    console.error('[AutomationEngine] Error inesperado:', error);
  }
}

/**
 * Resuelve un campo del lead basado en el id de mapping
 */
function resolveLeadField(fieldId: string, lead: any, extraData: any): string {
  switch(fieldId) {
    case 'first_name': return lead.first_name || 'Cliente';
    case 'last_name': return lead.last_name || '';
    case 'category_name': return lead.category?.name || 'Auto';
    case 'pickup_date': return formatValue(lead.pickup_date, 'date');
    case 'pickup_time': return formatValue(lead.pickup_date, 'time');
    case 'pickup_location': return lead.pickup_location || '—';
    case 'return_date': return formatValue(lead.return_date, 'date');
    case 'return_time': return formatValue(lead.return_date, 'time');
    case 'return_location': return lead.return_location || '—';
    case 'agreed_daily_price': return `$${lead.agreed_daily_price || '—'}`;
    case 'total_amount': return `$${lead.total_amount || '0'}`;
    case 'deposit_amount': return `$${((lead.total_amount || 0) * 0.3).toFixed(2)}`;
    case 'stripe_link': return extraData.stripe_link || lead.stripe_link || '—';
    case 'agent_name': return lead.assigned_agent?.first_name || 'Tu Asesor';
    case 'agent_phone': return lead.assigned_agent?.phone || '';
    case 'voucher_url': return extraData.voucher_url || '—';
    case 'voucher_number': return extraData.voucher_number || '—';
    case 'provider_confirmation': return extraData.provider_confirmation || '—';
    default: return '—';
  }
}

/**
 * Formatea valores para visualización
 */
function formatValue(val: any, type: 'date' | 'time'): string {
  if (!val) return '—';
  const date = new Date(val);
  if (type === 'date') {
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  }
  return date.toLocaleTimeString('es-ES', { hour: 'numeric', minute: '2-digit', hour12: true });
}


/**
 * Registra el resultado en la tabla automation_logs
 */
async function logAutomation(
  leadId: string, 
  stage: string, 
  channel: string, 
  templateName: string, 
  status: string, 
  error?: string
) {
  const supabase = createAdminClient();
  await supabase.from('automation_logs').insert({
    lead_id: leadId,
    stage,
    channel,
    template_name: templateName,
    status,
    error_message: error
  });
}
