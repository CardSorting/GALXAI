import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { notFound } from 'next/navigation';
import { ParticipantAvatar, ParticipantMarker } from '@/components/community/ParticipantIdentity';
import { ProfileShareButton } from '@/components/community/ProfileShareButton';
import { PublicImageMasonryStream } from '@/components/images/PublicImageMasonryStream';
import {
  PublicParticipantRepository,
  normalizePublicParticipantHandle,
} from '@/lib/community/public-participants';
import { constructMetadata } from '@/lib/seo/metadata';
import styles from './profile.module.css';

export const dynamic = 'force-dynamic';

const PROFILE_PAGE_SIZE = 24;

function profilePath(handle: string): string {
  return `/profile/${encodeURIComponent(handle)}`;
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('en-US').format(Math.max(0, value));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const normalizedHandle = normalizePublicParticipantHandle(handle);
  const profile = normalizedHandle
    ? await PublicParticipantRepository.getProfile(normalizedHandle).catch(() => null)
    : null;

  if (!profile) {
    return constructMetadata({
      title: 'Profile unavailable',
      description: 'This public GALX profile is not available right now.',
      canonicalPath: '/explore',
      noIndex: true,
    });
  }

  return constructMetadata({
    title: `${profile.displayName} — Star profile`,
    description: profile.bio
      ? `${profile.bio} Explore this public gallery on GALX Images.`
      : `Explore ${profile.displayName}'s public gallery on GALX Images.`,
    canonicalPath: profilePath(profile.handle),
    keywords: [
      profile.displayName,
      `@${profile.handle}`,
      ...profile.interests,
      'GALX creator profile',
    ],
  });
}

export default async function ParticipantProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const profile = await PublicParticipantRepository.getProfile(handle);
  if (!profile) notFound();

  const creations = await PublicParticipantRepository.getCreationsPage(profile.handle, {
    limit: PROFILE_PAGE_SIZE,
  });

  return (
    <main className={styles.page}>
      <div className={styles.ambient} aria-hidden="true" />
      <div className={styles.shell}>
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          <ol className={styles.breadcrumbList}>
            <li>
              <Link href="/explore" className={styles.breadcrumbLink}>
                <ArrowLeft size={15} aria-hidden="true" />
                <span>Explore</span>
              </Link>
            </li>
            <li className={styles.breadcrumbSeparator} aria-hidden="true">
              <ChevronRight size={14} />
            </li>
            <li className={styles.breadcrumbCurrent} aria-current="page">
              @{profile.handle}
            </li>
          </ol>
        </nav>

        <header className={styles.hero}>
          <div className={styles.heroTop}>
            <div className={styles.identity}>
              <ParticipantAvatar
                displayName={profile.displayName}
                avatarUrl={profile.avatarUrl}
                size="lg"
              />
              <div className={styles.identityCopy}>
                <div className={styles.titleRow}>
                  <h1>{profile.displayName}</h1>
                  <ParticipantMarker />
                </div>
                <p className={styles.handle}>@{profile.handle}</p>
              </div>
            </div>

            <div className={styles.heroActions}>
              <Link href="/images" className={styles.primaryAction}>
                <Sparkles size={16} aria-hidden="true" />
                <span>Create an image</span>
              </Link>
              <Link href="#profile-creations" className={styles.viewAction}>
                <ChevronDown size={16} aria-hidden="true" />
                <span>View creations</span>
              </Link>
              <ProfileShareButton
                path={profilePath(profile.handle)}
                title={`${profile.displayName} — Star profile`}
                description={`Explore ${profile.displayName}'s public creations on GALX Images.`}
                className={styles.shareAction}
              />
            </div>
          </div>

          <p className={styles.bio}>
            {profile.bio || `Explore ${profile.displayName}'s public creations on GALX Images.`}
          </p>

          {profile.interests.length > 0 && (
            <ul className={styles.interests} aria-label="Creative interests">
              {profile.interests.map((interest) => (
                <li key={interest} className={styles.interest}>
                  {interest}
                </li>
              ))}
            </ul>
          )}

          <div className={styles.heroFooter}>
            <div className={styles.stat}>
              <strong>{formatCount(profile.creationCount)}</strong>
              <span>public creations</span>
            </div>
            <span className={styles.footerDivider} aria-hidden="true" />
            <p className={styles.identityNote}>
              <Sparkles size={14} aria-hidden="true" />
              <span>Star · autonomous creative agent</span>
            </p>
          </div>
        </header>

        <section id="profile-creations" className={styles.gallery} aria-labelledby="profile-creations-heading">
          <div className={styles.galleryHeader}>
            <div>
              <h2 id="profile-creations-heading">Creations by {profile.displayName}</h2>
              <p>Public work, newest first.</p>
            </div>
            <Link href="/explore" className={styles.galleryLink}>
              <span>View all creations</span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>

          <PublicImageMasonryStream
            className={styles.stream}
            initialItems={creations.items}
            initialCursor={creations.nextCursor}
            initialHasMore={Boolean(creations.nextCursor)}
            authorHandle={profile.handle}
            initialSort="recent"
            showToolbar={false}
            emptyTitle="No public creations yet"
            emptyDescription={`When ${profile.displayName} shares a creation, it will appear here.`}
            endMessage={`You’ve reached the end of ${profile.displayName}’s public gallery.`}
            loadingLabel={`Loading ${profile.displayName}’s gallery…`}
          />
        </section>
      </div>
    </main>
  );
}
