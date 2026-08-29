import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { JobRoleDetailClient } from '@/components/careers/JobRoleDetailClient';
import { getJobRoleById, getAllJobRoleIds } from '@/data/jobRoles';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createBreadcrumbSchema, createOrganizationSchema } from '@/lib/seo/jsonld';
import { SITE_CONFIG } from '@/lib/seo/siteConfig';

interface RolePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const ids = getAllJobRoleIds();
  return ids.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: RolePageProps): Promise<Metadata> {
  const { slug } = await params;
  const role = getJobRoleById(slug);

  if (!role) {
    return constructMetadata({
      title: 'Job Opening Not Found — GALX AI Careers',
      description: 'The requested job opening could not be found. Explore other engineering and research roles at GALX AI.',
      canonicalPath: '/careers',
    });
  }

  return constructMetadata({
    title: `${role.title} — Careers at GALX AI`,
    description: `${role.description} Join our core engineering fleet in building the next-generation Anycast routing and reasoning substrate. 100% remote, top compensation + equity.`,
    canonicalPath: `/careers/${role.id}`,
    keywords: [
      role.title,
      `${role.department} Jobs`,
      'GALX AI Careers',
      'Remote AI Engineering Jobs',
      ...role.tags,
    ],
  });
}

export default async function JobRoleDetailPage({ params }: RolePageProps) {
  const { slug } = await params;
  const role = getJobRoleById(slug);

  if (!role) {
    notFound();
  }

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Careers', href: '/careers' },
    { label: role.title, href: `/careers/${role.id}` },
  ];

  const jobPostingSchema = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: role.title,
    description: role.description,
    datePosted: '2026-08-01',
    validThrough: '2026-12-31',
    employmentType: 'FULL_TIME',
    hiringOrganization: {
      '@type': 'Organization',
      name: 'GALX AI',
      sameAs: SITE_CONFIG.url,
      logo: `${SITE_CONFIG.url}/brand/galx-galaxy-logo.svg`,
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'Worldwide / Remote',
      },
    },
    baseSalary: {
      '@type': 'MonetaryAmount',
      currency: 'USD',
      value: {
        '@type': 'QuantitativeValue',
        unitText: 'YEAR',
      },
    },
  };

  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createOrganizationSchema(),
      jobPostingSchema,
      createBreadcrumbSchema([
        { name: 'Home', url: SITE_CONFIG.url },
        { name: 'Careers', url: `${SITE_CONFIG.url}/careers` },
        { name: role.title, url: `${SITE_CONFIG.url}/careers/${role.id}` },
      ]),
    ],
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-foreground flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      <JsonLd data={pageSchema} />
      <Navigation />

      <main id="main-content" className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 w-full space-y-8">
        <Breadcrumbs items={breadcrumbs} />
        <JobRoleDetailClient role={role} />
      </main>
    </div>
  );
}
