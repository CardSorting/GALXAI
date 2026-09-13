import { GuidePage } from '@/components/public-content/ReadingPage';
import { getGuide } from '@/lib/public-content/content';
import { constructMetadata } from '@/lib/seo/metadata';

const guide = getGuide('/knowledge-base/getting-started')!;
export const metadata = constructMetadata({ title: guide.title, description: guide.description, canonicalPath: guide.path, ogType: 'article' });
export default function Page() { return <GuidePage guide={guide} />; }
