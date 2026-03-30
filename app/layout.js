import './globals.css';

export const metadata = {
  title: 'Penvoy — Your AI Writing Envoy',
  description: 'Summarize emails, analyze threads, draft replies, and compose emails in seconds. Powered by your own AI key.',
  keywords: 'email summarizer, AI email, email drafting, thread analysis, SLA tracking, email assistant',
  openGraph: {
    title: 'Penvoy — Your AI Writing Envoy',
    description: 'Summarize emails, analyze threads, draft replies, and compose emails in seconds.',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
