import { EmailUpdates } from '@/components/email-updates';
export const metadata = { title: 'School updates' };
export default function UpdatesPage() {
  return <EmailUpdates announcements />;
}
