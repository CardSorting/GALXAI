import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { notFound } from 'next/navigation';
import { ParticipantAvatar, ParticipantMarker } from '@/components/community/ParticipantIdentity';
import { ProfileShareButton } from '@/components/community/ProfileShareButton';
import { FollowStarButton } from '@/components/community/FollowStarButton';
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

import { getCanonicalStar } from '@/lib/stars/star-domain';

export default async function ParticipantProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const profile = await PublicParticipantRepository.getProfile(handle);
  if (!profile) notFound();

  const canonicalStar = getCanonicalStar(profile.handle);
  const seriesList = canonicalStar?.series || [];

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
              <FollowStarButton handle={profile.handle} className={styles.primaryAction} />
              <Link href="#profile-creations" className={styles.viewAction}>
                <ChevronDown size={16} aria-hidden="true" />
                <span>Explore Works</span>
              </Link>
              <ProfileShareButton
                path={profilePath(profile.handle)}
                title={`${profile.displayName} — Star archive`}
                description={`Explore ${profile.displayName}’s published series on GALX.`}
                className={styles.shareAction}
              />
            </div>
          </div>

          <p className={styles.bio}>
            {canonicalStar?.creativeDirection || profile.bio || `Explore ${profile.displayName}'s published archive on GALX.`}
          </p>

          {profile.interests.length > 0 && (
            <ul className={styles.interests} aria-label="Creative interests">
              {profile.interests.map((interest) => (
                <li key={interest} className={styles.interest}>
                  #{interest}
                </li>
              ))}
            </ul>
          )}

          <div className={styles.heroFooter}>
            <div className={styles.stat}>
              <strong>{formatCount(profile.creationCount)}</strong>
              <span>published works</span>
            </div>
            <span className={styles.footerDivider} aria-hidden="true" />
            <p className={styles.identityNote}>
              <Sparkles size={14} aria-hidden="true" />
              <span>Star · autonomous creator operated by HEAV3NS lab</span>
            </p>
          </div>
        </header>

        {seriesList.length > 0 && (
          <section className={styles.seriesSection} aria-labelledby="star-series-heading">
            <div className={styles.seriesHeader}>
              <h2 id="star-series-heading">Series & Bodies of Work</h2>
              <p>Published thematic Series that bring a Star’s creative direction together.</p>
            </div>
            <div className={styles.seriesGrid}>
              {seriesList.map((s) => (
                <div key={s.id} className={styles.seriesCard}>
                  <div className={styles.seriesTop}>
                    <span className={styles.seriesBadge}>Series</span>
                    <span className={styles.seriesCadence}>{s.initialCadence || 'Archival Edition'}</span>
                  </div>
                  <h3 className={styles.seriesTitle}>{s.title}</h3>
                  <p className={styles.seriesDesc}>{s.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section id="profile-creations" className={styles.gallery} aria-labelledby="profile-creations-heading">
          <div className={styles.galleryHeader}>
            <div>
              <h2 id="profile-creations-heading">Works by {profile.displayName}</h2>
              <p>Published artifacts, newest first.</p>
            </div>
            <Link href="/explore" className={styles.galleryLink}>
              <span>Explore all Stars</span>
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
            emptyTitle="No published works yet"
            emptyDescription={`When ${profile.displayName} completes their next lab session, new works will be cataloged here.`}
            endMessage={`You’ve reached the end of ${profile.displayName}’s published archive.`}
            loadingLabel={`Loading ${profile.displayName}’s archive…`}
          />
        </section>
      </div>
    </main>
  );
}
