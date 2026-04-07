import { createAdminClient } from './supabase/admin';
import { sendTemplateMessage } from './waba';
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
    // 1. Obtener datos del lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*, category:categories(name)')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      console.error('[AutomationEngine] Error al obtener lead:', leadError);
      return;
    }

    // 2. Configuración de automatizaciones por etapa
    const config: Record<string, any> = {
      'lead_nuevo': {
        whatsapp: { template: 'bienvenida_lead', params: [lead.first_name || 'Cliente'] },
        email: true
      },
      'en_cotizacion': {
        whatsapp: { 
          template: 'cotizacion_enviada', 
          params: [
            lead.first_name || 'Cliente', 
            extraData.stripe_link || 'pendiente'
          ] 
        },
        email: true
      },
      'reserva_confirmada': {
        whatsapp: { 
          template: 'pago_confirmado', 
          params: [
            lead.first_name || 'Cliente', 
            lead.pickup_date ? new Date(lead.pickup_date).toLocaleDateString() : 'tu fecha'
          ] 
        },
        email: true
      },
      'voucher_enviado': {
        whatsapp: { 
          template: 'voucher_disponible', 
          params: [
            lead.first_name || 'Cliente', 
            extraData.voucher_url || 'pendiente'
          ] 
        },
        email: true
      },
      'cerrado': {
        whatsapp: { template: 'gracias_feedback', params: [lead.first_name || 'Cliente'] },
        email: true
      }
    };

    const automation = config[stage];
    if (!automation) {
      console.log(`[AutomationEngine] No hay automatización definida para la etapa: ${stage}`);
      return;
    }

    // 3. Ejecutar WhatsApp (si hay teléfono)
    if (automation.whatsapp && lead.phone) {
      const waRecipient = lead.phone;
      const components = [
        {
          type: 'body',
          parameters: automation.whatsapp.params.map((p: string) => ({ type: 'text', text: p }))
        }
      ];

      const waSuccess = await sendTemplateMessage(
        waRecipient, 
        automation.whatsapp.template, 
        'es', 
        components
      );

      await logAutomation(leadId, stage, 'whatsapp', automation.whatsapp.template, waSuccess ? 'sent' : 'failed');
    }

    // 4. Ejecutar Email (si hay email)
    if (automation.email && lead.email) {
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

    // 5. Fallback a n8n (como pidió el usuario)
    await sendLeadToN8n(leadId, stage, extraData);

  } catch (error: any) {
    console.error('[AutomationEngine] Error inesperado:', error);
  }
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
