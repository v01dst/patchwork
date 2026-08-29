import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Patchwork — Developer Project Dashboard',
  description: 'Generic, high-reliability Kanban & Developer Project Dashboard for small dev teams and solo builders.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased selection:bg-indigo-500 selection:text-white transition-colors duration-200">
        {children}
      </body>
    </html>
  );
}
