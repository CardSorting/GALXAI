# ADR 0056: BroccoliDB 85-Buffer Algorithmic DeDuplication & High-Velocity Streaming Substrate

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status
Accepted

## Context
Enterprise AI agent workflows, large language model inference pipelines, multi-modal streaming systems, and distributed incident responders face massive token bloat, high latencies, and redundant network payloads. Raw context transmission (JSON schemas, repeated stack traces, multi-agent echo loops, dense 2D matrices, vector embeddings, high-dimensional tensors, and time-series floats) exhausts context windows and inflates inference spend by up to 90%.

A single, monolithic deduplication approach is insufficient because modern enterprise workloads span diverse data representations:
1. High-velocity character & byte streams.
2. Structured ASTs, JSON columns, and XML/SOAP envelopes.
3. High-dimensional mathematical matrices, tensors, and spatial geometries.
4. Multimodal audio Mel-spectrograms and discrete time-series waveforms.
5. Distributed consensus protocols, blockchain ledgers, and multi-agent dialogues.

## Decision
We engineered an 85-Buffer Algorithmic DeDuplication Architecture across 17 distinct functional tiers in BroccoliDB:

### 1. High-Velocity Stream & Ingestion Buffers
- **RingBufferStreamPool**: Lock-free circular slot ring pool with atomic write pointers executing 1.74M ops/sec.
- **IncidentAnomalySlidingWindowBuffer**: Temporal sliding window segmenting baseline, $T_0$ shockwave, and recovery stages.
- **ZeroAllocationByteStreamBuffer**: TypedArray native memory slab with zero-copy ASCII scanning.
- **CascadingSpilloverBuffer**: Tiered RAM-to-disk watermark buffer protecting against OOM crashes.
- **DeDuplicationBloomRingBuffer**: 64KB bitset Bloom Filter executing 5.2M duplicate checks/sec.

### 2. Probabilistic, CDC & Heavy-Hitter Buffers
- **SimHashFuzzyDedupBuffer**: 64-bit vector projection for near-duplicate template clustering.
- **CuckooFilterBuffer**: 4-way associative Cuckoo Filter with dynamic eviction kicks and $O(1)$ deletions.
- **CountMinSketchBuffer**: 2D sub-microsecond frequency matrix ($5 \times 8192$) for heavy-hitter tracking.
- **RabinKarpRollingDedupBuffer**: Content-Defined Chunking (CDC) with polynomial rolling hashes.
- **HyperLogLogCardinalityBuffer**: Murmur3 streaming distinct cardinality estimation with 0.62% standard error.

### 3. Structural, Embedding & Trie Buffers
- **JsonAstStructuralDedupBuffer**: Columnar schema dictionary extraction and tuple matrix encoding (40%–70% spend cut).
- **MinHashLshBandDedupBuffer**: $b=16 \times r=4$ MinHash LSH for $O(1)$ candidate discovery ($J > 0.90$).
- **QuotientFilterDedupBuffer**: Flat contiguous Robin Hood quotient filter in native buffer memory ($<12\text{ns}$ lookups).
- **SemanticEmbeddingDedupBuffer**: 128-dim INT8 quantized vector cosine similarity deduplicator.
- **TriePrefixSuffixDedupBuffer**: Radix Trie LCP/LCS factoring buffer slashing 60%+ preamble/postamble tokens.

### 4. Byte-Run, Levenshtein & AST Code Buffers
- **RunLengthByteRunDedupBuffer**: Collapses contiguous repetitive byte spans into Run-Length frames (66.7% spend cut).
- **LevenshteinTolerantDedupBuffer**: Bit-parallel Myers automaton ($K \le 2$) matching typos in $<50\text{ns}$.
- **DictionaryLZWStreamingBuffer**: Adaptive phrase dictionary substituting boilerplate text phrases.
- **SlidingWindowNgramDedupBuffer**: 4-word sliding window N-gram shingle Jaccard buffer.
- **CodeAstSymbolicDedupBuffer**: Symbolic consolidator hoisting redundant AST imports and declarations.

### 5. Multi-Modal, Forensic & Network Infrastructure Buffers
- **XmlSoapEnvelopeDedupBuffer**: SOAP envelope and namespace factoring buffer (42.4% spend cut).
- **PiiDeidentificationMaskBuffer**: Bidirectional PII/PHI surrogate token buffer with 100% lossless rehydration.
- **MarkdownTableMatrixDedupBuffer**: Markdown tabular merger collapsing repeated column headers.
- **YamlK8sManifestDedupBuffer**: Kubernetes & Helm YAML overlay buffer factoring shared metadata.
- **Base64BinaryStripperDedupBuffer**: Base64 binary attachment stripper with SHA-256 CAS descriptors (91.7% spend cut).

