import { createPreviewAdminHandlers } from '@/lib/admin/preview-route';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const { GET, POST } = createPreviewAdminHandlers();
