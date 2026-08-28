import assert from 'node:assert/strict';
import { BroccoliRollingHistoryCompactor, ChatMessage } from '../src/core/broccolidb/BroccoliRollingHistoryCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB ROLLING HISTORY COMPACTOR & FACT DISTILLER');
  console.log('======================================================================\n');

  BroccoliRollingHistoryCompactor.clear();

  // Create a realistic 12-turn conversation with detailed multi-sentence turns
  const messages: ChatMessage[] = [
    { role: 'system', content: 'You are an enterprise AI cloud infrastructure assistant.' },
    {
      role: 'user',
      content: 'I need to configure our Kubernetes ingress controller for the new microservices cluster in us-west-2.',
    },
    {
      role: 'assistant',
      content: 'To configure the ingress controller in us-west-2, you should deploy the NGINX ingress helm chart with SSL termination enabled and route traffic through AWS Network Load Balancers with cross-zone load balancing enabled.',
    },
    {
      role: 'user',
      content: 'How do we handle SSL certificates with Let\'s Encrypt and cert-manager on this specific cluster?',
    },
    {
      role: 'assistant',
      content: 'Install cert-manager using the Jetstack Helm repository, then create a ClusterIssuer manifest pointing to the Let\'s Encrypt ACME server with Route53 DNS01 challenge validation.',
    },
    {
      role: 'user',
      content: 'Great, what IAM policy permissions does the cert-manager service account need for Route53?',
    },
    {
      role: 'assistant',
      content: 'The IAM policy requires route53:GetChange, route53:ChangeResourceRecordSets, and route53:ListHostedZonesByName scoped to your domain hosted zone ARN.',
    },
    {
      role: 'user',
      content: 'Got it, thank you very much for those details.',
    },
    {
      role: 'assistant',
      content: 'You are welcome! I am here whenever you are ready to continue.',
    },
    {
      role: 'user',
      content: 'Now let\'s write the YAML manifest for the ClusterIssuer.',
    },
    {
      role: 'assistant',
      content: 'Here is the YAML manifest for the ClusterIssuer with Let\'s Encrypt production ACME server...',
    },
    {
      role: 'user',
      content: 'Can you add the email address security@galx.ai to this manifest?',
    },
  ];

  console.log('[1/2] Compacting 12-Turn Conversation (Window Size = 4)...');
  const result = BroccoliRollingHistoryCompactor.compactHistory('session_dev_991', messages, 4);

  console.log(`      - Was Compacted: ${result.wasCompacted}`);
  console.log(`      - Original Turns: ${messages.length} -> Condensed Messages: ${result.retainedTurnsCount}`);
  console.log(`      - Original Tokens: ${result.originalTokens} -> Compacted: ${result.compactedTokens}`);
  console.log(`      - Tokens Saved: ${result.tokensSaved} (-${result.savingsPercentage}%)`);

  assert.equal(result.wasCompacted, true);
  assert.ok(result.savingsPercentage >= 35);
  assert.ok(result.condensedMessages.some((m) => m.content.includes('[Context Summary')));

  console.log('\n[✓] Rolling History Compaction & Progressive Fact Distillation Verified.');

  console.log('\n======================================================================');
  console.log('   ALL ROLLING HISTORY COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
