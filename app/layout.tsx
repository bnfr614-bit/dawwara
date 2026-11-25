import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'دوّارة',
  description: 'ألعاب جماعية للشلة: كل واحد يلعب من جواله، والشاشة الكبيرة للكل.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#17110e' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Reem+Kufi:wght@500;600;700&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('dw_theme');if(t)document.documentElement.dataset.theme=t}catch(e){}" }} />
        <style>{'.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}'}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
