import { jsPDF } from 'jspdf';
import { WeeklySheet } from '../types';
import { generateWeeklySummaryCanvas } from './weeklyCanvas';
import { formatDatePtBR } from './calculations';

/**
 * Cria um documento PDF em alta definição a partir do canvas do Resumo Semanal.
 * Enquadrado perfeitamente em formato A4, pronto para impressão, arquivamento e compartilhamento.
 */
export function createWeeklySummaryPdf(sheet: WeeklySheet): jsPDF {
  const canvas = generateWeeklySummaryCanvas(sheet);
  const imgData = canvas.toDataURL('image/png');

  // Dimensões padrão A4 em milímetros (Retrato)
  const a4Width = 210;
  const a4Height = 297;
  const margin = 8; // 8mm de margem

  const maxAvailableWidth = a4Width - margin * 2; // 194mm
  const maxAvailableHeight = a4Height - margin * 2; // 281mm

  const canvasRatio = canvas.width / canvas.height;

  // Ajusta escala proporcionalmente
  let renderWidth = maxAvailableWidth;
  let renderHeight = renderWidth / canvasRatio;

  if (renderHeight > maxAvailableHeight) {
    renderHeight = maxAvailableHeight;
    renderWidth = renderHeight * canvasRatio;
  }

  // Centraliza o relatório na folha A4
  const posX = (a4Width - renderWidth) / 2;
  const posY = (a4Height - renderHeight) / 2;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const startPt = formatDatePtBR(sheet.startDate);
  const endPt = formatDatePtBR(sheet.endDate);

  pdf.setProperties({
    title: `Resumo Fechamento Semanal (${startPt} a ${endPt})`,
    subject: `Fechamento Consolidado Semanal - ${sheet.companyRoute}`,
    author: 'Transporte de Passageiros - Tianguá x Viçosa / Jailson',
    creator: 'Fluxo de Caixa Operacional',
  });

  pdf.addImage(imgData, 'PNG', posX, posY, renderWidth, renderHeight, undefined, 'FAST');

  return pdf;
}

/**
 * Faz o download direto do Resumo do Fechamento Semanal em formato PDF.
 */
export function downloadWeeklySummaryPdf(sheet: WeeklySheet): void {
  const pdf = createWeeklySummaryPdf(sheet);
  const safeStart = sheet.startDate.replace(/[^a-zA-Z0-9]/g, '-');
  const safeEnd = sheet.endDate.replace(/[^a-zA-Z0-9]/g, '-');
  const filename = `Resumo_Semanal_${safeStart}_a_${safeEnd}.pdf`;
  pdf.save(filename);
}

/**
 * Retorna o PDF do Resumo Semanal como Blob para compartilhamento direto.
 */
export function getWeeklySummaryPdfBlob(sheet: WeeklySheet): Blob {
  const pdf = createWeeklySummaryPdf(sheet);
  return pdf.output('blob');
}
