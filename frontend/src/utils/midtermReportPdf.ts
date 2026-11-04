import { supabase } from '@/lib/supabase';

export type MidtermReportPdfReport = {
  id: string;
};

export type MidtermReportPdfPeriod = {
  name: string;
};

export async function downloadMidtermReportPdf(
  reports: MidtermReportPdfReport[],
  period: MidtermReportPdfPeriod,
) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  if (!reports.length) {
    throw new Error('No reports available for download');
  }

  const { data, error } = await supabase.functions.invoke<Blob>(
    'export-midterm-reports',
    { body: { report_ids: reports.map((report) => report.id) } },
  );
  if (error) throw new Error(error.message || 'Could not prepare report export');
  if (!(data instanceof Blob)) {
    throw new Error('Report export returned an invalid file');
  }

  const url = URL.createObjectURL(data);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `Midterm_${period.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
