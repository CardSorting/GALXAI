import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import https from 'node:https';

async function addVercelDomain() {
  const authPath = path.join(os.homedir(), 'Library/Application Support/com.vercel.cli/auth.json');
  if (!fs.existsSync(authPath)) {
    console.error('Vercel auth.json not found at:', authPath);
    process.exit(1);
  }

  const authData = JSON.parse(fs.readFileSync(authPath, 'utf8'));
  const token = authData.token;

  const projectPath = path.join(process.cwd(), '.vercel/project.json');
  const projectData = JSON.parse(fs.readFileSync(projectPath, 'utf8'));
  const { projectId, orgId } = projectData;

  const domainsToAdd = [
    { name: 'galx.ai' },
    { name: 'www.galx.ai', redirect: 'galx.ai', redirectStatusCode: 308 },
  ];

  for (const item of domainsToAdd) {
    console.log(`\nAdding ${item.name} to Vercel project ${projectId}...`);
    const payload = JSON.stringify(item);

    const res = await new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
      const req = https.request(
        `https://api.vercel.com/v10/projects/${projectId}/domains?teamId=${orgId}`,
        {
          method: 'POST',
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

    console.log(`Status: HTTP ${res.statusCode}`);
    console.log(`Response: ${res.body}`);
  }

  // Get DNS instructions
  console.log('\nFetching DNS configuration & verification records for galx.ai...');
  const dnsRes = await new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
    const req = https.request(
      `https://api.vercel.com/v9/projects/${projectId}/domains/galx.ai?teamId=${orgId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ statusCode: res.statusCode || 0, body }));
      }
    );
    req.on('error', reject);
    req.end();
  });

  console.log('Domain Details:', dnsRes.body);
}

addVercelDomain().catch((e) => {
  console.error(e);
  process.exit(1);
});
