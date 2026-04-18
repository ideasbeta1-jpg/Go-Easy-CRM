import { Resend } from 'resend';
import { createAdminClient } from './supabase/admin';

let resend: any = null;

function getResend() {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY || 're_stub');
  }
  return resend;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    console.error('[Email] RESEND_API_KEY is missing');
    return { success: false, error: 'Configuración faltante' };
  }

  try {
    const { data, error } = await getResend().emails.send({
      from: process.env.EMAIL_FROM || 'Goeasy Florida <reservas@goeasyflorida.com>',
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error('[Email] Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('[Email] Unexpected error:', error);
    return { success: false, error: 'Error inesperado al enviar email' };
  }
}

/**
 * Reemplaza variables en formato {{variable}} con datos reales
 */
function replaceVariables(text: string, data: any) {
  return text.replace(/{{(\w+)}}/g, (match, key) => {
    return data[key] || match;
  });
}

// Templates helper
export async function getStageEmailTemplate(stage: string, leadData: any, extraData: any = {}) {
  const supabase = createAdminClient();
  
  // 1. Intentar obtener template de la base de datos
  const { data: template } = await supabase
    .from('email_templates')
    .select('*')
    .eq('stage', stage)
    .single();

  // 1.1 Obtener nombre del agente si está asignado
  let agentName = 'Tu asesor de Go Easy Florida';
  if (leadData.assigned_to) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, first_name')
      .eq('id', leadData.assigned_to)
      .single();
    
    if (profile) {
      agentName = profile.full_name || profile.first_name || agentName;
    }
  }

  const baseStyle = `
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    color: #1e293b;
    line-height: 1.6;
    max-width: 600px;
    margin: 0 auto;
    padding: 40px 20px;
  `;

  const headerStyle = `
    text-align: center;
    margin-bottom: 40px;
  `;

  const footerStyle = `
    text-align: center;
    margin-top: 60px;
    font-size: 12px;
    color: #94a3b8;
    border-top: 1px solid #f1f5f9;
    padding-top: 30px;
  `;

  let content = '';
  let subject = '';

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'pendiente';
    return new Date(dateStr).toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return 'pendiente';
    return new Date(dateStr).toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  if (template) {
    // Preparar datos para sustitución
    const variables = {
      name: leadData.first_name || 'Cliente',
      full_name: `${leadData.first_name || ''} ${leadData.last_name || ''}`.trim() || 'Cliente',
      pickup_date: formatDate(leadData.pickup_date),
      pickup_time: formatTime(leadData.pickup_date),
      return_date: formatDate(leadData.return_date),
      return_time: formatTime(leadData.return_date),
      pickup_location: leadData.pickup_location || 'Aeropuerto / Oficina',
      return_location: leadData.return_location || 'Aeropuerto / Oficina',
      agent_name: agentName,
      stripe_link: extraData.stripe_link || '',
      voucher_url: extraData.voucher_url || '',
      category: leadData.category?.name || 'vehículo',
      ...extraData
    };
    content = replaceVariables(template.body, variables);
    subject = replaceVariables(template.subject, variables);
  } else {
    // Fallback original si no hay template en DB
    const name = leadData.first_name || 'Cliente';
    switch (stage) {
      case 'lead_nuevo':
        subject = '¡Bienvenido a Go Easy Florida! 🚗';
        content = `
          <h1 style="color: #4052b6; font-size: 24px; font-weight: 800; margin-bottom: 16px;">¡Hola ${name}!</h1>
          <p>Gracias por contactar a <strong>Go Easy Florida</strong>. Hemos recibido tu solicitud de renta de vehículo.</p>
          <p>Un asesor se pondrá en contacto contigo muy pronto para brindarte atención personalizada.</p>
        `;
        break;
      case 'voucher_enviado':
        subject = 'Tu voucher de reserva - Go Easy Florida 📄';
        const vUrl = extraData.voucher_url || '';
        content = `
          <h1 style="color: #4052b6; font-size: 24px; font-weight: 800; margin-bottom: 16px;">¡Hola ${name}!</h1>
          <p>Ya tenemos listo tu <strong>Voucher Oficial de Confirmación</strong> para tu renta en ${leadData.pickup_location || 'Florida'}.</p>
          <p>Puedes acceder a tu documento digital y descargarlo en PDF haciendo clic en el siguiente enlace:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${vUrl}" style="background-color: #4052b6; color: white; padding: 16px 32px; border-radius: 12px; font-weight: bold; text-decoration: none; display: inline-block;">Ver mi Voucher</a>
          </div>
          <p style="font-size: 14px; color: #64748b;">Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador: ${vUrl}</p>
        `;
        break;
      default:
        subject = 'Aviso de Go Easy Florida';
        content = `<p>Hola ${name}, hay una actualización en tu solicitud.</p>`;
    }
  }

  const html = `
    <div style="${baseStyle}">
      <div style="${headerStyle}">
        <img src="https://go-easy-crm.vercel.app/logo.png" alt="Go Easy Florida" style="height: 50px;">
      </div>
      ${content}
      <div style="${footerStyle}">
        <p>Atentamente,<br><strong>${agentName}</strong></p>
        <p><strong>Go Easy Florida</strong> - Luxury Car Rental & Management</p>
        <p>Florida, USA | <a href="https://goeasyflorida.com" style="color: #4052b6; text-decoration: none;">www.goeasyflorida.com</a></p>
      </div>
    </div>
  `;

  return { subject, html };
}
