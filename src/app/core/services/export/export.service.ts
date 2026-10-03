import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PdfExportOptions {
  data: any[];
  columns: { field: string; header: string; width?: number; align?: 'left' | 'center' | 'right' }[];
  fileName: string;
  reportTitle: string;
  reportSubtitle?: string;
  asOfDate?: string;
  summaryCards?: { label: string; value: string }[];
  orientation?: 'portrait' | 'landscape';
  secondaryTables?: { title: string; data: any[]; columns: { field: string; header: string; align?: 'left' | 'center' | 'right' }[] }[];
  notes?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  /**
   * Export data to Excel (.xlsx) using HTML table parsing to guarantee bold headers & column titles
   */
  exportToExcel(
    data: any[],
    columns: { field: string; header: string }[],
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

  /**
   * Export structured multi-section report to Excel
   */
  exportMultiSectionToExcel(
    sections: { title: string; data: any[]; columns: { field: string; header: string }[] }[],
    fileName: string,
    reportHeaders: string[] = []
  ) {
    const workbook = XLSX.utils.book_new();

    sections.forEach((sec, idx) => {
      const tempDiv = document.createElement('div');
      const colCount = sec.columns.length;
      let html = '<table>';

      if (idx === 0 && reportHeaders.length > 0) {
        reportHeaders.forEach((hText) => {
          html += `<tr><td colspan="${colCount}" style="font-weight: bold; font-size: 11pt;"><b>${this.escapeHtml(hText)}</b></td></tr>`;
        });
        html += `<tr><td colspan="${colCount}"></td></tr>`;
      }

      html += `<tr><td colspan="${colCount}" style="font-weight: bold; font-size: 11pt; background-color: #e2e8f0;"><b>${this.escapeHtml(sec.title)}</b></td></tr>`;
      html += '<thead><tr style="background-color: #f1f5f9;">';
      sec.columns.forEach((col) => {
        html += `<th style="font-weight: bold; font-size: 10pt; text-align: left;"><b>${this.escapeHtml(col.header)}</b></th>`;
      });
      html += '</tr></thead><tbody>';

      sec.data.forEach((row) => {
        html += '<tr>';
        sec.columns.forEach((col) => {
          const val = row[col.field] ?? '';
          html += `<td>${this.escapeHtml(String(val))}</td>`;
        });
        html += '</tr>';
      });
      html += '</tbody></table>';

      tempDiv.innerHTML = html;
      const tableEl = tempDiv.querySelector('table')!;
      const worksheet = XLSX.utils.table_to_sheet(tableEl, { raw: true });

      const colWidths = sec.columns.map((c) => ({
        wch: Math.max((c.header || '').length + 6, 16),
      }));
      worksheet['!cols'] = colWidths;

      const sheetName = (sec.title || `Section ${idx + 1}`).substring(0, 31).replace(/[:\\/?*\[\]]/g, '');
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    XLSX.writeFile(workbook, `${fileName}_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.xlsx`);
  }

  /**
   * Export report directly to PDF with official bank header and formatting
   */
  exportToPdf(options: PdfExportOptions) {
    const orientation = options.orientation || (options.columns.length > 6 ? 'landscape' : 'portrait');
    const doc = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    let yPos = margin;

    // 1. Bank Header Banner
    doc.setFillColor(9, 35, 61); // Deep Navy (#09233D)
    doc.rect(margin, yPos, pageWidth - (margin * 2), 16, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('RAJARSHI SHAHU SAHAKARI BANK LTD. PUNE', margin + 6, yPos + 6.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('EARLY WARNING SIGNAL (EWS) SYSTEM — OFFICIAL RISK REPORT', margin + 6, yPos + 11.5);

    const now = new Date();
    const dateFormatted = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    doc.setFontSize(7);
    doc.text(`Generated: ${dateFormatted}`, pageWidth - margin - 6, yPos + 6.5, { align: 'right' });
    doc.text('Strictly Confidential — CRO / RO Use', pageWidth - margin - 6, yPos + 11.5, { align: 'right' });

    yPos += 21;

    // 2. Report Title & Meta
    doc.setTextColor(16, 42, 67);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(options.reportTitle, margin, yPos);
    yPos += 5.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const sub = options.reportSubtitle || `Source: LOAN DUMP AS ON 31-05-2026 | Portfolio Analytics`;
    doc.text(sub, margin, yPos);
    yPos += 6;

    // 3. Optional Summary Cards
    if (options.summaryCards && options.summaryCards.length > 0) {
      const cardCount = options.summaryCards.length;
      const totalWidth = pageWidth - (margin * 2);
      const gap = 3;
      const cardWidth = (totalWidth - (gap * (cardCount - 1))) / cardCount;
      const cardHeight = 11;

      options.summaryCards.forEach((card, i) => {
        const x = margin + (i * (cardWidth + gap));
        doc.setFillColor(241, 245, 249); // #f1f5f9
        doc.setDrawColor(203, 216, 229);
        doc.roundedRect(x, yPos, cardWidth, cardHeight, 1.5, 1.5, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(card.label.toUpperCase(), x + (cardWidth / 2), yPos + 4, { align: 'center' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.text(card.value, x + (cardWidth / 2), yPos + 8.5, { align: 'center' });
      });

      yPos += cardHeight + 5;
    }

    // 4. Primary Table
    const head = [options.columns.map((c) => c.header)];
    const body = (options.data || []).map((row) =>
      options.columns.map((c) => {
        const v = row[c.field];
        return v !== undefined && v !== null ? String(v) : '—';
      })
    );

    const colStyles: { [key: number]: any } = {};
    options.columns.forEach((col, idx) => {
      colStyles[idx] = {
        halign: col.align || 'left',
      };
      if (col.width) {
        colStyles[idx].cellWidth = col.width;
      }
    });

    (autoTable as any)(doc, {
      head,
      body,
      startY: yPos,
      margin: { left: margin, right: margin, top: margin + 5, bottom: margin + 8 },
      styles: {
        fontSize: orientation === 'landscape' ? 7 : 7.5,
        cellPadding: 1.8,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
        halign: 'left',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: colStyles,
      didDrawPage: (data: any) => {
        // Page Footer
        const str = `Page ${doc.getNumberOfPages()}`;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(str, pageWidth - margin, pageHeight - 5, { align: 'right' });
        doc.text('Rajarshi Shahu Sahakari Bank Ltd. — Confidential', margin, pageHeight - 5);
      },
    });

    // 5. Optional Secondary Tables
    if (options.secondaryTables && options.secondaryTables.length > 0) {
      options.secondaryTables.forEach((sec) => {
        let lastY = (doc as any).lastAutoTable?.finalY || yPos;
        if (lastY + 30 > pageHeight) {
          doc.addPage();
          lastY = margin + 5;
        } else {
          lastY += 8;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(16, 42, 67);
        doc.text(sec.title, margin, lastY);
        lastY += 4;

        const secHead = [sec.columns.map((c) => c.header)];
        const secBody = (sec.data || []).map((row) =>
          sec.columns.map((c) => {
            const v = row[c.field];
            return v !== undefined && v !== null ? String(v) : '—';
          })
        );

        const secColStyles: { [key: number]: any } = {};
        sec.columns.forEach((c, idx) => {
          secColStyles[idx] = { halign: c.align || 'left' };
        });

        (autoTable as any)(doc, {
          head: secHead,
          body: secBody,
          startY: lastY,
          margin: { left: margin, right: margin, top: margin + 5, bottom: margin + 8 },
          styles: {
            fontSize: 7,
            cellPadding: 1.6,
            textColor: [30, 41, 59],
            lineColor: [226, 232, 240],
            lineWidth: 0.2,
          },
          headStyles: {
            fillColor: [30, 41, 59],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 7.5,
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252],
          },
          columnStyles: secColStyles,
          didDrawPage: (data: any) => {
            const str = `Page ${doc.getNumberOfPages()}`;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(148, 163, 184);
            doc.text(str, pageWidth - margin, pageHeight - 5, { align: 'right' });
            doc.text('Rajarshi Shahu Sahakari Bank Ltd. — Confidential', margin, pageHeight - 5);
          },
        });
      });
    }

    // 6. Optional Methodology & Notes
    if (options.notes && options.notes.length > 0) {
      let finalY = (doc as any).lastAutoTable?.finalY || yPos;
      if (finalY + (options.notes.length * 4) + 12 > pageHeight) {
        doc.addPage();
        finalY = margin + 5;
      } else {
        finalY += 7;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text('Methodology & Assumptions:', margin, finalY);
      finalY += 3.5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      options.notes.forEach((note) => {
        doc.text(`• ${note}`, margin + 2, finalY);
        finalY += 3.2;
      });
    }

    // Save PDF
    doc.save(`${options.fileName}_${now.toISOString().slice(0, 10)}.pdf`);
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
   */
  exportTableToExcel(tableElement: any, fileName: string) {
    const worksheet = XLSX.utils.table_to_sheet(tableElement, { raw: true });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    XLSX.writeFile(workbook, `${fileName}_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.xlsx`);
  }

  /**
   * Export data to CSV and trigger download
   */
  exportToCsv(data: any[], columns: { field: string; header: string }[], fileName: string) {
    if (!data || data.length === 0) {
      console.warn('No data to export');
      return;
    }

    const headers = columns.map((col) => col.header).join(',');
    const rows = data.map((row) => {
      return columns
        .map((col) => {
          let val = row[col.field];
          if (val === null || val === undefined) val = '';
          const cell = String(val).replace(/"/g, '""');
          return cell.includes(',') ? `"${cell}"` : cell;
        })
        .join(',');
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
