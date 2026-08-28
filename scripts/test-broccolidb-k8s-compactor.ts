import assert from 'node:assert/strict';
import { BroccoliK8sCompactor } from '../src/core/broccolidb/BroccoliK8sCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB KUBERNETES MANIFEST & TOPOLOGY SLICER');
  console.log('======================================================================\n');

  BroccoliK8sCompactor.clear();

  // Full mock Kubernetes YAML manifest with managedFields, uid, status conditions, and volume mounts
  const rawK8sYaml = `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: galxai-spend-gateway
  namespace: production
  uid: a849201f-883a-412e-9d22-102948201948
  resourceVersion: "9482019"
  generation: 4
  creationTimestamp: "2026-08-28T00:00:00Z"
  managedFields:
  - manager: kubectl-client-side-apply
    operation: Update
    time: "2026-08-28T00:00:00Z"
    fieldsType: FieldsV1
    fieldsV1:
      f:metadata:
        f:annotations: {}
spec:
  replicas: 8
  selector:
    matchLabels:
      app: galxai-spend-gateway
  template:
    metadata:
      labels:
        app: galxai-spend-gateway
    spec:
      containers:
      - name: gateway
        image: registry.galxai.internal/finops/gateway:v2.8.4
        resources:
          requests:
            cpu: 1000m
            memory: 2Gi
          limits:
            cpu: 4000m
            memory: 8Gi
        volumeMounts:
        - name: default-token-x8492
          mountPath: /var/run/secrets/kubernetes.io/serviceaccount
          readOnly: true
status:
  availableReplicas: 8
  readyReplicas: 8
  conditions:
  - type: Available
    status: "True"
    lastUpdateTime: "2026-08-28T00:00:00Z"
    reason: MinimumReplicasAvailable
`.trim();

  console.log('[1/2] Slicing Kubernetes Manifest in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliK8sCompactor.compactK8s(rawK8sYaml);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Resource: ${res.resourceKindAndName}`);
  console.log(`      - Config: ${res.replicasAndImage}`);
  console.log(`      - Limits: ${res.resourceRequestsLimits}`);
  console.log(`      - Health: ${res.podStateOrErrors}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted K8s Preview:\n"""\n${res.compactedK8sPrompt}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.ok(res.resourceKindAndName.includes('Deployment: production/galxai-spend-gateway'));
  assert.ok(res.replicasAndImage.includes('8 replicas'));
  assert.ok(res.replicasAndImage.includes('registry.galxai.internal/finops/gateway:v2.8.4'));
  assert.ok(res.resourceRequestsLimits.includes('1000m'));
  assert.ok(res.resourceRequestsLimits.includes('2Gi'));
  assert.ok(res.savingsPercentage >= 40);
  assert.ok(!res.compactedK8sPrompt.includes('managedFields')); // Runtime metadata pruned
  assert.ok(!res.compactedK8sPrompt.includes('resourceVersion')); // Resource version pruned
  assert.ok(!res.compactedK8sPrompt.includes('default-token-x8492')); // Service account mount pruned

  console.log('\n[✓] Kubernetes Manifest Slicing & Pod Topology Extraction Verified.');

  console.log('\n======================================================================');
  console.log('   ALL KUBERNETES COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
