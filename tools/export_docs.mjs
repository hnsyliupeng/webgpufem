// tools/export_docs.mjs — dump flowcharts + doc data to JSON for tools/build_docs.py (.docx builder).
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { FLOWCHARTS } from '../core/flowcharts.js';
import { DOC_META, DOC_SECTIONS } from '../docs/doc_data.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(join(root, 'docs'), { recursive: true });
writeFileSync(join(root, 'docs/flowcharts.json'), JSON.stringify({ generated: new Date().toISOString(), flowcharts: FLOWCHARTS }, null, 1));
writeFileSync(join(root, 'docs/doc_data.json'), JSON.stringify({ meta: DOC_META, sections: DOC_SECTIONS }, null, 1));
console.log('exported docs/flowcharts.json + docs/doc_data.json');
