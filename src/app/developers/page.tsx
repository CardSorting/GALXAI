import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { DeveloperPreview } from '@/components/developers/DeveloperPreview';
import { constructMetadata } from '@/lib/seo/metadata';
export const metadata = constructMetadata({ title: 'Developer API private preview', description: 'Request access to the GALX developer API private preview. Images and Sites remain available to everyone.', canonicalPath: '/developers' });
export default function DevelopersPage() {
  return <><Navigation /><main className="mx-auto w-full max-w-4xl px-5 py-12 sm:py-20">
    <p className="text-sm font-semibold text-indigo-300">Developer API · Private preview</p>
    <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Build with us, from the beginning.</h1>
    <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-300">We’re opening developer access gradually so we can support each participant, learn from private feedback, and improve the experience together.</p>
    <p className="mt-5 max-w-2xl leading-relaxed text-zinc-300">Image generation and Sites are open now. You can <Link className="text-white underline underline-offset-4" href="/images">create images</Link> and <Link className="text-white underline underline-offset-4" href="/sites">build a site</Link> without joining this waitlist.</p>
    <DeveloperPreview />
  </main></>;
}
