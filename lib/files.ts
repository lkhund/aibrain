import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

export async function spreadsheet(title: string, columns: { key: string; label: string }[], rows: Record<string, string | number>[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Aibrain HR';
  const sheet = workbook.addWorksheet(title.slice(0, 31) || 'Report');
  sheet.addRow(columns.map((column) => column.label));
  sheet.getRow(1).font = { bold: true };
  for (const row of rows) sheet.addRow(columns.map((column) => row[column.key] ?? ''));
  columns.forEach((column, index) => {
    sheet.getColumn(index + 1).width = Math.min(36, Math.max(12, column.label.length + 4));
  });
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

type Run = { ge: boolean; text: string };

function splitRuns(text: string): Run[] {
  const runs: Run[] = [];
  let georgianRun = false;
  let buffer = '';
  const flush = () => {
    if (!buffer) return;
    runs.push({ ge: georgianRun, text: buffer });
    buffer = '';
  };
  for (const char of text) {
    const isGeorgian = /[\u10A0-\u10FF]/.test(char);
    const isLatin = /[A-Za-z0-9]/.test(char);
    const next: boolean = isGeorgian || (!isLatin && georgianRun);
    if (buffer && next !== georgianRun) flush();
    georgianRun = next;
    buffer += char;
  }
  flush();
  return runs;
}

export async function documentPdf(title: string, paragraphs: string[]) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const latin = await pdf.embedFont(fs.readFileSync(path.join(process.cwd(), 'assets/fonts/NotoSans-Regular.ttf')));
  const georgian = await pdf.embedFont(fs.readFileSync(path.join(process.cwd(), 'assets/fonts/NotoSansGeorgian-Regular.ttf')));
  const margin = 48;
  const width = 595 - margin * 2;
  let page = pdf.addPage([595, 842]);
  let y = 800;

  const measure = (text: string, size: number) =>
    splitRuns(text).reduce((sum, run) => sum + (run.ge ? georgian : latin).widthOfTextAtSize(run.text, size), 0);

  const draw = (target: PDFPage, text: string, x: number, top: number, size: number, fontFor: (run: Run) => PDFFont) => {
    let cursor = x;
    for (const run of splitRuns(text)) {
      const font = fontFor(run);
      target.drawText(run.text, { x: cursor, y: top, size, font, color: rgb(0.11, 0.1, 0.08) });
      cursor += font.widthOfTextAtSize(run.text, size);
    }
  };

  const writeLine = (text: string, size: number) => {
    if (y < 64) {
      page = pdf.addPage([595, 842]);
      y = 800;
    }
    draw(page, text, margin, y, size, (run) => (run.ge ? georgian : latin));
    y -= size + 6;
  };

  const wrap = (text: string, size: number) => {
    const words = text.split(/\s+/);
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (measure(next, size) > width && line) {
        writeLine(line, size);
        line = word;
      } else line = next;
    }
    if (line) writeLine(line, size);
  };

  wrap(title, 16);
  y -= 6;
  for (const paragraph of paragraphs) {
    wrap(paragraph, 11);
    y -= 6;
  }
  return Buffer.from(await pdf.save());
}
