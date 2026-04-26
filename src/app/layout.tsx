import { GoogleAnalytics } from '@next/third-parties/google'
import Script from 'next/script'
import type { Metadata, Viewport } from 'next'
import { Radio_Canada_Big } from 'next/font/google'
import React from 'react'
import "./globals.css";
import { createClient } from '@/utils/supabase/server'

const radioCanada = Radio_Canada_Big({
  subsets: ['latin'],
  variable: '--font-radio-canada',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0ea5e9',
}

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient()
  const { data: settings } = await supabase
    .from('system_settings')
    .select('*')
    .eq('id', 1)
    .single()

  const v = settings?.updated_at ? `?v=${new Date(settings.updated_at).getTime()}` : ''

  return {
    title: settings?.seo_title || "Go Easy Florida CRM",
    description: settings?.seo_description || "Premium Car Rental CRM",
    keywords: settings?.seo_keywords,
    manifest: "/manifest.json",
    icons: {
      icon: settings?.favicon_url ? `${settings.favicon_url}${v}` : "/favicon.ico",
      apple: "/icon-192x192.png",
    },
    appleWebApp: {
      capable: true,
      title: "GE CRM",
      statusBarStyle: "black-translucent",
    },
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${radioCanada.variable} h-full antialiased`}
    >
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
        {process.env.NEXT_PUBLIC_FB_PIXEL_ID && (
          <Script id="fb-pixel" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${process.env.NEXT_PUBLIC_FB_PIXEL_ID}');
              fbq('track', 'PageView');
            `}
          </Script>
        )}
      </head>
      <body suppressHydrationWarning className="min-h-full flex flex-col font-body">
        {children}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
      </body>
    </html>
  );
}
