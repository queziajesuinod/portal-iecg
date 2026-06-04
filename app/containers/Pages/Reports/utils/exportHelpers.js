// Helpers compartilhados de exportação para o módulo de Relatórios.
// PDF reaproveita o layout do Relatório de Fluxo de Cultos (cabeçalho, cards, tabelas, rodapé).
import JsPDF from 'jspdf';
import * as XLSX from 'xlsx';

export const PDF = {
  margin: 14,
  pageWidth: 210,
  pageHeight: 297,
  contentWidth: 182,
  primary: [22, 84, 142],
  primaryDark: [14, 54, 92],
  accent: [30, 132, 73],
  danger: [180, 48, 48],
  warning: [201, 122, 22],
  border: [220, 226, 232],
  muted: [93, 108, 125],
  soft: [244, 248, 252],
  white: [255, 255, 255],
  black: [30, 37, 47],
};

const ensureSpace = (doc, state, needed = 18) => {
  if (state.y + needed <= PDF.pageHeight - 14) return;
  doc.addPage();
  state.page += 1;
  state.y = 18;
};

const setText = (doc, size, color = PDF.black, bold = false) => {
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setFontSize(size);
  doc.setTextColor(...color);
};

const drawSectionTitle = (doc, state, title) => {
  ensureSpace(doc, state, 16);
  doc.setDrawColor(...PDF.primary);
  doc.setLineWidth(0.7);
  doc.line(PDF.margin, state.y, PDF.margin + 6, state.y);
  setText(doc, 12, PDF.primaryDark, true);
  doc.text(title, PDF.margin + 9, state.y + 1);
  state.y += 8;
};

const drawMetricCard = (doc, x, y, width, title, value, subtitle, color = PDF.primary) => {
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...PDF.border);
  doc.roundedRect(x, y, width, 25, 2, 2, 'FD');
  doc.setFillColor(...color);
  doc.roundedRect(x, y, 2.5, 25, 1.2, 1.2, 'F');
  setText(doc, 7, PDF.muted, true);
  doc.text(doc.splitTextToSize(String(title || '').toUpperCase(), width - 8)[0], x + 6, y + 7);
  setText(doc, 13, color, true);
  doc.text(doc.splitTextToSize(String(value ?? '0'), width - 8)[0], x + 6, y + 15);
  if (subtitle) {
    setText(doc, 7, PDF.muted);
    doc.text(doc.splitTextToSize(String(subtitle), width - 8)[0], x + 6, y + 21);
  }
};

const drawCards = (doc, state, cards) => {
  if (!cards || !cards.length) return;
  const perRow = 4;
  const gap = 4;
  const width = (PDF.contentWidth - gap * (perRow - 1)) / perRow;
  cards.forEach((card, index) => {
    const col = index % perRow;
    if (col === 0) ensureSpace(doc, state, 30);
    const x = PDF.margin + col * (width + gap);
    drawMetricCard(doc, x, state.y, width, card.title, card.value, card.subtitle, card.color || PDF.primary);
    if (col === perRow - 1 || index === cards.length - 1) state.y += 29;
  });
  state.y += 4;
};

const drawTable = (doc, state, { title, columns, rows }) => {
  if (title) drawSectionTitle(doc, state, title);
  if (!rows || !rows.length) {
    setText(doc, 9, PDF.muted);
    ensureSpace(doc, state, 8);
    doc.text('Sem dados para o período/filtros selecionados.', PDF.margin, state.y);
    state.y += 8;
    return;
  }

  const totalWidth = columns.reduce((acc, c) => acc + (c.width || 0), 0) || PDF.contentWidth;
  const scale = PDF.contentWidth / totalWidth;
  const cols = columns.map((c) => ({ ...c, w: (c.width || totalWidth / columns.length) * scale }));

  const colX = [];
  let acc = PDF.margin;
  cols.forEach((c) => { colX.push(acc); acc += c.w; });

  const drawHeader = () => {
    ensureSpace(doc, state, 12);
    doc.setFillColor(...PDF.primaryDark);
    doc.roundedRect(PDF.margin, state.y, PDF.contentWidth, 8, 1.5, 1.5, 'F');
    setText(doc, 7.5, PDF.white, true);
    cols.forEach((c, i) => {
      const tx = c.align === 'right' ? colX[i] + c.w - 2 : colX[i] + 2;
      doc.text(String(c.label), tx, state.y + 5, { align: c.align === 'right' ? 'right' : 'left' });
    });
    state.y += 9;
  };

  drawHeader();
  rows.forEach((row, index) => {
    ensureSpace(doc, state, 10);
    const rowHeight = 8;
    const fill = index % 2 === 0 ? [250, 252, 254] : PDF.white;
    doc.setFillColor(...fill);
    doc.rect(PDF.margin, state.y, PDF.contentWidth, rowHeight, 'F');
    doc.setDrawColor(...PDF.border);
    doc.line(PDF.margin, state.y + rowHeight, PDF.pageWidth - PDF.margin, state.y + rowHeight);
    setText(doc, 8, PDF.black);
    cols.forEach((c, i) => {
      const value = row[c.key];
      const tx = c.align === 'right' ? colX[i] + c.w - 2 : colX[i] + 2;
      const text = doc.splitTextToSize(String(value ?? '-'), c.w - 4)[0];
      doc.text(text, tx, state.y + 5.5, { align: c.align === 'right' ? 'right' : 'left' });
    });
    state.y += rowHeight;
  });
  state.y += 6;
};

