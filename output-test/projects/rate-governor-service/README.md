# Continuous Rate Governor Microservice

High-performance continuous token-bucket governor synthesized by **GALXAI GPT-5.6 Sol**.

## Architectural Highlights
- **Sub-Millisecond Precision**: Continuous delta timestamp calculus eliminates timer lag.
- **Zero Floating-Point Drift**: Clamped strictly between 0 and configured capacity.
- **Lock-Free Concurrency**: Suitable for high-throughput gateway edge routing.

## Usage
```typescript
import { ContinuousRateGovernor } from './ContinuousRateGovernor';

const governor = new ContinuousRateGovernor({ capacity: 100, refillRatePerSec: 20 });
const { allowed, remaining } = governor.tryAcquire(1);
```
