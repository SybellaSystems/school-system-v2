import {
  PDFDocument,
  StandardFonts,
  rgb,
} from "npm:pdf-lib@1.17.1";

type ReportRow = {
  subject?: string;
  mark?: number;
  grade?: string;
};

export type MidtermReportPdfData = {
  student_name: string;
  class_name: string;
  average: number;
  report_data?: { rows?: ReportRow[] };
};

const SCHOOL_NAME = "G.S Gacuba II A";
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 42;
const TABLE_RIGHT = PAGE_WIDTH - MARGIN;
const TABLE_WIDTH = TABLE_RIGHT - MARGIN;
const COLUMN_TWO = MARGIN + TABLE_WIDTH * 0.5;
const COLUMN_THREE = MARGIN + TABLE_WIDTH * 0.75;

function safeText(value: unknown): string {
  return String(value ?? "")
    .replace(/[^\x20-\x7E]/g, "?")
    .replace(/\s+/g, " ")
    .trim();
}

function gradeFor(mark: number) {
  if (mark >= 80) return "A";
  if (mark >= 70) return "B";
  if (mark >= 60) return "C";
  if (mark >= 50) return "D";
  return "F";
}

function positionFor(average: number, allAverages: number[]) {
  return [...allAverages].sort((a, b) => b - a).indexOf(average) + 1;
}

export async function generateMidtermReportPdf(
  report: MidtermReportPdfData,
  periodName: string,
  periodDate: string,
  allAverages: number[],
) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - 28;

  const draw = (
    text: string,
    x: number,
    yy: number,
    size = 10,
    isBold = false,
    align: "left" | "center" = "left",
  ) => {
    const txt = safeText(text);
    const selectedFont = isBold ? bold : font;
    const drawX =
      align === "center"
        ? (PAGE_WIDTH - selectedFont.widthOfTextAtSize(txt, size)) / 2
        : x;
    page.drawText(txt, {
      x: drawX,
      y: yy - size,
      size,
      font: selectedFont,
      color: rgb(0.13, 0.13, 0.13),
    });
  };

  draw(SCHOOL_NAME, 0, y, 14, true, "center");
  y -= 18;
  draw("Mid-term report Card", 0, y, 11, true, "center");
  y -= 30;
  draw(`Student: ${report.student_name}`, MARGIN, y, 10);
  draw(`Class: ${report.class_name}`, 350, y, 10);
  y -= 18;
  draw(`Assessment: ${periodName}`, MARGIN, y, 10);
  y -= 18;
  draw(`Date: ${periodDate}`, MARGIN, y, 10);
  y -= 28;

  const drawRow = (values: string[], isBold = false) => {
    page.drawRectangle({
      x: MARGIN,
      y: y - 18,
      width: TABLE_WIDTH,
      height: 20,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });
    page.drawLine({
      start: { x: COLUMN_TWO, y: y + 2 },
      end: { x: COLUMN_TWO, y: y - 18 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    page.drawLine({
      start: { x: COLUMN_THREE, y: y + 2 },
      end: { x: COLUMN_THREE, y: y - 18 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    draw(values[0], MARGIN + 6, y, 10, isBold);
    draw(values[1], COLUMN_TWO + 6, y, 10, isBold);
    draw(values[2], COLUMN_THREE + 6, y, 10, isBold);
    y -= 22;
  };

  drawRow(["Subject", "Marks / 100", "Grade"], true);
  for (const row of report.report_data?.rows ?? []) {
    if (y < 120) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - 50;
    }
    drawRow([
      safeText(row.subject ?? "-"),
      String(row.mark ?? "-"),
      safeText(row.grade ?? gradeFor(Number(row.mark))),
    ]);
  }

  y -= 20;
  if (y < 100) {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - 80;
  }
  draw(`Position: ${positionFor(report.average, allAverages)}`, MARGIN, y, 11);
  draw(`Average: ${Number(report.average).toFixed(1)}%`, 350, y, 11, true);
  y -= 30;
  page.drawLine({
    start: { x: MARGIN, y: y + 20 },
    end: { x: TABLE_RIGHT, y: y + 20 },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  draw("Decision: _________________________", MARGIN, y, 10);
  draw(
    `${SCHOOL_NAME} - Generated ${new Date().toLocaleDateString()}`,
    0,
    30,
    7,
    false,
    "center",
  );

  return pdf.save();
}