const drawFooter = (doc, totalPages, footerLabel) => {
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...PDF.border);
    doc.line(PDF.margin, 286, PDF.pageWidth - PDF.margin, 286);
    setText(doc, 8, PDF.muted);
    doc.text(footerLabel || 'Portal IECG | Relatórios', PDF.margin, 291);
    doc.text(`Pagina ${page} de ${totalPages}`, PDF.pageWidth - PDF.margin, 291, { align: 'right' });
  }
};

/**
 * Gera e baixa um PDF de relatório.
 * config = {
 *   fileName, title, subtitle, meta: [string], footer,
 *   cards: [{ title, value, subtitle, color }],
 *   sections: [{ title, columns:[{label,key,width,align}], rows:[{}] }]
 * }
 */
export const exportarPDF = (config = {}) => {
  const doc = new JsPDF({ unit: 'mm', format: 'a4' });
  const state = { y: 18, page: 1 };

  // Cabeçalho
  doc.setFillColor(...PDF.primaryDark);
  doc.rect(0, 0, PDF.pageWidth, 48, 'F');
  doc.setFillColor(...PDF.primary);
  doc.rect(0, 0, PDF.pageWidth, 9, 'F');
  setText(doc, 20, PDF.white, true);
  doc.text(String(config.title || 'Relatório'), PDF.margin, 24);
  if (config.subtitle) {
    setText(doc, 10, [220, 232, 244]);
    doc.text(String(config.subtitle), PDF.margin, 32);
  }
  (config.meta || []).slice(0, 2).forEach((line, i) => {
    setText(doc, 9, [220, 232, 244]);
    doc.text(String(line), PDF.margin, 39 + i * 5);
  });

  state.y = 58;
  drawCards(doc, state, config.cards);
  (config.sections || []).forEach((section) => drawTable(doc, state, section));

  drawFooter(doc, doc.getNumberOfPages(), config.footer);

  const fileName = (config.fileName || 'relatorio')
    .replace(/[^a-z0-9-]+/gi, '-')
    .toLowerCase();
  doc.save(`${fileName}.pdf`);
};

/**
 * Exporta um arquivo Excel (.xlsx) com uma ou mais abas.
 * sheets = [{ name, rows: [{}], columns?: [{ label, key }] }]
 */
export const exportarExcel = (fileName, sheets = []) => {
  const workbook = XLSX.utils.book_new();
  sheets.forEach((sheet, index) => {
    let aoa;
    if (sheet.columns && sheet.columns.length) {
      const header = sheet.columns.map((c) => c.label);
      const body = (sheet.rows || []).map((row) => sheet.columns.map((c) => row[c.key]));
      aoa = [header, ...body];
    } else {
      const rows = sheet.rows || [];
      const keys = rows.length ? Object.keys(rows[0]) : [];
      aoa = [keys, ...rows.map((r) => keys.map((k) => r[k]))];
    }
    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    const name = (sheet.name || `Planilha${index + 1}`).slice(0, 31);
    XLSX.utils.book_append_sheet(workbook, worksheet, name);
  });
  const safeName = (fileName || 'relatorio').replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
  XLSX.writeFile(workbook, `${safeName}.xlsx`);
};

// Formatadores reutilizáveis
export const fmtNumero = (v) => Number(v || 0).toLocaleString('pt-BR');
export const fmtMoeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const fmtDecimal = (v) => Number(v || 0).toFixed(2);
export const fmtPercent = (v) => `${Number(v || 0).toFixed(1)}%`;
