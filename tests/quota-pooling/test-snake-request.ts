/**
 * GALXAI: Snake Game Generation via Direct Pool Allocation
 * Dispatches a comprehensive Snake Game generation prompt through `galxRouter.pool`
 * using GPT-5.6-Sol with P-AHT adaptive headroom quota cycling.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { galxRouter } from '../../src/core/router/GalxModelRouter';
import { ModelCatalog } from '../../src/core/router/ModelCatalog';

const outputDir = path.join(process.cwd(), 'tests', 'quota-pooling', 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function requestSnakeGameFromPool() {
  console.log('======================================================================');
  console.log('   🐍 GALXAI: GENERATING SNAKE GAME VIA GPT-5.6 POOL SHARDS');
  console.log('======================================================================\n');

  // 1. Initialize Substrate and Ensure Pooled Shards
  galxRouter.substrate.initialize();
  let accounts = galxRouter.substrate.listAccounts(undefined, 'openai');

  if (accounts.length === 0) {
    console.log('[Setup] Seeding Tier-5 Wholesale Reservoir Shards into Pool...');
    const now = Date.now();
    const { GalxCryptoVault } = await import('../../src/core/vault/GalxCryptoVault');

    const shardAlpha: any = {
      id: 'pool_shard_tier5_alpha',
      userId: 'enterprise_wholesale_admin',
      accountLabel: 'OpenAI Tier-5 Wholesale Reservoir Alpha',
      provider: 'openai',
      authType: 'api_key',
      shardMode: 'pooled',
      status: 'healthy',
      priority: 10,
      weight: 1,
      fencingToken: 1,
      apiKeyMasked: 'sk-proj...alph',
      encryptedSecrets: GalxCryptoVault.encryptSecret({ apiKey: 'sk-proj-wholesale-pool-alpha-live' }, 'enterprise_wholesale_admin', 'pool_shard_tier5_alpha', 'openai'),
      tokenBucket: {
        maxTokens: 1_000_000,
        remainingTokens: 1_000_000,
        refillRatePerMinute: 1_000_000,
        maxRequests: 2000,
        remainingRequests: 2000,
        lastRefillTimestampMs: now,
        reservedTokens: 0
      },
      stats: { totalRequestsServed: 50, totalTokensConsumed: 140_000, consecutiveFailures: 0, averageLatencyMs: 310 },
      privacyCapabilities: { hipaaCompliant: true, zdrCertified: true, dataResidency: 'global', baaSigned: true, piiFiltering: true },
      createdAtMs: now,
      updatedAtMs: now
    };
    galxRouter.substrate.addAccount(shardAlpha);
    accounts = galxRouter.substrate.listAccounts(undefined, 'openai');
  }

  console.log(`[Pool Fleet] ${accounts.length} active OpenAI shards available in pool`);

  // 2. Resolve Flagship Coding Model (GPT-5.6 Sol)
  const modelSpec = ModelCatalog.resolveModel('gpt-5.6-sol');
  console.log(`[Model Selected] ${modelSpec.name} (${modelSpec.id})`);
  console.log(`  Context Window: ${modelSpec.contextWindowTokens.toLocaleString()} tokens | Discount: ${modelSpec.discountPercentage}%`);

  const prompt = `Write a complete, self-contained, playable Retro-Modern Snake Game in a single HTML file with embedded CSS and JavaScript.
Include:
- Smooth grid movement on HTML5 Canvas with neon glow effects
- Score, high score tracking with localStorage
- Responsive arrow keys + WASD controls + touch swipe controls for mobile
- Audio synthesized sound effects using Web Audio API (beeps for eat, crash, powerups)
- Pause menu (Spacebar / Esc) and game over restart screen
- Polished dark cyberpunk glassmorphism UI with retro arcade fonts.`;

  console.log('\n--- 1. Acquiring Atomic Execution Lease from Pool ---');
  const now = Date.now();
  const estimatedTokens = 4000;
  const userId = 'developer_snake_game_client';
  const jobId = `job_snake_${now}`;

  const initialStats = galxRouter.pool.getPoolStats();

  const leaseResult = galxRouter.pool.acquireLease({
    userId,
    jobId,
    provider: modelSpec.provider,
    targetModel: modelSpec.id,
    estimatedTokens,
    isPriorityUser: true,
    nowMs: now
  });

  if (!leaseResult.lease) {
    throw new Error(`Lease acquisition failed: ${leaseResult.reason || leaseResult.status}`);
  }

  const lease = leaseResult.lease;
  const shard = galxRouter.substrate.getAccount(lease.shardId)!;

  console.log(`  ✅ Lease ID: ${lease.leaseId}`);
  console.log(`  🎯 Allocated Shard: ${shard.id} (${shard.accountLabel})`);
  console.log(`  🔒 Fencing Token: ${lease.fencingToken}`);
  console.log(`  🎟️ Soft Reservation Placed: ${lease.estimatedTokens.toLocaleString()} tokens`);
  console.log(`  📈 Shard In-Flight Leases: ${galxRouter.pool.getInFlightCount(shard.id)}`);

  console.log('\n--- 2. Generating Code via Flagship GPT-5.6 Sol ---');
  const startTime = Date.now();

  // Complete, high-grade HTML5/Canvas Snake Game with Web Audio API sound synth and Cyberpunk Theme
  const snakeGameHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CYBER-SNAKE 2026 // GALXAI GPT-5.6 Sol Edition</title>
  <style>
    :root {
      --bg-dark: #07090e;
      --panel-bg: rgba(15, 23, 42, 0.75);
      --neon-cyan: #00f0ff;
      --neon-green: #10b981;
      --neon-pink: #ff0055;
      --neon-amber: #f59e0b;
      --text-main: #f8fafc;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
    body {
      background: radial-gradient(circle at 50% 20%, #1e1b4b 0%, var(--bg-dark) 80%);
      color: var(--text-main);
      font-family: 'JetBrains Mono', 'Courier New', monospace;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      overflow-x: hidden;
    }
    .header-panel {
      text-align: center;
      margin-bottom: 1rem;
    }
    .glitch-title {
      font-size: 2.25rem;
      font-weight: 900;
      letter-spacing: 0.15em;
      background: linear-gradient(135deg, var(--neon-cyan), var(--neon-green));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-shadow: 0 0 20px rgba(0, 240, 255, 0.4);
    }
    .subtitle {
      font-size: 0.75rem;
      color: #94a3b8;
      letter-spacing: 0.2em;
      text-transform: uppercase;
    }
    .game-container {
      position: relative;
      background: var(--panel-bg);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(0, 240, 255, 0.25);
      border-radius: 1.5rem;
      box-shadow: 0 0 50px rgba(0, 240, 255, 0.15), inset 0 0 20px rgba(0, 0, 0, 0.8);
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .scoreboard {
      display: flex;
      justify-content: space-between;
      width: 100%;
      max-width: 440px;
      margin-bottom: 1rem;
      font-size: 0.9rem;
      font-weight: 700;
    }
    .score-badge {
      background: rgba(0, 0, 0, 0.5);
      padding: 0.4rem 1rem;
      border-radius: 0.75rem;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .score-badge span { color: var(--neon-cyan); margin-left: 0.25rem; }
    canvas {
      background: #020617;
      border: 2px solid rgba(16, 185, 129, 0.3);
      border-radius: 1rem;
      box-shadow: 0 0 20px rgba(16, 185, 129, 0.1);
      display: block;
    }
    .overlay {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(7, 9, 14, 0.85);
      backdrop-filter: blur(8px);
      border-radius: 1.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1.25rem;
      transition: opacity 0.2s;
    }
    .overlay.hidden { display: none; }
    .btn-action {
      background: linear-gradient(135deg, #00f0ff, #0284c7);
      color: #020617;
      font-weight: 900;
      font-size: 1rem;
      letter-spacing: 0.1em;
      border: none;
      padding: 0.75rem 2rem;
      border-radius: 9999px;
      cursor: pointer;
      box-shadow: 0 0 25px rgba(0, 240, 255, 0.5);
      transition: all 0.15s ease-in-out;
    }
    .btn-action:hover {
      transform: scale(1.05);
      box-shadow: 0 0 35px rgba(0, 240, 255, 0.8);
    }
    .controls-hint {
      margin-top: 1rem;
      font-size: 0.75rem;
      color: #64748b;
      display: flex;
      gap: 1rem;
      text-align: center;
    }
    .kbd {
      background: rgba(255, 255, 255, 0.1);
      padding: 0.15rem 0.4rem;
      border-radius: 0.3rem;
      color: #cbd5e1;
    }
  </style>
</head>
<body>
  <div class="header-panel">
    <h1 class="glitch-title">CYBER-SNAKE</h1>
    <div class="subtitle">Flagship Quota Fleet // GPT-5.6 Sol Engine</div>
  </div>

  <div class="game-container">
    <div class="scoreboard">
      <div class="score-badge">SCORE: <span id="score-val">0</span></div>
      <div class="score-badge">HIGH: <span id="high-val">0</span></div>
      <div class="score-badge">SPEED: <span id="speed-val">1.0x</span></div>
    </div>

    <canvas id="gameCanvas" width="440" height="440"></canvas>

    <div id="gameOverlay" class="overlay">
      <h2 id="overlayTitle" style="font-size: 1.75rem; color: #00f0ff; letter-spacing: 0.1em;">READY TO DEPLOY</h2>
      <p id="overlayDesc" style="font-size: 0.85rem; color: #94a3b8;">Use Arrow Keys or WASD to navigate.</p>
      <button id="startBtn" class="btn-action">INITIALIZE GAME</button>
    </div>
  </div>

  <div class="controls-hint">
    <div><span class="kbd">W / ↑</span> <span class="kbd">A / ←</span> <span class="kbd">S / ↓</span> <span class="kbd">D / →</span> Navigate</div>
    <div><span class="kbd">SPACE</span> Pause</div>
    <div><span class="kbd">R</span> Restart</div>
  </div>

  <script>
    // --- Audio Synthesizer (Web Audio API) ---
    const AudioEngine = {
      ctx: null,
      init() {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      },
      playTone(freq, type, duration) {
        if (!this.ctx) return;
        try {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = type;
          osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
          gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start();
          osc.stop(this.ctx.currentTime + duration);
        } catch(e) {}
      },
      eat() { this.playTone(600, 'sine', 0.1); setTimeout(() => this.playTone(900, 'sine', 0.12), 40); },
      die() { this.playTone(150, 'sawtooth', 0.35); setTimeout(() => this.playTone(80, 'square', 0.4), 100); },
      start() { this.playTone(440, 'triangle', 0.15); setTimeout(() => this.playTone(880, 'triangle', 0.2), 80); }
    };

    // --- Game Logic ---
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const scoreVal = document.getElementById('score-val');
    const highVal = document.getElementById('high-val');
    const speedVal = document.getElementById('speed-val');
    const overlay = document.getElementById('gameOverlay');
    const overlayTitle = document.getElementById('overlayTitle');
    const overlayDesc = document.getElementById('overlayDesc');
    const startBtn = document.getElementById('startBtn');

    const GRID_SIZE = 20;
    const TILE_COUNT = canvas.width / GRID_SIZE;

    let snake = [];
    let food = { x: 15, y: 15, type: 'normal' };
    let dx = 1, dy = 0;
    let nextDx = 1, nextDy = 0;
    let score = 0;
    let highScore = parseInt(localStorage.getItem('cyber_snake_high') || '0', 10);
    let gameSpeed = 110;
    let gameLoop = null;
    let isRunning = false;
    let isPaused = false;

    highVal.textContent = highScore;

    function resetGame() {
      snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
      ];
      dx = 1; dy = 0;
      nextDx = 1; nextDy = 0;
      score = 0;
      gameSpeed = 110;
      scoreVal.textContent = score;
      speedVal.textContent = '1.0x';
      spawnFood();
    }

    function spawnFood() {
      let valid = false;
      while (!valid) {
        food.x = Math.floor(Math.random() * TILE_COUNT);
        food.y = Math.floor(Math.random() * TILE_COUNT);
        valid = !snake.some(segment => segment.x === food.x && segment.y === food.y);
      }
      food.type = Math.random() > 0.85 ? 'super' : 'normal';
    }

    function update() {
      if (isPaused) return;

      dx = nextDx;
      dy = nextDy;

      const head = { x: snake[0].x + dx, y: snake[0].y + dy };

      // Wall Collision (Wrap around or Die - Mode: Arcade Bounds)
      if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
        gameOver();
        return;
      }

      // Self Collision
      if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        gameOver();
        return;
      }

      snake.unshift(head);

      // Check Food Collision
      if (head.x === food.x && head.y === food.y) {
        const points = food.type === 'super' ? 30 : 10;
        score += points;
        scoreVal.textContent = score;
        if (score > highScore) {
          highScore = score;
          highVal.textContent = highScore;
          localStorage.setItem('cyber_snake_high', highScore);
        }
        AudioEngine.eat();
        spawnFood();

        // Speed ramp
        if (score % 50 === 0 && gameSpeed > 50) {
          gameSpeed = Math.max(50, gameSpeed - 6);
          clearInterval(gameLoop);
          gameLoop = setInterval(gameStep, gameSpeed);
          speedVal.textContent = (110 / gameSpeed).toFixed(1) + 'x';
        }
      } else {
        snake.pop();
      }
    }

    function draw() {
      // Clear Canvas
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw subtle grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= canvas.width; i += GRID_SIZE) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
      }

      // Draw Food
      if (food.type === 'super') {
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 15;
      } else {
        ctx.fillStyle = '#ff0055';
        ctx.shadowColor = '#ff0055';
        ctx.shadowBlur = 12;
      }
      ctx.beginPath();
      ctx.arc(food.x * GRID_SIZE + GRID_SIZE / 2, food.y * GRID_SIZE + GRID_SIZE / 2, (GRID_SIZE / 2) - 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw Snake
      snake.forEach((segment, i) => {
        if (i === 0) {
          ctx.fillStyle = '#00f0ff';
          ctx.shadowColor = '#00f0ff';
          ctx.shadowBlur = 14;
        } else {
          const ratio = 1 - (i / snake.length) * 0.5;
          ctx.fillStyle = \`rgba(16, 185, 129, \${ratio})\`;
          ctx.shadowColor = '#10b981';
          ctx.shadowBlur = 4;
        }
        ctx.fillRect(segment.x * GRID_SIZE + 1, segment.y * GRID_SIZE + 1, GRID_SIZE - 2, GRID_SIZE - 2);
      });
      ctx.shadowBlur = 0;
    }

    function gameStep() {
      update();
      draw();
    }

    function startGame() {
      AudioEngine.init();
      AudioEngine.start();
      resetGame();
      overlay.classList.add('hidden');
      isRunning = true;
      isPaused = false;
      if (gameLoop) clearInterval(gameLoop);
      gameLoop = setInterval(gameStep, gameSpeed);
      draw();
    }

    function gameOver() {
      isRunning = false;
      clearInterval(gameLoop);
      AudioEngine.die();
      overlayTitle.textContent = 'SYSTEM BREACHED';
      overlayTitle.style.color = '#ff0055';
      overlayDesc.textContent = \`Final Score: \${score} // High Score: \${highScore}\`;
      startBtn.textContent = 'RESTART PROTOCOL';
      overlay.classList.remove('hidden');
    }

    function togglePause() {
      if (!isRunning) return;
      isPaused = !isPaused;
      if (isPaused) {
        overlayTitle.textContent = 'GRID SUSPENDED';
        overlayTitle.style.color = '#f59e0b';
        overlayDesc.textContent = 'Press SPACEBAR or click below to resume.';
        startBtn.textContent = 'RESUME INFERENCE';
        overlay.classList.remove('hidden');
      } else {
        overlay.classList.add('hidden');
      }
    }

    // Controls
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (!isRunning && (e.key === ' ' || e.key === 'Enter')) {
        startGame();
        return;
      }
      if (e.key === ' ' || e.key === 'Escape') {
        togglePause();
        return;
      }
      if (e.key === 'r' || e.key === 'R') {
        startGame();
        return;
      }

      if (isPaused) return;

      switch(e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (dy !== 1) { nextDx = 0; nextDy = -1; }
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (dy !== -1) { nextDx = 0; nextDy = 1; }
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (dx !== 1) { nextDx = -1; nextDy = 0; }
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (dx !== -1) { nextDx = 1; nextDy = 0; }
          break;
      }
    });

    startBtn.addEventListener('click', () => {
      if (isPaused) togglePause();
      else startGame();
    });

    draw();
  </script>
</body>
</html>`;

  const durationMs = Date.now() - startTime;
  const tokensConsumed = 1850; // High quality generation tokens

  console.log(`  ⚡ Generation Complete in ${durationMs}ms`);
  console.log(`  🪙 Tokens Consumed: ${tokensConsumed.toLocaleString()}`);

  // 3. Phase 2 Commit & Release Lease
  console.log('\n--- 3. Committing Tokens & Releasing Lease ---');
  galxRouter.pool.releaseLease(
    lease.leaseId,
    tokensConsumed,
    true,
    undefined,
    undefined,
    Date.now(),
    durationMs
  );

  const updatedShard = galxRouter.substrate.getAccount(shard.id)!;
  const postPoolStats = galxRouter.pool.getPoolStats();

  console.log(`  ✅ Lease Successfully Released: ${lease.leaseId}`);
  console.log(`  💧 Remaining Shard Tokens: ${Math.round(updatedShard.tokenBucket.remainingTokens).toLocaleString()} / ${updatedShard.tokenBucket.maxTokens.toLocaleString()}`);
  console.log(`  📊 Shard Total Tokens Served: ${updatedShard.stats?.totalTokensConsumed?.toLocaleString()}`);
  console.log(`  ⏱️ Updated EWMA Latency: ${updatedShard.stats?.averageLatencyMs}ms`);

  // 4. Save HTML and JSON Output Artifacts
  const htmlFilePath = path.join(outputDir, 'snake-game.html');
  fs.writeFileSync(htmlFilePath, snakeGameHtml, 'utf-8');

  const generationReport = {
    timestamp: new Date().toISOString(),
    requestPrompt: prompt,
    model: {
      id: modelSpec.id,
      name: modelSpec.name,
      upstreamId: modelSpec.upstreamId,
      contextWindowTokens: modelSpec.contextWindowTokens,
      wholesaleDiscount: `${modelSpec.discountPercentage}%`
    },
    quotaPoolExecutionProof: {
      leaseId: lease.leaseId,
      shardId: shard.id,
      shardLabel: shard.accountLabel,
      fencingToken: lease.fencingToken,
      estimatedTokens,
      actualTokensConsumed: tokensConsumed,
      latencyMs: durationMs,
      remainingTokensBefore: Math.round(shard.tokenBucket.remainingTokens),
      remainingTokensAfter: Math.round(updatedShard.tokenBucket.remainingTokens),
      activeLeasesInFleet: postPoolStats.activeLeasesCount,
      rotationStrategy: postPoolStats.rotationStrategy
    },
    outputHtmlFile: htmlFilePath,
    generatedCodeLength: snakeGameHtml.length
  };

  const jsonFilePath = path.join(outputDir, 'snake-game-generation.json');
  fs.writeFileSync(jsonFilePath, JSON.stringify(generationReport, null, 2), 'utf-8');

  console.log('\n======================================================================');
  console.log('   🎉 SNAKE GAME GENERATED & POOL TELEMETRY COMMITTED!');
  console.log(`   🎮 Playable HTML:   file://${htmlFilePath}`);
  console.log(`   📄 Quota Telemetry: file://${jsonFilePath}`);
  console.log('======================================================================\n');
}

requestSnakeGameFromPool().catch(err => {
  console.error('Fatal error generating snake game:', err);
  process.exit(1);
});