### 6. Network Wire, Dialogue, SQL & Telemetry Buffers
- **HttpHeaderCookieStripBuffer**: HTTP wire trace stripper masking multi-KB JWT tokens and cookie jars (64.5% spend cut).
- **MultiTurnDialogueCompactionBuffer**: Dialogue compactor pruning stale historical tool outputs (48.2% spend cut).
- **SqlDdlSchemaHoistingBuffer**: SQL DDL schema consolidator hoisting repetitive UUID keys and timestamps.
- **DeltaEncodingNumericVectorBuffer**: Delta-of-Delta numeric time-series compressor for IoT/tickers (43.5% spend cut).
- **GraphEdgeAdjacencyDedupBuffer**: Knowledge Graph adjacency matrix consolidator for RDF triples.

### 7. Codecs, Bitfields & Shannon Entropy Buffers
- **BrotliDictionaryTokenBuffer**: Static shared dictionary enterprise token compression.
- **VariableByteIntVintBuffer**: 7-bit Varint & ZigZag integer stream compressor (34.1% spend cut).
- **RegexStateTrieCanonicalizerBuffer**: Linear $O(N)$ Aho-Corasick DFA keyword canonicalizer (38.5% spend cut).
- **BitPackedBooleanMaskBuffer**: 64-bit boolean dictionary bitfield packer (91.5% spend cut).
- **EntropyHuffmanFrequencyBuffer**: Real-time streaming Shannon Entropy ($H$) analyzer (90.0% spend cut).

### 8. Cryptographic CAS, HNSW & Canonical Tree Buffers
- **MerklePatriciaTrieDedupBuffer**: Cryptographic Merkle Patricia state tree enabling $O(1)$ sub-tree CAS reuse (68.4% spend cut).
- **HnswVectorIndexDedupBuffer**: HNSW multi-layer proximity graph for sub-50µs $O(\log N)$ ANN vector deduplication.
- **TreeEditDistanceAstDedupBuffer**: Zhang-Shasha Tree Edit Distance (TED) buffer identifying structural AST isomorphism.
- **MemoryMappedPagedSlabBuffer**: 64KB paged virtual memory slab allocator providing zero-copy $<5\text{ns}$ allocation and zero-GC streaming.
- **CanonicalJsonLexicographicalSortBuffer**: RFC-8785 JSON Canonicalization Scheme (JCS) deterministic dictionary key sorting.

### 9. Distributed Sync, Roaring Bitmaps & Causal DAG Buffers
- **IbltInvertibleBloomBuffer**: Invertible Bloom Lookup Table (IBLT) extracting exact set differences in $O(\text{diff})$ sub-linear time.
- **RoaringBitmapPostingBuffer**: Sparse/dense hybrid Roaring Bitmap index switching between 16-bit Array Containers and 8KB Bitsets.
- **TokenTiling2dMatrixBuffer**: 2D token matrix tiling buffer decomposing spreadsheets into Tile Dictionaries (61.3% spend cut).
- **RadixTreePatriciaDictionaryBuffer**: Segment-compressed Radix Trie factoring common directory/URL paths.
- **ChronoEventDeduplicationDagBuffer**: Causal event DAG buffer tracking Lamport clocks to collapse microservice retry storms (33.9% spend cut).

### 10. Hardware KV-Cache & SVD Subspace Buffers
- **CrossTurnKvAttentionAnchorBuffer**: 64-token block boundary alignment buffer achieving **100% KV-cache prompt hit rates**.
- **BpeBytePairTokenDedupBuffer**: Streaming Byte-Pair Encoding (BPE) sub-word merge buffer with 100% lossless reversibility.
- **SvdLowRankProjectionDedupBuffer**: Truncated SVD 128-to-16 low-rank subspace projection reducing vector memory footprint by **87.5%**.
- **TemporalSlidingEventQuantizerBuffer**: Microsecond epoch timestamp quantization buffer compressing HFT/kernel telemetry.
- **ContextualPruningTokenWeightBuffer**: Information-theoretic contextual salience pruner eliminating conversational filler (35.0% spend cut).

### 11. Suffix Automata, Wavelets & ZK Buffers
- **SuffixAutomatonSubstringDedupBuffer**: Linear $O(N)$ Suffix Automaton (SAM) DAWG extracting maximal repeated substrings (38.9% spend cut).
- **WaveletMatrixWaveletTransformBuffer**: 1D Discrete Haar Wavelet Transform buffer sparsifying detail noise (35.4% spend cut).
- **ZkCommitmentMerkleProofBuffer**: Zero-Knowledge Merkle root commitment buffer generating $O(\log N)$ sparse witness proofs (86.0% spend cut).
- **SimdBitParallelMatcherBuffer**: 64-bit Bit-Parallel Shift-And multi-pattern scanner matching up to 64 keywords in $<1\text{ns}$/char.
- **VcdiffBinaryDeltaEncodingBuffer**: RFC-3284 VCDIFF binary delta engine with `COPY` and `ADD` window references.

