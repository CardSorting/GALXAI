import { DocsArticle } from '@/components/docs/DocsArticle';
import { DOC_PAGES } from '@/lib/docs/content';
import { constructMetadata } from '@/lib/seo/metadata';
const page = DOC_PAGES.quickstart;
export const metadata = constructMetadata({ title: page.title, description: page.description, canonicalPath: page.path });
export default function Page() { return <DocsArticle page={page} />; }
