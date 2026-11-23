// COVAI: convert a simple Markdown file to a Word document.
// Usage: node md2docx.js <input.md> <output.docx>
// Needs the "docx" npm package. If it is missing, install it once with:
//   npm install --prefix "%USERPROFILE%\.covai-tools" docx@9
// Supported Markdown: # / ## / ### headings, paragraphs, - bullets, 1. numbered items,
// | tables |, ``` code blocks ```, **bold**, `code`.
const fs = require('fs');
const path = require('path');
const os = require('os');

function loadDocx() {
  const candidates = [
    'docx',
    path.join(os.homedir(), '.covai-tools', 'node_modules', 'docx'),
  ];
  for (const c of candidates) {
    try { return require(c); } catch {}
  }
  console.error('The "docx" package is missing. Run: npm install --prefix "' +
    path.join(os.homedir(), '.covai-tools') + '" docx@9');
  process.exit(3);
}

const d = loadDocx();
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, LevelFormat, AlignmentType, Footer, PageNumber,
} = d;

const [, , inFile, outFile] = process.argv;
if (!inFile || !outFile) { console.error('Usage: node md2docx.js <input.md> <output.docx>'); process.exit(1); }

const FONT = 'Arial';
const PAGE_W = 11906, MARGIN = 1134, CONTENT_W = PAGE_W - 2 * MARGIN; // A4, 2 cm margins

function runs(text, base = {}) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), ...base }));
    const t = m[0];
    if (t.startsWith('**')) out.push(new TextRun({ text: t.slice(2, -2), bold: true, ...base }));
    else out.push(new TextRun({ text: t.slice(1, -1), font: 'Consolas', ...base }));
    last = m.index + t.length;
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), ...base }));
  return out.length ? out : [new TextRun({ text: '', ...base })];
}

const border = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' };
const borders = { top: border, bottom: border, left: border, right: border };

function table(rows) {
  const cells = rows.map(r => r.replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
  const header = cells[0];
  const body = cells.slice(1).filter(r => !r.every(c => /^:?-{2,}:?$/.test(c)));
  const n = header.length;
  const w = Math.floor(CONTENT_W / n);
  const mk = (r, head) => new TableRow({
    tableHeader: head,
    children: Array.from({ length: n }, (_, i) => new TableCell({
      borders, width: { size: w, type: WidthType.DXA },
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      shading: head ? { fill: 'D9E2F3', type: ShadingType.CLEAR, color: 'auto' } : undefined,
      children: [new Paragraph({ children: runs(r[i] || '', head ? { bold: true } : {}) })],
    })),
  });
  return new Table({
    width: { size: w * n, type: WidthType.DXA },
    columnWidths: Array(n).fill(w),
    rows: [mk(header, true), ...body.map(r => mk(r, false))],
  });
}

const lines = fs.readFileSync(inFile, 'utf8').replace(/\r\n/g, '\n').split('\n');
const children = [];
let numberedList = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (/^```/.test(line)) {
    const code = [];
    while (++i < lines.length && !/^```/.test(lines[i])) code.push(lines[i]);
    for (const c of code) children.push(new Paragraph({
      spacing: { after: 0 },
      shading: { fill: 'F2F2F2', type: ShadingType.CLEAR, color: 'auto' },
      children: [new TextRun({ text: c || ' ', font: 'Consolas', size: 18 })],
    }));
    children.push(new Paragraph({ children: [] }));
    continue;
  }
  if (/^\s*\|/.test(line)) {
    const rows = [];
    while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(lines[i++].trim());
    i--;
    children.push(table(rows));
    children.push(new Paragraph({ children: [] }));
    continue;
  }
  let m;
  if ((m = line.match(/^(#{1,3})\s+(.*)/))) {
    const lvl = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3][m[1].length - 1];
    children.push(new Paragraph({ heading: m[1].length === 1 && children.length === 0 ? HeadingLevel.TITLE : lvl, children: runs(m[2]) }));
    continue;
  }
  if ((m = line.match(/^\s*[-*]\s+(.*)/))) {
    children.push(new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: runs(m[1]) }));
    continue;
  }
  if ((m = line.match(/^\s*\d+[.)]\s+(.*)/))) {
    const prevNumbered = i > 0 && /^\s*\d+[.)]\s+/.test(lines[i - 1]);
    if (!prevNumbered) numberedList++;
    children.push(new Paragraph({ numbering: { reference: 'numbers', level: 0, instance: numberedList }, children: runs(m[1]) }));
    continue;
  }
  if (line.trim() === '') continue;
  children.push(new Paragraph({ spacing: { after: 120 }, children: runs(line) }));
}

const doc = new Document({
  styles: {
    default: { document: { run: { font: FONT, size: 21 } } },
    paragraphStyles: [
      { id: 'Title', name: 'Title', basedOn: 'Normal', run: { size: 40, bold: true, font: FONT, color: '1F3864' }, paragraph: { spacing: { after: 240 } } },
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 30, bold: true, font: FONT, color: '1F3864' }, paragraph: { spacing: { before: 300, after: 120 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 25, bold: true, font: FONT, color: '2F5496' }, paragraph: { spacing: { before: 240, after: 100 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 22, bold: true, font: FONT }, paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: 'numbers', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ],
  },
  sections: [{
    properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [
      new TextRun({ text: 'Generated by COVAI  |  Page ', size: 16, color: '808080' }),
      new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '808080' }),
    ] })] }) },
    children,
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outFile, buf);
  console.log('Written ' + outFile);
});
