import { jsPDF } from 'jspdf';
import { DayRecord, WeeklySheet } from '../types';
import { generateTicketCanvas } from './ticketCanvas';
import { formatDatePtBR } from './calculations';

/**
 * Cria um documento PDF em alta definição a partir do canvas do comprovante.
 * Enquadrado perfeitamente em formato A4, pronto para impressão e compartilhamento.
 */
export function createTicketPdf(day: DayRecord, sheet: WeeklySheet): jsPDF {
  const canvas = generateTicketCanvas(day, sheet);
  const imgData = canvas.toDataURL('image/png');

  // Dimensões A4 padrão em milímetros
  const a4Width = 210;
  const a4Height = 297;
  const margin = 8; // Margem de segurança de 8mm

  const maxAvailableWidth = a4Width - margin * 2; // 194mm
  const maxAvailableHeight = a4Height - margin * 2; // 281mm

  const canvasRatio = canvas.width / canvas.height;

  // Calcula escala mantendo proporção exata sem distorção
  let renderWidth = maxAvailableWidth;
  let renderHeight = renderWidth / canvasRatio;

  if (renderHeight > maxAvailableHeight) {
    renderHeight = maxAvailableHeight;
    renderWidth = renderHeight * canvasRatio;
  }

  // Centraliza o comprovante na folha A4
  const posX = (a4Width - renderWidth) / 2;
  const posY = (a4Height - renderHeight) / 2;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  // Metadados do documento
  pdf.setProperties({
    title: `Comprovante de Caixa - ${day.dayLabel} (${formatDatePtBR(day.date)})`,
    subject: `Fechamento Diário de Caixa - ${sheet.companyRoute}`,
    author: 'Transporte de Passageiros - Tianguá x Viçosa / Jailson',
    creator: 'Fluxo de Caixa Operacional',
  });

  // Renderiza a imagem do comprovante no PDF
  pdf.addImage(imgData, 'PNG', posX, posY, renderWidth, renderHeight, undefined, 'FAST');

  return pdf;
}

/**
 * Faz o download direto do comprovante em formato PDF.
 */
export function downloadTicketPdf(day: DayRecord, sheet: WeeklySheet): void {
  const pdf = createTicketPdf(day, sheet);
  const safeDate = day.date.replace(/[^a-zA-Z0-9]/g, '-');
  const filename = `Comprovante_Caixa_${day.dayOfWeek}_${safeDate}.pdf`;
  pdf.save(filename);
}

/**
 * Retorna o comprovante em formato Blob PDF (para compartilhamento nativo no celular / WhatsApp).
 */
export function getTicketPdfBlob(day: DayRecord, sheet: WeeklySheet): Blob {
  const pdf = createTicketPdf(day, sheet);
  return pdf.output('blob');
}
