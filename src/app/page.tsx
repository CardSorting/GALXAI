import { PublicHome } from '@/components/home/PublicHome';
import { constructMetadata } from '@/lib/seo/metadata';
export const metadata = constructMetadata({ title: 'Your idea, ready to share', description: 'Turn an idea into a website with GALX Sites. Make a first version, keep refining it, and publish at your own public GALX address. Explore our very early public beta.', keywords: ['GALX Sites', 'website builder', 'prototyping', 'public beta'], canonicalPath: '/' });
export default function HomePage() { return <PublicHome />; }
