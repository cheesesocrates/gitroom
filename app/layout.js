import './globals.css';
import { Bricolage_Grotesque, Figtree, Pixelify_Sans } from 'next/font/google';
import { SITE } from '@/lib/site';

const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display', axes: ['opsz'], display: 'swap' });
const body = Figtree({ subsets: ['latin'], variable: '--font-body', display: 'swap' });
const pixel = Pixelify_Sans({ subsets: ['latin'], variable: '--font-pixel', display: 'swap' });

const description = 'Turn any GitHub profile into a pixel-art house: repos become rooms, commits unlock furniture, frameworks move in and followers cheer outside. Free, no sign-up.';

export const metadata = {
  metadataBase: new URL(SITE),
  title: { default: 'GitRoom · your GitHub as a pixel house', template: '%s' },
  description,
  applicationName: 'GitRoom',
  openGraph: { type: 'website', siteName: 'GitRoom', title: 'GitRoom · your GitHub as a pixel house', description, url: '/' },
  twitter: { card: 'summary_large_image', title: 'GitRoom · your GitHub as a pixel house', description },
};

export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#5cc23c' };

// applies the saved day/night colours before the first paint
const THEME = "try{var t=localStorage.getItem('gitroom-theme');if(t)document.documentElement.dataset.theme=t}catch(e){}";

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${pixel.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