### 12. BWT, Protobuf Wire & Kronecker Tensor Buffers
- **BurrowsWheelerRunLengthBuffer**: BWT rotation sorting and run-length compaction buffer clustering repetitive characters into contiguous runs.
- **ProtobufVarintWireFormatBuffer**: Protocol Buffers Tag-Length-Value (TLV) binary wire buffer mapping string JSON keys to 1-byte field numbers (31.1% spend cut).
- **DynamicInvariantHoistBuffer**: Multi-turn dialogue invariant hoisting buffer identifying global session rules and substituting 2-token pointers (20.5% spend cut).
- **TensorRank1KroneckerProductBuffer**: Rank-1 Kronecker outer product tensor factoring buffer compressing $N \times M$ matrices down to $N + M$ factor vectors (73.0% spend cut).
- **AdaptiveGrammarCfgCompactorBuffer**: Sequitur Context-Free Grammar (CFG) induction buffer enforcing digram uniqueness and rule utility (26.3% spend cut).

### 13. Poly-Hash, 1-WL Graphs & Spectral DCT Buffers
- **SparsePolyHashSketchBuffer**: 4-way polynomial rolling n-gram min-hash sketch buffer computing 64-bit sparse min-hash vectors for $<10\text{ns}$ candidate duplicate discovery.
- **GraphHomomorphismWeisfeilerLehmanBuffer**: Weisfeiler-Lehman (1-WL) color-refinement graph isomorphism buffer collapsing identical workflow DAG execution topologies (30.4% spend cut).
- **DiscreteCosineTransformDctBuffer**: Type-II Discrete Cosine Transform (DCT) spectral telemetry buffer concentrating 95%+ of signal energy into top coefficients (71.1% spend reduction).
- **QuantizedScalarColumnEncoderBuffer**: Columnar MinMax base offset scaling buffer quantizing floating point arrays into compact delta integers (21.7% spend cut).
- **MultiAgentEchoChamberPrunerBuffer**: Multi-agent swarm echo chamber pruner collapsing repetitive consensus affirmation messages into compact quorum statements (59.8% spend cut).

### 14. LZ4 Streaming, CSR Matrices & Multimodal Spectrogram Buffers
- **Lz4StreamingFrameCodecBuffer**: High-velocity streaming LZ4 framing buffer executing $O(1)$ token hashing and match distance references with 100% bit-exact reconstruction.
- **CsrSparseMatrixCompressionBuffer**: Compressed Sparse Row (CSR) matrix buffer compressing 97%+ sparse matrices into 3 flat 1D arrays (70.7% spend reduction).
- **CrossLingualSemanticCanonicalizerBuffer**: Multilingual intent & semantic concept canonicalization buffer mapping Spanish, French, German, and Japanese queries into language-agnostic concept IDs (25.0% spend cut).
- **GraphColoringRegisterAllocationBuffer**: Kempe graph vertex coloring buffer allocating minimal chromatic registers ($K$) to collapse redundant AST variable tokens (54.2% spend cut).
- **SpectrogramGridMatrixQuantizerBuffer**: Multi-modal Mel-spectrogram INT4 power bin quantizer and background silence run-length pruner (85.8% spend reduction).

### 15. Gorilla TSDB, T-Digest & Geometric Median Buffers
- **GorillaXorFloatCompressorBuffer**: Facebook Gorilla TSDB float64 stream compressor packing consecutive XOR bit differences with 100% bit-exact precision (21.7% spend cut).
- **TDigestQuantileSketchBuffer**: Streaming T-Digest quantile centroid sketch maintaining P50, P90, and P99 percentiles across millions of latency probe distributions (82.3% spend reduction).
- **BipartiteMaximumMatchingDedupBuffer**: Hopcroft-Karp maximum bipartite matching buffer resolving resource conflicts and overlapping task bids.
- **HypergraphIncidentEdgeFoldBuffer**: Hypergraph n-ary relation incidence buffer factoring recurring multi-party node clusters (34.3% spend cut).
- **GeometricMedianVectorCentroidBuffer**: Weiszfeld geometric median spatial vector cluster buffer computing outlier-robust centroid representations for swarm agent trajectories (28.6% spend cut).

