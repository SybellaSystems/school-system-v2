import jsPDF from 'jspdf';

export type MidtermReportRow = {
  subject: string;
  mark: number;
  grade?: string;
};

export type MidtermReportPdfReport = {
  student_name: string;
  class_name: string;
  average: number;
  report_data: { rows?: MidtermReportRow[] };
};

export type MidtermReportPdfPeriod = {
  name: string;
  official_date: string;
};

const SCHOOL_NAME = 'G.S Gacuba II A';
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 42;
const TABLE_WIDTH = PAGE_WIDTH - MARGIN * 2;
const COLUMN_TWO = MARGIN + TABLE_WIDTH * 0.5;
const COLUMN_THREE = MARGIN + TABLE_WIDTH * 0.75;
const ROW_HEIGHT = 22;

function gradeFor(mark: number) {
  if (mark >= 80) return 'A';
  if (mark >= 70) return 'B';
  if (mark >= 60) return 'C';
  if (mark >= 50) return 'D';
  return 'F';
}

function positionFor(average: number, allAverages: number[]) {
  return [...allAverages].sort((a, b) => b - a).indexOf(average) + 1;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-GB');
}

function safeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60) || 'student';
}

export function createMidtermReportPdf(
  reports: MidtermReportPdfReport[],
  period: MidtermReportPdfPeriod,
) {
  const pdf = new jsPDF('p', 'pt', 'a4');
  const allAverages = reports.map((report) => report.average);

  reports.forEach((report, index) => {
    if (index > 0) pdf.addPage();

    let y = PAGE_HEIGHT - 28;
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(SCHOOL_NAME, PAGE_WIDTH / 2, y - 14, { align: 'center' });
    y -= 18;
    pdf.setFontSize(11);
    pdf.text('Mid-term report Card', PAGE_WIDTH / 2, y - 11, { align: 'center' });
    y -= 30;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Student: ${report.student_name}`, MARGIN, y - 10);
    pdf.text(`Class: ${report.class_name}`, 350, y - 10);
    y -= 18;
    pdf.text(`Assessment: ${period.name}`, MARGIN, y - 10);
    y -= 18;
    pdf.text(`Date: ${formatDate(period.official_date)}`, MARGIN, y - 10);
    y -= 28;

    const drawRow = (values: string[], bold = false) => {
      pdf.setFont('helvetica', bold ? 'bold' : 'normal');
      pdf.rect(MARGIN, y - 18, TABLE_WIDTH, 20);
      pdf.line(COLUMN_TWO, y + 2, COLUMN_TWO, y - 18);
      pdf.line(COLUMN_THREE, y + 2, COLUMN_THREE, y - 18);
      pdf.text(values[0], MARGIN + 6, y - 10);
      pdf.text(values[1], COLUMN_TWO + 6, y - 10);
      pdf.text(values[2], COLUMN_THREE + 6, y - 10);
      y -= ROW_HEIGHT;
    };

    drawRow(['Subject', 'Marks / 100', 'Grade'], true);
    (report.report_data.rows ?? []).forEach((row) =>
      drawRow([row.subject, String(row.mark), row.grade || gradeFor(row.mark)]),
    );

    y -= 20;
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Position: ${positionFor(report.average, allAverages)}`, MARGIN, y - 11);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Average: ${Number(report.average).toFixed(1)}%`, 350, y - 11);
    y -= 30;
    pdf.setFontSize(10);
    pdf.text('Decision: _________________________', MARGIN, y - 10);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.text(
      `${SCHOOL_NAME} - Generated ${new Date().toLocaleDateString()}`,
      PAGE_WIDTH / 2,
      23,
      { align: 'center' },
    );
  });

  return pdf;
}

export function downloadMidtermReportPdf(
  reports: MidtermReportPdfReport[],
  period: MidtermReportPdfPeriod,
) {
  const pdf = createMidtermReportPdf(reports, period);
  pdf.save(`Midterm_${safeFileName(period.name)}.pdf`);
}
