import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = { title: 'نواة | إدارة ورشة الصيانة', description: 'نظام إدارة ورشة صيانة الهواتف المحمولة' }
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl"><body>{children}</body></html>
}
