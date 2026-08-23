import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CookbookRecipeClient } from '@/components/cookbook/CookbookRecipeClient';
import { COOKBOOK_RECIPES_DATA, type CookbookRecipeItem } from '@/lib/data/cookbooksData';
import { constructMetadata } from '@/lib/seo/metadata';
import {
  JsonLd,
  createHowToSchema,
  createSoftwareSourceCodeSchema,
  createFAQPageSchema,
  createBreadcrumbSchema,
  createTechArticleSchema,
} from '@/lib/seo/jsonld';

interface CookbookRecipePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return COOKBOOK_RECIPES_DATA.map((r) => ({
    slug: r.slug,
  }));
}

export async function generateMetadata({ params }: CookbookRecipePageProps): Promise<Metadata> {
  const { slug } = await params;
  const recipe = COOKBOOK_RECIPES_DATA.find((r) => r.slug === slug);

  if (!recipe) {
    return constructMetadata({
      title: 'Cookbook Recipe Not Found',
      description: 'The requested developer cookbook code recipe could not be found.',
      noIndex: true,
    });
  }

  return constructMetadata({
    title: recipe.title,
    description: recipe.description,
    canonicalPath: `/cookbook/${slug}`,
    keywords: [
      recipe.category,
      recipe.title,
      recipe.primaryLanguage,
      'OpenAI Cookbook',
      'AI Gateway Tutorial',
      'Prompt Caching Recipe',
      'pSEO Cookbook',
      'AEO Technical Guide',
    ],
  });
}

export default async function CookbookRecipePage({ params }: CookbookRecipePageProps) {
  const { slug } = await params;
  const recipe = COOKBOOK_RECIPES_DATA.find((r) => r.slug === slug);

  if (!recipe) {
    notFound();
  }

  const howToSchema = createHowToSchema({
    name: recipe.headline,
    description: recipe.description,
    totalTime: recipe.timeToComplete,
    steps: recipe.steps.map((s) => ({
      name: s.name,
      text: s.description,
    })),
  });

  const codeSchema = createSoftwareSourceCodeSchema({
    name: `${recipe.title} (${recipe.primaryLanguage})`,
    programmingLanguage: recipe.primaryLanguage,
    codeSample: recipe.codeSnippet,
    targetUrl: `https://galx.ai/cookbook/${slug}#recipe-code`,
  });

  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      howToSchema,
      codeSchema,
      createFAQPageSchema(recipe.faqs),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Cookbook', url: '/docs/cookbook' },
        { name: recipe.title, url: `/cookbook/${slug}` },
      ]),
      createTechArticleSchema({
        headline: recipe.title,
        description: recipe.description,
        path: `/cookbook/${slug}`,
        keywords: [recipe.category, recipe.primaryLanguage, 'AI Recipe', 'pSEO', 'AEO'],
      }),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <CookbookRecipeClient recipe={recipe} />
    </>
  );
}
