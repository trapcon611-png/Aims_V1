import './globals.css';
import { Plus_Jakarta_Sans } from 'next/font/google';

const jakarta = Plus_Jakarta_Sans({ 
  subsets: ['latin'],
  variable: '--font-jakarta',
});

export const metadata = {
  title: 'AIMS Institute Portal',
  description: 'Academic Management System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} font-sans`}>
      <body className="antialiased bg-[#F0F5FA] text-slate-800">
        {children}
      </body>
    </html>
  );
}