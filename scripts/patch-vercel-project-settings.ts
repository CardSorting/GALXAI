import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import https from 'node:https';

async function patchProjectSettings() {
  const authPath = path.join(os.homedir(), 'Library/Application Support/com.vercel.cli/auth.json');
  if (!fs.existsSync(authPath)) {
    console.error('Vercel auth.json not found at:', authPath);
    process.exit(1);
  }

  const authData = JSON.parse(fs.readFileSync(authPath, 'utf8'));
  const token = authData.token;
  if (!token) {
    console.error('Token not found in auth.json');
    process.exit(1);
  }

  const projectPath = path.join(process.cwd(), '.vercel/project.json');
  const projectData = JSON.parse(fs.readFileSync(projectPath, 'utf8'));
  const { projectId, orgId } = projectData;

  console.log(`Updating Vercel Project ${projectId} Node.js version to 22.x...`);

  const payload = JSON.stringify({
    nodeVersion: '22.x',
  });

  const url = `https://api.vercel.com/v9/projects/${projectId}?teamId=${orgId}`;

  const res = await new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ statusCode: res.statusCode || 0, body }));
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });

  console.log(`API Response (HTTP ${res.statusCode}):`, res.body);
  if (res.statusCode >= 200 && res.statusCode < 300) {
    console.log('✓ Successfully set Node.js version to 22.x in Vercel project settings!');
  } else {
    console.error('Failed to update project settings');
    process.exit(1);
  }
}

patchProjectSettings().catch((e) => {
  console.error(e);
  process.exit(1);
});