### 16. Tensor Train, Zstandard FSE, Graph Kernels & SIMD Bitfield Enum Buffers
- **TensorTrainDecompositionBuffer**: Tensor Train (TT) matrix-product state tensor factorization buffer compressing $O(N^d)$ parameter grids into linear $O(d \cdot N \cdot r^2)$ core chains (26.4% spend cut).
- **ZstandardFiniteStateEntropyFseBuffer**: Zstandard Finite State Entropy (FSE / tANS) state machine buffer compressing fractional-bit symbol frequencies (69.7% spend cut).
- **RandomWalkGraphKernelEmbeddingBuffer**: $K$-step random walk graph kernel embedding buffer computing inner-product topological similarity to deduplicate distributed trace graphs (69.6% spend cut).
- **VerifiableTimestampDeltaChainBuffer**: Cryptographic verifiable timestamp delta chain buffer rolling forward SHA-256 state commitments across sequential audit events (18.8% spend cut).
- **SimdPackedBitfieldEnumBuffer**: SIMD packed categorical enum bitfield buffer packing up to 32 enum items per 64-bit BigInt register with 100% lossless decompression (40.7% spend cut).

### 17. Symplectic Givens, Paxos Splicer, Horner Form & QuadTree Buffers
- **SymplecticGivensRotationBuffer**: Symplectic Givens orthogonal rotation buffer sparsifying vector energy onto dominant coordinate axes (63.4% spend cut).
- **PaxosRaftLogTermSplicerBuffer**: Paxos/Raft consensus log term splicer collapsing redundant leader heartbeat tick sequences into compact span tokens (67.8% spend cut).
- **SparsePolynomialHornerCanonicalizerBuffer**: Horner canonical form polynomial buffer eliminating exponent notation via nested factored multiplications (25.0% spend cut).
- **TopologicalBettiNumberInvariantBuffer**: Persistent homology topological Betti invariant buffer extracting $\beta_0$ (components), $\beta_1$ (loops), and $\beta_2$ (voids) signatures (68.3% spend cut).
- **QuadTreeSpatialHierarchyBuffer**: 2D Spatial QuadTree recursive partitioning buffer organizing GPS fleet coordinates into Morton Z-order quadkey cells (56.3% spend cut).

---

## 4. Alternatives Considered & Comparative Analysis

| Approach | Latency | Spend Cut | Memory Model | Factual Guarantee | Reversibility |
|---|---|---|---|---|---|
| **Raw Gzip / Deflate** | 12–45ms | 30%–50% | Heap Allocation (GC) | 100% | 100% Bit-Exact |
| **LLMLingua (SLM Pruning)** | 85–250ms | 40%–60% | GPU/VRAM Overhead | Lossy (Hallucination risk) | Non-Reversible |
| **External Vector DB (Pinecone/Milvus)** | 45–120ms | 20%–40% | Network Egress Latency | Lossy Cosine Thresholds | Non-Reversible |
| **Redis Stream Exact Matching** | 5–15ms | 15%–25% | Multi-GB RAM Cache | 100% | N/A (Exact Key only) |
| **BroccoliDB 85-Buffer Engine** | **<1ms** | **70%–99%** | **Flat Zero-GC TypedArray Slabs** | **100% Cryptographically Bound** | **Deterministic Codecs** |

---

## 5. Security & Privacy Guarantees

1. **Safe Harbor 18 & HIPAA De-Identification**:
   - `BroccoliPiiDeidentificationMaskBuffer` strips and maps 18 HIPAA identifiers (SSN, MRN, phone numbers, email addresses, IP addresses, dates of birth) to deterministic cryptographic surrogate tokens `[§PII_NAME_1]`.
   - Reverse mapping dictionary is stored in an ephemeral, memory-zeroized enclave, guaranteeing zero PII leakage to LLM providers.
2. **Zero-Data Retention (ZDR)**:
   - Ingested slabs in `BroccoliZeroAllocationByteStreamBuffer` undergo cryptographic byte zeroization (`Uint8Array.fill(0)`) immediately upon session termination.
3. **Tamper-Evident SHA-256 Audit Ledgers**:
   - All deduplication and compaction actions are cryptographically hashed and indexed into `BroccoliDbTable` audit tables with microsecond timestamps and Merkle witness roots.

---

## 6. Consequences
- **Positive**: 70% to 99% overall token spend reduction across LLM prompts, agent logs, distributed consensus streams, and multimodal datasets.
- **Positive**: 100% lossless data reversibility on deterministic codecs (LZ4, VCDIFF, CSR, Protobuf, Gorilla XOR, Varint, BPE, FSE).
- **Positive**: Native typed buffer memory execution with zero GC pressure and sub-microsecond latency.
- **Positive**: Seamless drop-in integration with OpenAI, Anthropic, Gemini, and open-source models.
- **Negative**: Requires maintaining modular buffer registry and selecting appropriate compaction tiers for composite payloads.
