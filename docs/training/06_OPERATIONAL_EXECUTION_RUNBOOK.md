# 🛠️ Document 06: Operational Execution Runbook

<!-- docs-scope: research-reference -->
> **Reading scope:** Research, evaluation, or planning reference within its stated domain. Results and proposed mechanisms do not establish current federation behavior or production performance. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

## Step-by-Step Operator Handbook, Telemetry & Anomaly Playbooks

---

## 1. On-Call Incident Playbooks

### Playbook 1: NCCL Ring Timeout / InfiniBand Connection Reset
**Symptom**: Slurm job output reports `NCCL WARN [send] Connection reset by peer` or process hangs indefinitely at barrier synchronization:
```bash
# 1. Inspect kernel dmesg for InfiniBand link flaps
dmesg -T | grep -i mlx5

# 2. Check for hung GPU ranks and issue graceful SIGTERM
kill -15 $(pgrep -f "axolotl|torchrun|accelerate")

# 3. If processes do not terminate within 10s, force kill
kill -9 $(pgrep -f "axolotl|torchrun|accelerate")

# 4. Relaunch with expanded socket timeout
export NCCL_COMM_BLOCKING=1
export NCCL_TIMEOUT=3600
accelerate launch -m axolotl.cli.train axolotl_train.yaml --resume_from_checkpoint=./checkpoints/last
```

---

### Playbook 2: CUDA Memory Fragmentation (`CUDA OOM` on Packed Sequences)
**Symptom**: `torch.cuda.OutOfMemoryError: CUDA out of memory` during variable-length packed sequence backward pass:
```bash
# 1. Enable PyTorch expandable segments allocator in environment
export PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True

# 2. Lower micro-batch size and increase gradient accumulation
sed -i 's/micro_batch_size: 4/micro_batch_size: 2/g' axolotl_train.yaml
sed -i 's/gradient_accumulation_steps: 4/gradient_accumulation_steps: 8/g' axolotl_train.yaml

# 3. Resume training from last checkpoint
accelerate launch -m axolotl.cli.train axolotl_train.yaml --resume_from_checkpoint=./checkpoints/last
```

---

### Playbook 3: Deadlocked Rank Termination Script (`kill_stalled_ranks.sh`)
```bash
#!/usr/bin/env bash
# Watchdog: Terminate orphaned distributed ranks occupying GPU memory
STALLED_PIDS=$(nvidia-smi --query-compute-apps=pid --format=csv,noheader,nounits)
if [ -n "$STALLED_PIDS" ]; then
    echo "Found orphaned GPU processes: $STALLED_PIDS"
    for pid in $STALLED_PIDS; do
        echo "Killing PID $pid..."
        kill -9 $pid 2>/dev/null
    done
    echo "GPU memory cleared successfully."
else
    echo "No orphaned GPU processes detected."
fi
```

---

## 2. Telemetry Alarm Matrix & PagerDuty Alerts

| Metric Monitored | Warning Threshold (SEV-3) | Critical Alarm (SEV-1) | Automated Action |
|---|---|---|---|
| **Validation Loss Delta** | $\Delta \mathcal{L}_{\text{val}} > +0.10$ | $\Delta \mathcal{L}_{\text{val}} > +0.40$ | Alert ML lead on warning; auto-rollback checkpoint on critical. |
| **Gradient L2 Norm** | $\|\mathbf{g}\|_2 > 2.5$ | $\|\mathbf{g}\|_2 > 5.0$ or NaN | Clip gradients to $1.0$; halt job if NaN is detected. |
| **GPU Core Temperature** | $\text{Temp} \ge 78^\circ\text{C}$ | $\text{Temp} \ge 84^\circ\text{C}$ | Trigger fan speed increase; throttle clock frequency. |
| **R2 Presigned Shard Latency**| $\text{Latency} \ge 450\text{ms}$ | HTTP 5xx on 3 consecutive shards | Failover to local shared-memory cache; alert Data SRE. |
| **Docker Sandbox Memory** | $\text{RAM} \ge 80\%$ | $\text{RAM} \ge 95\%$ | Terminate container; re-spawn with clean memory limits. |

---

## 3. Dead-Letter Queue (DLQ) Auto-Drain Protocol

If continuous data streaming from live user interactions experiences network timeouts:
```bash
# Verify DLQ buffer size
curl "http://localhost:3000/api/internal/training?format=telemetry"

# Trigger replay and drain of failed shards
curl -X POST "http://localhost:3000/api/internal/training" \
  -H "Authorization: Bearer $GALXAI_INTERNAL_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "replay_dlq"}'
```
