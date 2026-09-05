export interface JobRole {
  id: string;
  title: string;
  department: 'Engineering' | 'Research' | 'Product' | 'Security' | 'DevRel';
  location: string;
  type: 'Full-Time' | 'Contract';
  experience: 'Senior' | 'Staff' | 'Lead' | 'Mid';
  experienceLabel: string;
  urgency: 'Immediate' | 'Active';
  description: string;
  tags: string[];
  first90Days: string[];
  responsibilities: string[];
  requirements: string[];
  niceToHave: string[];
}

export const JOB_ROLES: JobRole[] = [
  // 1. Engineering
  {
    id: 'dist-systems-engineer',
    title: 'Staff Distributed Systems Engineer',
    department: 'Engineering',
    location: 'Remote (Worldwide) or San Francisco, CA',
    type: 'Full-Time',
    experience: 'Staff',
    experienceLabel: 'Staff / Principal (5+ yrs)',
    urgency: 'Immediate',
    tags: ['Rust', 'eBPF', 'Tokio', 'Anycast BGP', 'Linux Kernel', 'HTTP/2'],
    description: 'Lead the architecture of our global Anycast routing substrate and sub-15ms edge proxy fabric handling billions of daily OpenAI Codex and GPT-5.6 tokens with zero downtime.',
    first90Days: [
      'Day 30: Deploy custom zero-copy buffer routing in Rust across 10 Anycast Edge PoPs.',
      'Day 60: Shard active TCP connection pooling for GPT-5.6 streaming, shaving 8ms off initial TTFT.',
      'Day 90: Architect automated kernel-level failover when upstream region packet loss exceeds 0.2%.',
    ],
    responsibilities: [
      'Design, benchmark, and deploy low-latency Anycast routing nodes in Rust and Go across 40+ global Edge PoPs.',
      'Optimize kernel-level socket handling, TCP connection pooling, and HTTP/2 stream multiplexing for zero-hesitation streaming.',
      'Implement real-time upstream health scoring, predictive failover algorithms, and automated traffic rebalancing.',
      'Collaborate with foundation model providers to expand wholesale direct-peering connections.',
    ],
    requirements: [
      'Deep mastery of distributed systems, TCP/IP, BGP/Anycast routing, and Linux networking internals (eBPF, epoll).',
      'Production experience with high-throughput systems written in Rust, C++, or Go.',
      'Familiarity with streaming protocols (SSE, WebSockets, gRPC) and cryptographic protocols (mTLS, TLS 1.3).',
      'Strong empathy for developer ergonomics and ultra-reliable infrastructure design.',
    ],
    niceToHave: [
      'Experience authoring custom Linux network drivers or eBPF tracing programs.',
      'Prior background at a high-scale CDN, DNS provider, or cloud hyperscaler.',
    ],
  },
  {
    id: 'gpu-cuda-engineer',
    title: 'Senior GPU Systems & CUDA Kernel Optimization Engineer',
    department: 'Engineering',
    location: 'Remote (Worldwide) or Austin, TX',
    type: 'Full-Time',
    experience: 'Senior',
    experienceLabel: 'Senior (4+ yrs)',
    urgency: 'Immediate',
    tags: ['CUDA', 'Triton', 'FlashAttention-3', 'vLLM', 'NCCL', 'TensorRT-LLM'],
    description: 'Optimize low-level GPU memory layouts, custom Triton kernels, and speculative decoding execution paths across our dedicated H100/H200 cluster fleet.',
    first90Days: [
      'Day 30: Benchmark and profile kernel-level bottlenecks across GPT-5.6 Sol reasoning passes.',
      'Day 60: Deploy fused FlashAttention-3 kernels with customized KV-cache compression layers.',
      'Day 90: Reduce median token generation latency by 35% through custom CUDA graph execution.',
    ],
    responsibilities: [
      'Author and optimize custom CUDA and Triton kernels for speculative decoding and attention mechanisms.',
      'Profile memory bandwidth, register pressure, and compute occupancy across NVIDIA Hopper and Blackwell architectures.',
      'Interface directly with distributed inference runtimes (vLLM, TensorRT-LLM, SGLang) to minimize inter-GPU synchronization overhead.',
      'Maintain automated GPU cluster health checks, thermal monitoring, and ECC error mitigation.',
    ],
    requirements: [
      'Deep fluency with modern CUDA (C++/Triton), GPU memory hierarchies, and warp-level primitives.',
      'Hands-on experience optimizing LLM inference runtimes or high-performance scientific computing workloads.',
      'Solid debugging skills with NVIDIA Nsight Systems, Nsight Compute, and PyTorch Profiler.',
      'Bachelor’s or Master’s in Computer Science, Electrical Engineering, or equivalent practical experience.',
    ],
    niceToHave: [
      'Contributions to open-source LLM inference engines (vLLM, TensorRT-LLM, llama.cpp, SGLang).',
      'Experience with FP8 / FP4 quantization techniques and mixed-precision arithmetic.',
    ],
  },
  {
    id: 'kernel-ebpf-specialist',
    title: 'Linux Kernel & eBPF Networking Specialist',
    department: 'Engineering',
    location: 'Remote (Worldwide)',
    type: 'Full-Time',
    experience: 'Staff',
    experienceLabel: 'Staff (5+ yrs)',
    urgency: 'Immediate',
    tags: ['eBPF', 'XDP', 'BCC', 'Linux Kernel', 'C', 'Rust', 'TC / Netfilter'],
    description: 'Author high-velocity packet filters, XDP bypass routes, and kernel-level observability hooks to make our edge proxy indistinguishable from local compute.',
    first90Days: [
      'Day 30: Implement eBPF socket-level load balancing bypassing standard iptables overhead.',
      'Day 60: Deploy XDP kernel-level rate limiting processing 5M+ packets/sec with zero drops.',
      'Day 90: Build automated kernel tracepoint telemetry monitoring TCP retransmissions in real-time.',
    ],
    responsibilities: [
      'Design, write, and verify production eBPF programs in C and Rust for XDP and TC hooks.',
      'Optimize Linux network stack parameters (TCP buffer tuning, epoll, SO_REUSEPORT) across edge fleets.',
      'Maintain kernel compatibility across major distributions (Debian, RHEL, Ubuntu) and cloud hypervisors.',
      'Collaborate with distributed systems engineers to build zero-copy socket proxies.',
    ],
    requirements: [
      'Deep understanding of Linux network internals, socket layers, sk_buff data structures, and netlink.',
      'Fluency in C and Rust with hands-on experience using libbpf, aya, or cilium/ebpf.',
      'Demonstrated experience debugging subtle kernel race conditions, packet drops, and memory leaks.',
    ],
    niceToHave: [
      'Contributions to the Linux kernel network subsystem or eBPF tooling.',
      'Experience with DPDK or hardware NIC offloading.',
    ],
  },
  {
    id: 'backend-protocol-engineer',
    title: 'Senior Backend & High-Throughput Protocol Engineer',
    department: 'Engineering',
    location: 'Remote (Worldwide)',
    type: 'Full-Time',
    experience: 'Senior',
    experienceLabel: 'Senior (4+ yrs)',
    urgency: 'Active',
    tags: ['Go', 'Rust', 'PostgreSQL', 'Redis', 'WebSockets', 'gRPC'],
    description: 'Architect the resilient transactional backbone handling rate limiting, API key generation, wholesale compute billing, and zero-loss credit meters.',
    first90Days: [
      'Day 30: Re-architect token balance deduction to operate with sub-millisecond atomic Redis pipelines.',
      'Day 60: Deploy bidirectional WebSocket multiplexing for streaming multi-turn reasoning logs.',
      'Day 90: Implement automated multi-master PostgreSQL replication for global key authentication.',
    ],
    responsibilities: [
      'Design high-concurrency microservices in Go and Rust powering our API gateway, billing clearinghouse, and user quotas.',
      'Maintain zero-hesitation Redis clusters and partitioned PostgreSQL databases supporting millions of operations per second.',
      'Ensure sub-millisecond API key authentication and credit verification without blocking the main event loops.',
      'Build rich developer telemetry endpoints with rate-limit headers and real-time usage webhooks.',
    ],
    requirements: [
      'Strong production experience building concurrent backend services in Go, Rust, or modern C++.',
      'Mastery of database indexing, query optimization, connection pooling, and cache invalidation strategies.',
      'Understanding of distributed consensus, idempotency keys, and payment gateway architectures.',
      'Commitment to writing clean, well-tested, and maintainable backend code.',
    ],
    niceToHave: [
      'Experience building financial ledger systems or wholesale billing engines.',
      'Familiarity with Stripe API / Stripe Connect integration protocols.',
    ],
  },
  {
    id: 'sre-reliability-engineer',
    title: 'Senior Site Reliability & Edge Infrastructure Engineer',
    department: 'Engineering',
    location: 'Remote (Worldwide)',
    type: 'Full-Time',
    experience: 'Senior',
    experienceLabel: 'Senior (4+ yrs)',
    urgency: 'Active',
    tags: ['Kubernetes', 'Terraform', 'ClickHouse', 'Prometheus', 'Grafana', 'SLA 99.99%'],
    description: 'Build observability, auto-scaling telemetry, and self-healing infrastructure across our multi-cloud deployment fleet.',
    first90Days: [
      'Day 30: Unify cross-cloud Prometheus metrics and ClickHouse telemetry pipelines.',
      'Day 60: Implement automated multi-region failover tests executing daily without user impact.',
      'Day 90: Reduce median infrastructure MTTR to under 45 seconds with automated remediation.',
    ],
    responsibilities: [
      'Deploy, scale, and maintain multi-region Kubernetes clusters, ClickHouse clusters, and edge proxy fleets.',
      'Build real-time SLI/SLA dashboards, automated anomaly detection, and sub-minute incident response runbooks.',
      'Drive infrastructure-as-code with Terraform, Pulumi, and GitOps workflows with automated canary rollouts.',
      'Optimize cloud compute expenditures while maintaining 99.99% active-active uptime guarantees.',
    ],
    requirements: [
      'Demonstrated experience operating high-scale, mission-critical production infrastructure in public clouds.',
      'Proficiency with Kubernetes, Terraform, Prometheus/Grafana, ClickHouse, and Postgres.',
      'Strong scripting ability in Python, Go, or Bash for automated remediation and tooling.',
      'Participated in on-call rotations with a calm, methodical debugging mindset.',
    ],
    niceToHave: [
      'Experience managing ClickHouse clusters storing billions of daily telemetry records.',
      'Certifications or deep familiarity with AWS/GCP multi-region architectures.',
    ],
  },

  // 2. Research
  {
    id: 'reasoning-research-engineer',
    title: 'Frontier Reasoning & Inference Research Engineer',
    department: 'Research',
    location: 'Remote (Worldwide) or New York, NY',
    type: 'Full-Time',
    experience: 'Senior',
    experienceLabel: 'Senior (4+ yrs)',
    urgency: 'Immediate',
    tags: ['PyTorch', 'vLLM', 'Speculative Decoding', 'BroccoliDB', 'Codex', 'CUDA'],
    description: 'Pioneer advanced speculative decoding algorithms, rolling context compression, and multi-turn persona evaluation frameworks for next-generation frontier intelligence.',
    first90Days: [
      'Day 30: Implement draft-model speculative decoding pipeline for Codex coding tasks.',
      'Day 60: Integrate rolling KV-cache reuse with BroccoliDB semantic indexing layer.',
      'Day 90: Publish empirical benchmark demonstrating 2.4x throughput speedup on agentic reasoning.',
    ],
    responsibilities: [
      'Research and implement high-efficiency speculative decoding and key-value cache reuse systems.',
      'Develop automated cognitive benchmarks, hallucination detection heuristics, and Codex execution testbeds.',
      'Design hybrid vector-relational context retrieval architectures with BroccoliDB and pgvector.',
      'Publish technical deep dives and reproducible benchmarks for the AI engineering community.',
    ],
    requirements: [
      'Strong theoretical and practical background in Transformer architectures, attention mechanisms, and prompt optimization.',
      'Experience fine-tuning and evaluating models using PyTorch, vLLM, TensorRT-LLM, or Hugging Face.',
      'Solid programming proficiency in Python and TypeScript/C++ for high-performance inference pipelines.',
      'Prior contributions to open-source AI tooling or academic publications in NLP/ML systems is a plus.',
    ],
    niceToHave: [
      'Hands-on CUDA kernel programming or Triton kernel optimization experience.',
      'Familiarity with memory-efficient attention (FlashAttention-3, PagedAttention).',
    ],
  },
  {
    id: 'ml-compiler-engineer',
    title: 'ML Compiler & Kernel Optimization Engineer (MLIR / Triton)',
    department: 'Research',
    location: 'Remote (Worldwide)',
    type: 'Full-Time',
    experience: 'Staff',
    experienceLabel: 'Staff (5+ yrs)',
    urgency: 'Immediate',
    tags: ['MLIR', 'LLVM', 'Triton', 'TVM', 'Graph Lowering', 'FP8 Quantization'],
    description: 'Build graph-level compilers, operator fusion passes, and automated kernel code generators transforming high-level PyTorch computational graphs into silicon-tuned machine instructions.',
    first90Days: [
      'Day 30: Implement automated operator fusion passes for speculative decoding draft models.',
      'Day 60: Lower custom transformer attention blocks to Triton IR with auto-tuned block sizes.',
      'Day 90: Deliver a 25% end-to-end latency reduction for GPT-5.6 Terra inference graphs.',
    ],
    responsibilities: [
      'Design and maintain MLIR dialect passes and graph lowering pipelines for frontier LLMs.',
      'Optimize automatic memory planning, buffer reuse, and kernel fusion for large context models.',
      'Collaborate with hardware acceleration teams to support next-generation AI silicon (NVIDIA Blackwell, AMD MI300X, Google TPU).',
      'Build automated benchmarking suites that continuously detect kernel regressions across git commits.',
    ],
    requirements: [
      'Deep understanding of compiler design principles, intermediate representations (IR), and SSA form.',
      'Experience with MLIR, LLVM, TVM, IREE, or OpenAI Triton compiler backends.',
      'Solid C++ and Python programming expertise with strong algorithmic rigor.',
    ],
    niceToHave: [
      'Contributions to LLVM, MLIR, or Triton open-source compiler repositories.',
      'Experience with custom hardware accelerator architectures and NPU instruction sets.',
    ],
  },
  {
    id: 'ai-agent-architect',
    title: 'AI Agent Architect & Cognitive Systems Lead',
    department: 'Research',
    location: 'Remote (Worldwide) or Seattle, WA',
    type: 'Full-Time',
    experience: 'Lead',
    experienceLabel: 'Lead / Principal (5+ yrs)',
    urgency: 'Immediate',
    tags: ['Agent Swarms', 'Tool Calling', 'Planning Algorithms', 'Tree-of-Thought', 'RLHF'],
    description: 'Design autonomous multi-agent orchestration primitives, self-correcting code synthesis pipelines, and hierarchical task planning engines.',
    first90Days: [
      'Day 30: Architect tool-calling benchmark evaluation suite across 100+ standard developer APIs.',
      'Day 60: Launch multi-agent cooperative execution harness with automated rollbacks on failure.',
      'Day 90: Deploy long-horizon planning runtime supporting 50+ recursive tool executions.',
    ],
    responsibilities: [
      'Pioneer agentic execution frameworks that enable autonomous coding, debugging, and verification swarms.',
      'Build robust structured output guarantees (JSON Schema, Zod) and dynamic parameter resolution.',
      'Implement multi-agent memory synthesis layers that prune obsolete context while preserving essential system goals.',
      'Evaluate emergent reasoning behaviors and create resilient safety fences around autonomous agent tool use.',
    ],
    requirements: [
      'Extensive experience building production autonomous agent workflows, coding assistants, or planning systems.',
      'Deep understanding of model tool-use APIs, function calling mechanics, and prompt orchestration.',
      'Strong coding skills in Python and TypeScript with an emphasis on rock-solid error handling.',
      'Passionate about the future of autonomous systems and developer productivity multiplier tools.',
    ],
    niceToHave: [
      'Experience with reinforcement learning from human / AI feedback (RLHF / RLAIF).',
      'Author of open-source agent frameworks or developer productivity extensions.',
    ],
  },
  {
    id: 'multimodal-vision-engineer',
    title: 'Multimodal & Realtime Audio/Vision Systems Engineer',
    department: 'Research',
    location: 'Remote (Worldwide)',
    type: 'Full-Time',
    experience: 'Senior',
    experienceLabel: 'Senior (3+ yrs)',
    urgency: 'Active',
    tags: ['WebRTC', 'Diffusion Models', 'Audio Streaming', 'Whisper', 'Vision Transformers'],
    description: 'Build ultra-low latency multimodal streaming pipelines combining realtime speech synthesis, visual recognition, and high-fidelity image diffusion models.',
    first90Days: [
      'Day 30: Deploy sub-200ms end-to-end voice loop using WebSockets and streaming neural audio.',
      'Day 60: Implement parallelized image generation pipelines with instant progressive previews.',
      'Day 90: Launch multimodal companion studio integrating synchronized avatar gestures and voice.',
    ],
    responsibilities: [
      'Develop real-time bidirectional audio/video streaming pipelines over WebRTC and WebSockets.',
      'Optimize diffusion model inference pipelines for instant 4K image synthesis and rapid variation generation.',
      'Implement zero-latency speech-to-text (STT) and text-to-speech (TTS) streaming buffers.',
      'Collaborate with the frontend team to deliver rich, responsive multimodal character interactions.',
    ],
    requirements: [
      'Experience with modern generative media models (Diffusion models, GANs, Neural Audio, VAEs).',
      'Proficiency in Python, C++, or Rust with strong knowledge of audio/video codecs (Opus, H.264, WebM).',
      'Familiarity with streaming protocols (WebRTC, RTSP, chunked HTTP/2 streaming).',
      'Strong eye for perceptual quality, audio fidelity, and latency optimization.',
    ],
    niceToHave: [
      'Experience optimizing Whisper or Bark/Fish-Speech models for real-time edge streaming.',
      'Background in game engine audio or interactive computer graphics.',
    ],
  },

  // 3. Product & Design
  {
    id: 'fullstack-ai-product-architect',
    title: 'Lead Full-Stack AI Product Architect',
    department: 'Product',
    location: 'Remote (Worldwide)',
    type: 'Full-Time',
    experience: 'Lead',
    experienceLabel: 'Lead / Principal (5+ yrs)',
    urgency: 'Immediate',
    tags: ['Next.js 15', 'React 19', 'TypeScript', 'Tailwind', 'WebSockets', 'Canvas'],
    description: 'Craft world-class conversational experiences, developer dashboards, studio tools, and drop-in UI primitives using Next.js 15, React 19, and Tailwind.',
    first90Days: [
      'Day 30: Redesign the core streaming response renderer with sub-frame token rendering.',
      'Day 60: Launch multi-character live studio workspace with synchronized audio/video playback.',
      'Day 90: Build developer telemetry sandbox with zero-layout-shift real-time charting.',
    ],
    responsibilities: [
      'Own and advance the core user experience across the inference playground, gateway controls, and real-time observability telemetry.',
      'Architect resilient client-side state management with sub-millisecond local caching and offline recovery.',
      'Build rich interactive animations, streaming markdown parsers, and custom audio/image multimodal interfaces.',
      'Ensure WCAG AAA accessibility, bulletproof responsive layouts, and zero-layout-shift UI performance.',
    ],
    requirements: [
      'Mastery of modern React (Server Components, Actions, Hooks), Next.js App Router, and TypeScript.',
      'Obsession with UI craft, micro-interactions, responsive typography, and dark-mode aesthetic excellence.',
      'Experience building streaming text/markdown renderers with syntax highlighting, math (KaTeX), and code execution.',
      'Track record of shipping viral or beloved consumer/developer software products.',
    ],
    niceToHave: [
      'Experience building rich WebGL/Canvas visualization widgets or generative AI studio tools.',
      'Strong graphic design sensibility and typography fundamentals.',
    ],
  },
  {
    id: 'staff-product-designer',
    title: 'Staff Product Designer (AI Interactions & Canvas)',
    department: 'Product',
    location: 'Remote (Worldwide) or San Francisco, CA',
    type: 'Full-Time',
    experience: 'Staff',
    experienceLabel: 'Staff (5+ yrs)',
    urgency: 'Immediate',
    tags: ['Figma', 'Design Systems', 'Micro-Interactions', 'Dark Aesthetics', 'Prototyping'],
    description: 'Define the visual identity, dynamic motion language, and canvas workflows for GALX AI products, setting a new benchmark for AI tool aesthetic excellence.',
    first90Days: [
      'Day 30: Refine and document our comprehensive design token system across dark-mode palettes.',
      'Day 60: Prototype fluid gesture and motion states for the companion character canvas.',
      'Day 90: Conduct high-velocity user interviews to streamline developer API key onboarding.',
    ],
    responsibilities: [
      'Design stunning, high-density interfaces for AI prompt engineering, chat interactions, and telemetry analytics.',
      'Establish and maintain our comprehensive Figma design system, iconography, and motion design tokens.',
      'Work side-by-side with frontend engineers to ensure 100% visual fidelity in production code.',
      'Create interactive prototypes demonstrating micro-animations, loading shimmers, and state transitions.',
    ],
    requirements: [
      'World-class portfolio demonstrating exceptional taste in dark-mode interfaces, typography, and density.',
      'Extensive experience designing developer tools, creative software, or high-complexity consumer apps.',
      'Deep fluency with Figma variables, auto-layout, component variants, and interactive prototyping.',
      'Ability to communicate design rationale with clarity and empathy.',
    ],
    niceToHave: [
      'Ability to write clean CSS, Tailwind classes, or React prototypes.',
      '3D illustration or blender rendering skills for brand assets.',
    ],
  },
  {
    id: 'frontend-performance-engineer',
    title: 'Frontend Performance & Streaming UI Engineer',
    department: 'Product',
    location: 'Remote (Worldwide)',
    type: 'Full-Time',
    experience: 'Senior',
    experienceLabel: 'Senior (4+ yrs)',
    urgency: 'Active',
    tags: ['React 19', 'WebAssembly', 'Virtualization', 'DOM Optimization', 'Profiling'],
    description: 'Eliminate every millisecond of client-side latency. Specialize in high-framerate streaming renderers, zero-re-render chat lists, and WebAssembly token parsers.',
    first90Days: [
      'Day 30: Replace legacy markdown parsing with zero-copy streaming WebAssembly parser.',
      'Day 60: Implement virtualized windowing for chat threads containing 10,000+ continuous tokens.',
      'Day 90: Achieve 100/100 Core Web Vitals score across all mobile and desktop viewports.',
    ],
    responsibilities: [
      'Benchmark and optimize critical rendering paths in Next.js 15 and React 19 to guarantee 60fps streaming.',
      'Build memory-efficient virtual scrolling containers capable of displaying vast conversational histories.',
      'Implement offline caching mechanisms with IndexedDB and localStorage resilience.',
      'Eliminate layout shifts, unnecessary re-renders, and memory leaks across long-lived browser sessions.',
    ],
    requirements: [
      'Deep knowledge of browser rendering engines (Blink, WebKit, Gecko), layout pipelines, and paint cycles.',
      'Expertise in Chrome DevTools Performance profiler, memory snapshots, and CPU flamegraphs.',
      'Fluency with modern TypeScript, Web Workers, and WebAssembly compilation pipelines.',
      'Passion for lightning-fast user experiences and zero-lag interactions.',
    ],
    niceToHave: [
      'Experience writing Rust-to-WebAssembly modules for text processing.',
      'Prior work on high-frequency trading dashboards or collaborative canvas editors.',
    ],
  },

  // 4. Security & Cryptography
  {
    id: 'security-cryptography-lead',
    title: 'Principal Security & Cryptography Lead',
    department: 'Security',
    location: 'Remote (Worldwide) or London, UK',
    type: 'Full-Time',
    experience: 'Staff',
    experienceLabel: 'Principal / Lead (6+ yrs)',
    urgency: 'Immediate',
    tags: ['Zero Data Retention', 'Confidential Enclaves', 'SOC 2', 'Cryptography', 'HIPAA'],
    description: 'Ensure our Zero Data Retention (ZDR) guarantee remains cryptographically verifiable while maintaining SOC 2 Type II, ISO 27001, and HIPAA compliance.',
    first90Days: [
      'Day 30: Complete formal verification of ephemeral RAM buffer lifecycle management.',
      'Day 60: Deploy AWS Nitro / GCP Confidential Space enclave prototypes for sensitive model routing.',
      'Day 90: Lead continuous SOC 2 Type II audit automation and publish public cryptographic attestation.',
    ],
    responsibilities: [
      'Design and audit ephemeral RAM buffer isolation protocols to guarantee customer prompt data is never persisted.',
      'Lead secure enclave (AWS Nitro / GCP Confidential Computing) evaluation for confidential AI inference.',
      'Conduct regular internal penetration testing, threat modeling, and oversee external red team audits.',
      'Manage enterprise security reviews, custom BAA agreements, and automated continuous compliance pipelines.',
    ],
    requirements: [
      'Deep expertise in enterprise security, applied cryptography, confidential computing, and zero-trust architectures.',
      'Extensive experience managing SOC 2 Type II, ISO/IEC 27001:2022, and HIPAA regulatory audits.',
      'Familiarity with cloud security controls (AWS, GCP, Cloudflare) and secure software development lifecycle (SSDLC).',
      'Clear, persuasive technical communication for enterprise security review boards.',
    ],
    niceToHave: [
      'Experience with hardware security modules (HSMs) and zero-knowledge proof primitives.',
      'Prior security engineering experience at a top-tier fintech or enterprise security company.',
    ],
  },
  {
    id: 'ai-safety-red-team-lead',
    title: 'AI Safety & Adversarial Red Teaming Lead',
    department: 'Security',
    location: 'Remote (Worldwide)',
    type: 'Full-Time',
    experience: 'Senior',
    experienceLabel: 'Senior (4+ yrs)',
    urgency: 'Active',
    tags: ['Prompt Injection', 'Jailbreak Defense', 'OWASP LLM 01', 'Adversarial Robustness', 'Guardrails'],
    description: 'Safeguard our universal gateway against prompt injection attacks, indirect context poisoning, and model evasion vulnerabilities.',
    first90Days: [
      'Day 30: Deploy real-time prompt injection detector with <3ms latency overhead on Anycast edge.',
      'Day 60: Create automated red-teaming adversarial fuzzing suite testing 10,000 permutations daily.',
      'Day 90: Publish our open-source benchmark for enterprise LLM gateway adversarial resilience.',
    ],
    responsibilities: [
      'Design defensive heuristics and machine-learned classifiers that block prompt injections without false positives.',
      'Conduct continuous adversarial penetration tests against multi-modal and code reasoning models.',
      'Formulate security recommendations for enterprise customers routing confidential operational workflows.',
      'Maintain adherence with emerging AI regulations, including the EU AI Act and NIST AI RMF.',
    ],
    requirements: [
      'Demonstrated background in cybersecurity, offensive security, and adversarial machine learning.',
      'Familiarity with OWASP Top 10 for Large Language Models (Prompt Injection, Insecure Output Handling, Data Leakage).',
      'Strong programming proficiency in Python for automated exploit generation and defensive tooling.',
      'Methodical approach to finding subtle edge cases in complex probabilistic models.',
    ],
    niceToHave: [
      'Published research or CVEs in AI security, jailbreak analysis, or LLM safety.',
      'Offensive security certifications (OSCP, OSCE, GPEN).',
    ],
  },

  // 5. DevRel & Solutions
  {
    id: 'dx-cli-architect',
    title: 'Developer Experience (DX) & CLI Tools Architect',
    department: 'DevRel',
    location: 'Remote (Worldwide)',
    type: 'Full-Time',
    experience: 'Lead',
    experienceLabel: 'Lead (4+ yrs)',
    urgency: 'Immediate',
    tags: ['Rust CLI', 'TypeScript SDKs', 'Cursor Plugins', 'Developer Experience', 'LSP'],
    description: 'Craft the fastest, most delightful developer toolchain in artificial intelligence — from our native Rust terminal CLI to IDE autocomplete integrations.',
    first90Days: [
      'Day 30: Ship `galx` official Rust CLI with zero-dependency standalone binaries for macOS, Linux, and Windows.',
      'Day 60: Launch drop-in Cursor & VS Code extensions with real-time prompt token cost estimation.',
      'Day 90: Reduce median developer API integration time from 5 minutes to under 30 seconds.',
    ],
    responsibilities: [
      'Lead the architecture and design of our developer CLI tools, IDE extensions, and SDK wrappers.',
      'Create interactive terminal spinners, live progress bars, and high-fidelity formatted diff renderers.',
      'Obsess over zero-config developer onboarding, error messages, and documentation ergonomics.',
      'Act as the bridge between outside developers and internal infrastructure teams.',
    ],
    requirements: [
      'Mastery of developer tooling, terminal UI design, and CLI ergonomics in Rust, TypeScript, or Go.',
      'Deep passion for developer experience, concise command-line flags, and instant feedback loops.',
      'Experience building VS Code / Cursor plugins, Language Server Protocol (LSP) servers, or SDKs.',
    ],
    niceToHave: [
      'Author or maintainer of a widely used open-source CLI tool or developer utility.',
      'Active contributions to the Rust or TypeScript compiler/tooling ecosystem.',
    ],
  },
  {
    id: 'developer-relations-lead',
    title: 'Developer Relations & Technical Evangelist',
    department: 'DevRel',
    location: 'Remote (Worldwide)',
    type: 'Full-Time',
    experience: 'Mid',
    experienceLabel: 'Mid / Senior (3+ yrs)',
    urgency: 'Active',
    tags: ['Python SDK', 'TypeScript', 'Developer Experience', 'Technical Content', 'Discord'],
    description: 'Inspire and empower thousands of AI developers through high-quality SDKs, sample boilerplates, tutorials, and community engagement.',
    first90Days: [
      'Day 30: Launch official Python & TypeScript SDK v2 with native streaming and automatic caching.',
      'Day 60: Create 5 flagship video tutorials and GitHub templates for autonomous multi-agent swarms.',
      'Day 90: Host our first virtual AI builder hackathon with over 1,000 participating developers.',
    ],
    responsibilities: [
      'Author world-class developer tutorials, interactive quickstarts, and migration guides.',
      'Maintain open-source client libraries across TypeScript, Python, Go, and cURL.',
      'Engage with developers on Discord, GitHub, and Twitter to gather product feedback and unblock technical issues.',
      'Represent GALX AI at premier AI conferences, hackathons, and virtual developer demos.',
    ],
    requirements: [
      'Strong technical background with the ability to code functional full-stack AI demos and agent workflows.',
      'Exceptional written and verbal technical storytelling skills with a portfolio of published blogs or videos.',
      'Active presence in developer communities and genuine enthusiasm for developer productivity.',
      'Self-driven, proactive, and comfortable operating in high-autonomy environments.',
    ],
    niceToHave: [
      'Active YouTube channel, technical podcast, or popular technical newsletter.',
      'Experience organizing hackathons or developer workshops.',
    ],
  },
  {
    id: 'enterprise-solutions-architect',
    title: 'Enterprise Solutions Architect (AI Infrastructure)',
    department: 'DevRel',
    location: 'Remote (Worldwide) or New York, NY',
    type: 'Full-Time',
    experience: 'Senior',
    experienceLabel: 'Senior (4+ yrs)',
    urgency: 'Active',
    tags: ['Pre-Sales', 'VPC Peering', 'Architecture Reviews', 'Enterprise Migration', 'Net-30'],
    description: 'Partner with CTOs, VP of AI, and lead architects at Fortune 500s and high-growth AI startups to migrate their inference workloads onto GALX AI.',
    first90Days: [
      'Day 30: Design 3 custom migration architectures for enterprise customers migrating from OpenAI direct.',
      'Day 60: Standardize our Enterprise VPC Peering and dedicated Anycast routing runbooks.',
      'Day 90: Close and onboard 5 enterprise fleet accounts with multi-year compute commitments.',
    ],
    responsibilities: [
      'Conduct deep-dive architectural reviews with enterprise engineering leaders evaluating wholesale compute.',
      'Demonstrate how to achieve 25%–40% cost reductions and 75% prompt caching rebate with zero code changes.',
      'Provide white-glove technical onboarding, custom routing rules, and dedicated failover testing.',
      'Feed recurring customer feature requirements directly back to our core engineering sprint planning.',
    ],
    requirements: [
      'Strong technical grounding in cloud architecture (AWS, GCP, Azure), API gateways, and LLM orchestration.',
      'Proven track record as a Solutions Architect, Sales Engineer, or Technical Account Manager for developer products.',
      'Exceptional consultative communication and problem-solving abilities.',
      'Comfortable explaining complex low-latency networking, compliance DPAs, and wholesale financial models.',
    ],
    niceToHave: [
      'Experience working at an enterprise cloud or infrastructure provider (Cloudflare, AWS, Datadog, Snowflake).',
      'Hands-on coding ability to write proof-of-concept scripts in Python or Node.js.',
    ],
  },
];

export function getJobRoleById(id: string): JobRole | undefined {
  return JOB_ROLES.find((role) => role.id === id);
}

export function getAllJobRoleIds(): string[] {
  return JOB_ROLES.map((role) => role.id);
}
