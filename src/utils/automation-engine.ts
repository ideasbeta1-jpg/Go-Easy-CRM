import { createAdminClient } from './supabase/admin';
import { sendTemplateMessage, sendTemplateMessageWithError, sendWABATextMessage } from './waba';
import { sendEmail, getStageEmailTemplate } from './email';
import { sendLeadToN8n } from './n8n';
import { broadcastNotification } from '@/app/utils/actions/notifications';
import { scheduleRulesForStage } from './automation-scheduler';

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
  
  // Registro inicial para saber que el motor arrancó
  await logAutomation(leadId, stage, 'system', 'engine_start', 'processing');

  try {
    // 0. Cargar config de canales habilitados para esta etapa
    const { data: configRows } = await supabase
      .from('automation_config')
      .select('channel, enabled')
      .eq('stage', stage)

    const isEnabled = (channel: string): boolean => {
      if (!configRows) return true
      const row = configRows.find(r => r.channel === channel)
      return row === undefined ? true : row.enabled
    }

    // 1. Obtener datos del lead y su categoría
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*, category:categories(name)')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      console.error('[AutomationEngine] Error al obtener lead:', leadError);
      await logAutomation(leadId, stage, 'system', 'fetch_lead_error', 'failed', leadError?.message || 'Lead not found');
      return;
    }

    // 1.1 Obtener datos del agente — usar el que viene de extraData (ya asignado) o hacer fetch desde DB
    if (extraData.assigned_agent) {
      lead.assigned_agent = extraData.assigned_agent;
    } else if (lead.assigned_to) {
      try {
        const { data: agent } = await supabase
          .from('profiles')
          .select('first_name, last_name, phone')
          .eq('id', lead.assigned_to)
          .single();

        if (agent) {
          lead.assigned_agent = agent;
        }
      } catch (agentErr) {
        console.warn('[AutomationEngine] Error al obtener agente (no crítico):', agentErr);
      }
    }

    // Obtener la cotización más reciente si estamos en etapa de cotización o si se requiere
    const { data: quote } = await supabase
      .from('quotes')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (quote) {
      lead.active_quote = quote;
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://goeasyflorida.com').replace(/\/$/, '');
      lead.quote_url = `${appUrl}/q/${quote.id}`;
    }

    // Obtener el voucher más reciente si existe
    const { data: voucher } = await supabase
      .from('vouchers')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (voucher) {
      lead.active_voucher = voucher;
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://goeasyflorida.com').replace(/\/$/, '');
      lead.voucher_url = `${appUrl}/v/${voucher.id}`;
    }

    // 2. Configuración por defecto por etapa
    const defaultTemplates: Record<string, string> = {
      'lead_nuevo': 'bienvenida_lead',
      'en_cotizacion': 'cotizacion_enviada',
      'reserva_confirmada': 'reserva_confirmada',
      'voucher_enviado': 'voucher_disponible',
      'cerrado_ganado': 'gracias_feedback'
    };

    // Intentar buscar un mapping manual para esta etapa
    const { data: mapping } = await supabase
      .from('whatsapp_template_mappings')
      .select('*')
      .eq('stage', stage)
      .maybeSingle();

    const templateName = mapping?.template_name || defaultTemplates[stage];
    
    if (!isEnabled('whatsapp')) {
      console.log(`[AutomationEngine] WhatsApp deshabilitado para etapa: ${stage}`);
      await logAutomation(leadId, stage, 'whatsapp', 'skipped_by_config', 'skipped');
    } else if (!templateName) {
      console.log(`[AutomationEngine] No hay plantilla definida para la etapa: ${stage}`);
      await logAutomation(leadId, stage, 'system', 'no_template', 'skipped');
    } else if (lead.phone) {
      // 3. Resolver parámetros de WhatsApp
      let params: string[] = [];

      try {
        if (mapping && mapping.mappings) {
          const sortedKeys = Object.keys(mapping.mappings).sort((a, b) => parseInt(a) - parseInt(b));
          params = sortedKeys.map(key => resolveLeadField(mapping.mappings[key], lead, extraData));
        } else {
          switch(stage) {
            case 'lead_nuevo': 
              params = [
                lead.first_name || 'Cliente', 
                lead.assigned_agent?.first_name || 'Tu Asesor',
                formatValue(lead.pickup_date, 'date'),
                lead.pickup_location || '—'
              ]; 
              break;
            case 'en_cotizacion': 
              params = [
                lead.first_name || 'Cliente', 
                formatValue(lead.pickup_date, 'date'),
                lead.pickup_location || '—',
                lead.quote_url || extraData.stripe_link || lead.stripe_link || 'pendiente'
              ]; 
              break;
            case 'reserva_confirmada': 
              params = [
                lead.first_name || 'Cliente', 
                formatValue(lead.pickup_date, 'date'),
                lead.pickup_location || '—'
              ]; 
              break;
            case 'voucher_enviado':
              params = [
                lead.first_name || 'Cliente',
                lead.pickup_location || '—',
                extraData.voucher_url || lead.voucher_url || 'pendiente'
              ];
              break;
            default: params = [lead.first_name || 'Cliente'];
          }
        }

        const components = [{
          type: 'body',
          parameters: params.map(p => ({ type: 'text', text: p }))
        }];

        const langCode = mapping?.language_code || 'es_CO';
        const waResult = await sendTemplateMessageWithError(lead.phone, templateName, langCode, components);
        const waSuccess = waResult.ok;
        await logAutomation(leadId, stage, 'whatsapp', templateName, waSuccess ? 'sent' : 'failed', waSuccess ? undefined : waResult.error);
        
        if (waSuccess) {
          let previewText = `📄 [Plantilla: ${templateName}]`;
          try {
            const { getTemplates } = await import('./waba');
            const templates = await getTemplates();
            const langCode = mapping?.language_code || 'es_CO';
            const matchedTemplate = templates.find(t => t.name === templateName && (t.language === langCode || t.language === langCode.split('_')[0]));
            if (matchedTemplate) {
              const bodyComponent = matchedTemplate.components.find((c: any) => c.type === 'BODY');
              if (bodyComponent && bodyComponent.text) {
                let interpolatedText = bodyComponent.text;
                params.forEach((paramVal, index) => {
                  interpolatedText = interpolatedText.replace(`{{${index + 1}}}`, paramVal || '');
                });
                previewText = interpolatedText;
                
                const buttonsComponent = matchedTemplate.components.find((c: any) => c.type === 'BUTTONS');
                if (buttonsComponent && buttonsComponent.buttons) {
                  const btnTexts = buttonsComponent.buttons.map((b: any) => `[ ${b.text} ]`).join(' ');
                  previewText += `\n\n${btnTexts}`;
                }
              }
            }
          } catch (e) {
            console.warn('[AutomationEngine] Could not generate detailed template preview, using fallback.');
          }

          await supabase.from('messages').insert({
            lead_id: leadId,
            content: previewText,
            direction: 'outbound'
          });
        }
      } catch (waErr: any) {
        await logAutomation(leadId, stage, 'whatsapp', templateName, 'error', waErr.message);
      }
    }

    // 4. Ejecutar Email (si hay email)
    if (!isEnabled('email')) {
      await logAutomation(leadId, stage, 'email', 'skipped_by_config', 'skipped');
    } else if (lead.email) {
      try {
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
      } catch (emailErr: any) {
        await logAutomation(leadId, stage, 'email', 'html_template', 'error', emailErr.message);
      }
    }

    // 5. Fallback a n8n — pasamos datos enriquecidos para los mensajes de WhatsApp
    if (isEnabled('n8n')) {
      await sendLeadToN8n(leadId, stage, {
        ...extraData,
        first_name:     lead.first_name,
        last_name:      lead.last_name,
        lead_name:      `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
        phone:          lead.phone,
        email:          lead.email,
        source:         lead.source,
        assigned_agent: lead.assigned_agent,
      });
    }

    // 6. Notificación al Vendedor (Si es reserva confirmada)
    if (stage === 'reserva_confirmada' && lead.assigned_agent?.phone && isEnabled('agent_whatsapp')) {
      const depositAmount = typeof extraData.amount === 'number' ? extraData.amount.toFixed(2) : (extraData.amount || '—');
      const agentMsg = `🎉 *¡Felicidades!* Tu cliente *${lead.first_name} ${lead.last_name || ''}* ha pagado el depósito de *$${depositAmount}*. Ahora ayúdanos gestionando el voucher.`;
      await sendWABATextMessage(lead.assigned_agent.phone, agentMsg);
    }

    // 7. In-App Notifications
    if (isEnabled('in_app')) {
      const leadName = `${lead.first_name} ${lead.last_name || ''}`.trim();
      const stageNotifications: Record<string, { title: string; body: string; type: any }> = {
        'lead_nuevo': { type: 'new_lead', title: '🟢 Nuevo Lead Registrado', body: `${leadName} ha sido registrado en el sistema.` },
        'en_cotizacion': { type: 'quote_generated', title: '📄 Cotización Generada', body: `Se generó una cotización para ${leadName}.` },
        'reserva_confirmada': { type: 'payment_confirmed', title: '💰 ¡Pago Confirmado!', body: `${leadName} ha confirmado su reserva con un depósito.` },
        'voucher_enviado': { type: 'voucher_sent', title: '📋 Voucher Enviado', body: `El voucher de ${leadName} fue enviado.` },
        'cerrado_ganado':  { type: 'lead_closed', title: '🏆 Lead Ganado',  body: `El alquiler de ${leadName} se cerró exitosamente.` },
        'cerrado_perdido': { type: 'lead_closed', title: '❌ Lead Perdido', body: `El lead de ${leadName} fue marcado como perdido.` }
      };

      const notifConfig = stageNotifications[stage];
      if (notifConfig) {
        await broadcastNotification(
          { type: notifConfig.type, title: notifConfig.title, body: notifConfig.body, link: `/dashboard/leads/${leadId}`, lead_id: leadId },
          lead.assigned_to || null
        );
      }
    }

    // 8. Meta CAPI tracking por etapa
    if (!isEnabled('meta_capi')) {
      await logAutomation(leadId, stage, 'meta_capi', 'skipped_by_config', 'skipped');
    } else try {
      const { sendMetaEvent } = await import('./meta-capi');
      
      const eventMapping: Record<string, string> = {
        'en_cotizacion': 'InitiateCheckout',
        'reserva_confirmada': 'Purchase',
        'voucher_enviado': 'Schedule'
      };

      const eventName = eventMapping[stage];
      if (eventName) {
        // Determinamos el valor basado en la etapa
        let value = lead.total_amount || 0;
        if (stage === 'reserva_confirmada') {
          // Si es reserva confirmada, el valor es el depósito pagado (usualmente 30% o lo que diga extraData)
          value = extraData.amount || (lead.total_amount * 0.3);
        }

        await sendMetaEvent({
          eventName,
          eventID: `${leadId}_${stage}`, // ID único por etapa para evitar deduplicación accidental entre etapas
          userData: {
            email: lead.email,
            phone: lead.phone,
            first_name: lead.first_name,
            last_name: lead.last_name
          },
          customData: {
            content_name: lead.category?.name || 'Alquiler de Auto',
            value: parseFloat(value.toString()),
            currency: 'USD'
          }
        });
        
        await logAutomation(leadId, stage, 'meta_capi', eventName, 'sent');
      }
    } catch (metaErr: any) {
      console.error('[AutomationEngine] Error enviando Meta CAPI:', metaErr);
      await logAutomation(leadId, stage, 'meta_capi', 'error', 'failed', metaErr.message);
    }

    await logAutomation(leadId, stage, 'system', 'engine_complete', 'success');

    // Programar reglas de delay para esta etapa (fire-and-forget)
    scheduleRulesForStage(leadId, stage).catch(err =>
      console.error('[AutomationEngine] Error scheduling stage rules:', err)
    );

  } catch (error: any) {
    console.error('[AutomationEngine] Error inesperado:', error);
    await logAutomation(leadId, stage, 'system', 'unexpected_error', 'failed', error.message);
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
    case 'quote_url': return lead.quote_url || '—';
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
  lead_id: string, 
  stage: string, 
  channel: string, 
  template_name: string, 
  status: string, 
  error_message?: string
) {
  try {
    const supabase = createAdminClient();
    await supabase.from('automation_logs').insert({
      lead_id,
      stage,
      channel,
      template_name,
      status,
      error_message: error_message || null
    });
  } catch (err) {
    console.error('CRITICAL: Error logging automation result:', err);
  }
}
