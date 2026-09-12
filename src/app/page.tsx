import { PublicHome } from '@/components/home/PublicHome';
import { constructMetadata } from '@/lib/seo/metadata';
export const metadata = constructMetadata({ title: 'Create images and build sites', description: 'Create images and build websites with GALX. Images and Sites are open; the developer API is available through a private preview.', canonicalPath: '/' });
export default function HomePage() { return <PublicHome />; }
