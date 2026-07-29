import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  /**
   * Export data to Excel (.xlsx) using HTML table parsing to guarantee bold headers & column titles
   * @param data Array of objects to export. Supports _rowType for styling/merging.
   * @param columns Array of column definitions { field: string, header: string }
   * @param fileName Name of the file (without extension)
   * @param reportHeaders Optional array of strings to show as merged rows on top
   * @param columnHeader Optional custom column header rows with relative merge ranges
   */
  exportToExcel(
    data: any[],
    columns: { field: string, header: string }[],
    fileName: string,
    reportHeaders: string[] = [],
    columnHeader?: { rows: any[][]; merges?: XLSX.Range[] },
  ) {
    if (!data || data.length === 0) {
      console.warn('No data to export');
      return;
    }

    const tempDiv = document.createElement('div');
    const colCount = columns.length;
    let html = '<table>';

    // 1. Add Top Report Headers (Bold <b> merged rows)
    reportHeaders.forEach((hText) => {
      html += `<tr><td colspan="${colCount}" style="font-weight: bold; font-size: 11pt;"><b>${this.escapeHtml(hText)}</b></td></tr>`;
    });

    // 2. Add 1 Line Blank Gap above table if report headers exist
    if (reportHeaders.length > 0) {
      html += `<tr><td colspan="${colCount}"></td></tr>`;
    }

    // 3. Add Table Column Headers (Bold <b> <th> headers)
    html += '<thead><tr style="background-color: #f1f5f9;">';
    columns.forEach((col) => {
      html += `<th style="font-weight: bold; font-size: 11pt; text-align: left;"><b>${this.escapeHtml(col.header)}</b></th>`;
    });
    html += '</tr></thead>';

    // 4. Add Data Rows
    html += '<tbody>';
    data.forEach((row) => {
      if (row._rowType === 'header') {
        html += `<tr><td colspan="${colCount}" style="font-weight: bold; background-color: #e2e8f0;"><b>${this.escapeHtml(row._headerValue || '')}</b></td></tr>`;
      } else {
        html += '<tr>';
        columns.forEach((col) => {
          const val = row[col.field] ?? '';
          html += `<td>${this.escapeHtml(String(val))}</td>`;
        });
        html += '</tr>';
      }
    });
    html += '</tbody></table>';

    tempDiv.innerHTML = html;
    const tableEl = tempDiv.querySelector('table')!;
    const worksheet = XLSX.utils.table_to_sheet(tableEl, { raw: true });

    // Set Column Widths to prevent text clipping
    const colWidths = columns.map((c) => ({
      wch: (c as any).excelWidth || Math.max((c.header || '').length + 6, 18),
    }));
    worksheet['!cols'] = colWidths;

    // Create Workbook & Download
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    XLSX.writeFile(workbook, `${fileName}_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.xlsx`);
  }

  private escapeHtml(str: string): string {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Export an HTML Table element directly to Excel, preserving spans and headers.
   * @param tableElement DOM table element
   * @param fileName File name for download
   */
  exportTableToExcel(tableElement: any, fileName: string) {
    const worksheet = XLSX.utils.table_to_sheet(tableElement, { raw: true });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    XLSX.writeFile(workbook, `${fileName}_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.xlsx`);
  }

  /**
   * Export data to CSV and trigger download
   * @param data Array of objects to export
   * @param columns Array of column definitions { field: string, header: string }
   * @param fileName Name of the file (without extension)
   */
  exportToCsv(data: any[], columns: { field: string, header: string }[], fileName: string) {
    if (!data || data.length === 0) {
      console.warn('No data to export');
      return;
    }

    const headers = columns.map(col => col.header).join(',');
    const rows = data.map(row => {
      return columns.map(col => {
        let val = row[col.field];
        if (val === null || val === undefined) val = '';
        const cell = String(val).replace(/"/g, '""');
        return cell.includes(',') ? `"${cell}"` : cell;
      }).join(',');
    });

    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${fileName}_${new Date().getTime()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}
