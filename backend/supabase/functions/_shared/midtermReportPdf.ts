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
const INK = rgb(0.12, 0.14, 0.16);
const MUTED_INK = rgb(0.35, 0.38, 0.4);
const RULE = rgb(0.78, 0.79, 0.8);
const HEADER_FILL = rgb(0.93, 0.94, 0.94);

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
  input: MidtermReportPdfData | MidtermReportPdfData[],
  periodName: string,
  periodDate: string,
  allAverages: number[],
) {
  const reports = Array.isArray(input) ? input : [input];
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  reports.forEach((report) => {
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
        color: isBold ? INK : MUTED_INK,
      });
    };

    draw(SCHOOL_NAME, 0, y, 16, true, "center");
    y -= 20;
    draw("MID-TERM REPORT CARD", 0, y, 10, true, "center");
    y -= 16;
    page.drawLine({
      start: { x: MARGIN, y: y },
      end: { x: TABLE_RIGHT, y: y },
      thickness: 1.2,
      color: INK,
    });
    y -= 26;
    draw("STUDENT", MARGIN, y, 7, true);
    draw("CLASS", 350, y, 7, true);
    y -= 12;
    draw(safeText(report.student_name), MARGIN, y, 10);
    draw(safeText(report.class_name), 350, y, 10);
    y -= 18;
    draw("ASSESSMENT", MARGIN, y, 7, true);
    draw("DATE", 350, y, 7, true);
    y -= 12;
    draw(safeText(periodName), MARGIN, y, 10);
    draw(safeText(periodDate), 350, y, 10);
    y -= 28;

    const drawRow = (values: string[], isBold = false) => {
      page.drawRectangle({
        x: MARGIN,
        y: y - 18,
        width: TABLE_WIDTH,
        height: 20,
        color: isBold ? HEADER_FILL : undefined,
        borderColor: RULE,
        borderWidth: 0.7,
      });
      page.drawLine({
        start: { x: COLUMN_TWO, y: y + 2 },
        end: { x: COLUMN_TWO, y: y - 18 },
        thickness: 0.7,
        color: RULE,
      });
      page.drawLine({
        start: { x: COLUMN_THREE, y: y + 2 },
        end: { x: COLUMN_THREE, y: y - 18 },
        thickness: 0.7,
        color: RULE,
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

    y -= 26;
    if (y < 100) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - 80;
    }
    page.drawRectangle({
      x: MARGIN,
      y: y - 34,
      width: TABLE_WIDTH,
      height: 34,
      borderColor: RULE,
      borderWidth: 0.7,
    });
    draw("POSITION", MARGIN + 10, y - 7, 7, true);
    draw(String(positionFor(report.average, allAverages)), MARGIN + 10, y - 18, 12, true);
    draw("AVERAGE", 350, y - 7, 7, true);
    draw(`${Number(report.average).toFixed(1)}%`, 350, y - 18, 12, true);
    y -= 54;
    draw("DECISION", MARGIN, y, 7, true);
    page.drawLine({
      start: { x: MARGIN, y: y - 13 },
      end: { x: MARGIN + 190, y: y - 13 },
      thickness: 0.7,
      color: RULE,
    });
    draw(
      `Generated ${new Date().toLocaleDateString("en-GB")}`,
      0,
      30,
      7,
      false,
      "center",
    );

  });

  return pdf.save();
}
