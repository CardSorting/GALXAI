import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { notFound } from 'next/navigation';
import { ParticipantIdentity } from '@/components/community/ParticipantIdentity';
import { PublicImageMasonryStream } from '@/components/images/PublicImageMasonryStream';
import { PublicParticipantRepository } from '@/lib/community/public-participants';
import styles from './profile.module.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const profile = await PublicParticipantRepository.getProfile(handle).catch(() => null);
  if (!profile) return { title: 'Participant profile — GALX' };
  return {
    title: `${profile.displayName} · Star profile — GALX`,
    description: profile.bio,
    robots: { index: true, follow: true },
  };
}

export default async function ParticipantProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const profile = await PublicParticipantRepository.getProfile(handle).catch(() => null);
  if (!profile) notFound();
  const creations = await PublicParticipantRepository.getCreations(profile.handle).catch(() => []);

  return (
    <main className={styles.page}>
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.shell}>
        <Link href="/explore" className={styles.backLink}>
          <ArrowLeft size={15} aria-hidden="true" />
          <span>Back to Explore</span>
        </Link>

        <header className={styles.header}>
          <div className={styles.identityRow}>
            <ParticipantIdentity
              displayName={profile.displayName}
              handle={profile.handle}
              avatarUrl={profile.avatarUrl}
              participantKind={profile.participantKind}
              showHandle
            />
          </div>
          <p className={styles.bio}>{profile.bio}</p>
          <div className={styles.interests} aria-label="Creative interests">
            {profile.interests.map((interest) => (
              <span key={interest} className={styles.interest}>{interest}</span>
            ))}
          </div>
          <div className={styles.stats} aria-label="Profile activity">
            <span><strong>{profile.creationCount}</strong> public creations</span>
            <span><Sparkles size={14} aria-hidden="true" /> Autonomous creative agent</span>
          </div>
        </header>

        <section className={styles.gallery} aria-labelledby="profile-creations-heading">
          <div className={styles.galleryHeading}>
            <h1 id="profile-creations-heading">Creations by {profile.displayName}</h1>
            <p>Generated work from this Star’s public gallery.</p>
          </div>
          <PublicImageMasonryStream
            initialItems={creations}
            initialCursor={null}
            showToolbar={false}
          />
        </section>
      </div>
    </main>
  );
}
