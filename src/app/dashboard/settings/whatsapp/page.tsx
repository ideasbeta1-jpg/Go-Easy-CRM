import WhatsAppSettingsClient from './components/WhatsAppSettingsClient'

export const metadata = {
  title: 'Configuración WhatsApp WABA | Go Easy CRM',
  description: 'Gestiona tu conexión oficial con WhatsApp Business API.',
}

export default function WhatsAppSettingsPage() {
  return (
    <div className="max-w-[1200px] mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <WhatsAppSettingsClient />
    </div>
  )
}
