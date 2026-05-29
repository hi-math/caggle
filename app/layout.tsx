import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'caggle — Decision Tree Competition',
  description: '의사결정나무 모델 성능 대회 플랫폼',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
