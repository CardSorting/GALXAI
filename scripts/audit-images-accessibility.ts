import fs from 'fs';
import path from 'path';

console.log('🔍 Auditing All Frontend Images & Media for Core Web Vitals & A11y...\n');

const srcDir = path.join(process.cwd(), 'src');

function getAllFiles(dir: string, list: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllFiles(full, list);
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.jsx')) {
      list.push(full);
    }
  }
  return list;
}

const files = getAllFiles(srcDir);
let imgIssues = 0;
let totalImages = 0;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  const rel = path.relative(process.cwd(), file);

  // Check for native <img> tags
  const imgTags = content.match(/<img\b[\s\S]*?>/g) || [];
  for (const tag of imgTags) {
    totalImages++;
    const hasAlt = /alt=["'{][^"'}]*["'}]/.test(tag);
    if (!hasAlt) {
      console.warn(`⚠️ [${rel}]: Native <img> missing alt attribute: ${tag.replace(/\s+/g, ' ').slice(0, 80)}...`);
      imgIssues++;
    }
  }

  // Check for Next.js <Image /> tags (excluding Lucide ImageIcon)
  const nextImgTags = content.match(/<Image\b[\s\S]*?>/g) || [];
  for (const tag of nextImgTags) {
    totalImages++;
    const hasAlt = /alt=["'{][^"'}]*["'}]/.test(tag);
    if (!hasAlt) {
      console.warn(`⚠️ [${rel}]: <Image /> missing alt attribute: ${tag.replace(/\s+/g, ' ').slice(0, 80)}...`);
      imgIssues++;
    }
  }
}

console.log(`\nAudit completed: scanned ${files.length} JSX/TSX files, found ${totalImages} image tags, ${imgIssues} accessibility issues.`);
