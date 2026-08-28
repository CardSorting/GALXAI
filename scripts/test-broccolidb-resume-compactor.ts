import assert from 'node:assert/strict';
import { BroccoliResumeCompactor } from '../src/core/broccolidb/BroccoliResumeCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB RESUME & CANDIDATE PROFILE COMPACTOR');
  console.log('======================================================================\n');

  BroccoliResumeCompactor.clear();

  // Full mock candidate resume with objective statement, soft skills, hobbies, and detailed experience
  const rawResume = `
Alex Chen
San Francisco, CA | alex.chen@example.com | github.com/alexchen-dev

OBJECTIVE:
Dynamic and highly motivated engineering professional seeking a challenging leadership position where I can leverage my synergistic cross-functional abilities and passion for excellence to drive business outcomes.

TECHNICAL SKILLS:
TypeScript, Rust, Kubernetes, Go, PostgreSQL, Redis, Docker, OpenTelemetry, AWS, GraphQL

EXPERIENCE:
Staff Engineer at Datadog (2022 - Present)
- Architected telemetry pipeline handling 5M req/sec with 99.999% uptime
- Scaled distributed trace aggregation clusters, saving $1.2M in annual cloud infrastructure costs
- Led and mentored a cross-functional squad of 8 senior infrastructure engineers

Senior Systems Engineer at Cloudflare (2018 - 2022)
- Built edge caching layer reducing origin traffic by 45% across global PoPs
- 8+ years of software engineering experience in high-scale systems

EDUCATION & CERTIFICATIONS:
B.S. in Computer Science, Stanford University (2018)
AWS Certified Solutions Architect Professional

INTERESTS & HOBBIES:
Marathon runner, amateur landscape photographer, artisanal sourdough baker, and avid chess player.
References available upon request.
`.trim();

  console.log('[1/2] Compacting Resume in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliResumeCompactor.compactResume(rawResume);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Candidate: ${res.candidateNameAndTitle}`);
  console.log(`      - Background: ${res.experienceAndTechStack}`);
  console.log(`      - Top Role: ${res.topRoleAndAchievement}`);
  console.log(`      - Education: ${res.educationAndCerts}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted Resume Preview:\n"""\n${res.compactedResumePrompt}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.ok(res.candidateNameAndTitle.includes('Alex Chen'));
  assert.ok(res.experienceAndTechStack.includes('8+ years'));
  assert.ok(res.experienceAndTechStack.includes('TypeScript, Rust'));
  assert.ok(res.topRoleAndAchievement.includes('Staff Engineer at Datadog'));
  assert.ok(res.educationAndCerts.includes('Stanford University'));
  assert.ok(res.savingsPercentage >= 40);
  assert.ok(!res.compactedResumePrompt.includes('Dynamic and highly motivated')); // Objective statement pruned
  assert.ok(!res.compactedResumePrompt.includes('artisanal sourdough baker')); // Hobbies pruned
  assert.ok(!res.compactedResumePrompt.includes('References available upon request')); // Footer boilerplate pruned

  console.log('\n[✓] Candidate Resume AST & Experience Extraction Verified.');

  console.log('\n======================================================================');
  console.log('   ALL RESUME COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
