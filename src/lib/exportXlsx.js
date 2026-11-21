// Real Excel files (.xlsx) for every "export" button.
// A CSV cannot carry column widths or right-to-left direction, so Arabic columns came out squeezed.
// exceljs is only downloaded when someone clicks export (dynamic import), so pages stay light.

function textWidth(v) {
  return String(v ?? '')
    .split('\n')
    .reduce((m, line) => Math.max(m, line.length), 0);
}

export async function exportXlsx(name, headers, rows, { sheet = 'البيانات', rtl = true } = {}) {
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  wb.creator = 'IBRAM';
  wb.created = new Date();

  const ws = wb.addWorksheet(sheet.slice(0, 31), {
    views: [{ rightToLeft: rtl, state: 'frozen', ySplit: 1 }],
  });

  ws.columns = headers.map((h, i) => {
    const longest = Math.max(textWidth(h), ...rows.map((r) => textWidth(r[i])));
    return { header: h, key: 'c' + i, width: Math.min(Math.max(longest + 4, 12), 75) };
  });
  rows.forEach((r) => ws.addRow(r));

  const border = { style: 'thin', color: { argb: 'FFD9E2EC' } };
  ws.eachRow((row, n) => {
    row.eachCell((cell) => {
      cell.border = { top: border, bottom: border, left: border, right: border };
      cell.alignment = { vertical: 'middle', horizontal: rtl ? 'right' : 'left', wrapText: true, readingOrder: rtl ? 'rtl' : 'ltr' };
      if (n === 1) {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A6CFF' } };
        cell.alignment = { ...cell.alignment, horizontal: 'center' };
      } else if (n % 2 === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F9FF' } };
      }
    });
    // Excel does not grow rows by itself when a file is opened: size each row to its longest cell
    if (n === 1) {
      row.height = 26;
    } else {
      let lines = 1;
      row.eachCell((cell, col) => {
        const width = ws.getColumn(col).width || 12;
        const text = String(cell.value ?? '');
        const count = text.split('\n').reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / (width - 2))), 0);
        lines = Math.max(lines, count);
      });
      row.height = Math.max(22, lines * 17 + 6);
    }
  });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
