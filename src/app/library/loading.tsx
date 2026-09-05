import { Navigation } from '@/components/dashboard/Navigation';
import { VisualLibrarySkeleton } from '@/components/library/VisualLibrarySkeleton';

export default function VisualLibraryLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-[#07090e] text-white">
      <Navigation />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <VisualLibrarySkeleton />
      </main>
    </div>
  );
}
