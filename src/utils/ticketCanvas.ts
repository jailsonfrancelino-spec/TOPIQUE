import { DayRecord, WeeklySheet } from '../types';
import { calculateDayTotals, calculateTripSubtotal, formatCurrency, formatDatePtBR } from './calculations';

/**
 * Gera um canvas 2D nativo em altíssima resolução com o comprovante diário completo.
 * 100% livre de dependências de CSS/html2canvas, garantindo 0 falhas em qualquer navegador/celular.
 */
export function generateTicketCanvas(day: DayRecord, sheet: WeeklySheet): HTMLCanvasElement {
  const totals = calculateDayTotals(day);
  const formattedDate = formatDatePtBR(day.date);

  // Escala para Retina / Alta Resolução (2x)
  const scale = 2;
  const baseWidth = 620;

  // Cálculo dinâmico da altura necessária
  const headerHeight = 175;
  const tripsHeaderHeight = 40;
  const tripRowHeight = 32;
  const tripsTotalHeight = 44;
  const tripsHeight = tripsHeaderHeight + (day.trips.length * tripRowHeight) + tripsTotalHeight;
  
  const paymentBreakdownHeight = 85;

  const validExpenses = day.expenses;
  const expensesHeaderHeight = 36;
  const expenseRowHeight = 28;
  const expensesHeight = expensesHeaderHeight + (validExpenses.length * expenseRowHeight) + 36;

  const sobraLiquidaHeight = 65;
  const sobraEspecieHeight = 145;
  const footerHeight = 70;
  const paddingY = 40;

  const baseHeight = headerHeight + tripsHeight + paymentBreakdownHeight + expensesHeight + sobraLiquidaHeight + sobraEspecieHeight + footerHeight + paddingY;

  const canvas = document.createElement('canvas');
  canvas.width = baseWidth * scale;
  canvas.height = baseHeight * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Configurar escala e renderização nítida
  ctx.scale(scale, scale);
  ctx.textBaseline = 'middle';
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. Fundo Branco com borda elegante
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, baseWidth, baseHeight);

  // Borda externa suave
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, baseWidth - 2, baseHeight - 2);

  let currentY = 24;

  // 2. CABEÇALHO
  // Título da rota / empresa
  ctx.fillStyle = '#1e3a8a';
  ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(sheet.companyRoute.toUpperCase(), baseWidth / 2, currentY);
  currentY += 22;

  ctx.fillStyle = '#0f172a';
  ctx.font = '900 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('COMPROVANTE DE FECHAMENTO DE CAIXA', baseWidth / 2, currentY);
  currentY += 22;

  // Banner do Dia da Semana
  const bannerY = currentY;
  const bannerHeight = 56;
  const bannerMargin = 20;
  const bannerWidth = baseWidth - (bannerMargin * 2);

  ctx.fillStyle = '#047857'; // Verde Esmeralda
  roundRect(ctx, bannerMargin, bannerY, bannerWidth, bannerHeight, 10);
  ctx.fill();

  ctx.fillStyle = '#a7f3d0';
  ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('FECHAMENTO DIÁRIO OFICIAL', baseWidth / 2, bannerY + 16);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`${day.dayLabel.toUpperCase()} — ${formattedDate}`, baseWidth / 2, bannerY + 38);

  currentY += bannerHeight + 18;

  // Linha tracejada separadora
  drawDashedLine(ctx, 20, currentY, baseWidth - 20, currentY);
  currentY += 16;

  // 3. SEÇÃO DE TODAS AS VIAGENS
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`DETALHAMENTO DE TODAS AS VIAGENS (${day.trips.length} VIAGENS)`, 20, currentY);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Valores em Reais (R$)', baseWidth - 20, currentY);
  currentY += 12;

  // Tabela de Viagens
  const tableX = 20;
  const tableW = baseWidth - 40;
  const colW = {
    viagem: 110,
    ida: 80,
    volta: 80,
    encom: 80,
    pix: 85,
    subtotal: 105,
  };

  // Cabeçalho da Tabela
  ctx.fillStyle = '#f1f5f9';
  roundRect(ctx, tableX, currentY, tableW, 28, 6);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#334155';
  ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('VIAGEM', tableX + 8, currentY + 14);
  
  ctx.textAlign = 'right';
  ctx.fillText('IDA', tableX + colW.viagem + colW.ida - 8, currentY + 14);
  ctx.fillText('VOLTA', tableX + colW.viagem + colW.ida + colW.volta - 8, currentY + 14);
  ctx.fillText('ENCOM.', tableX + colW.viagem + colW.ida + colW.volta + colW.encom - 8, currentY + 14);
  
  ctx.fillStyle = '#1e40af';
  ctx.fillText('PIX', tableX + colW.viagem + colW.ida + colW.volta + colW.encom + colW.pix - 8, currentY + 14);

  ctx.fillStyle = '#0f172a';
  ctx.fillText('SUBTOTAL', tableX + tableW - 10, currentY + 14);

  currentY += 28;

  // Linhas de cada viagem
  day.trips.forEach((trip, index) => {
    const sub = calculateTripSubtotal(trip);
    const isEven = index % 2 === 0;

    if (isEven) {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(tableX, currentY, tableW, tripRowHeight);
    }

    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tableX, currentY + tripRowHeight);
    ctx.lineTo(tableX + tableW, currentY + tripRowHeight);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(trip.tripName || `${index + 1}ª Viagem`, tableX + 8, currentY + (tripRowHeight / 2));

    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#334155';
    ctx.fillText(trip.ida > 0 ? trip.ida.toFixed(2) : '-', tableX + colW.viagem + colW.ida - 8, currentY + (tripRowHeight / 2));
    ctx.fillText(trip.volta > 0 ? trip.volta.toFixed(2) : '-', tableX + colW.viagem + colW.ida + colW.volta - 8, currentY + (tripRowHeight / 2));
    ctx.fillText(trip.encom > 0 ? trip.encom.toFixed(2) : '-', tableX + colW.viagem + colW.ida + colW.volta + colW.encom - 8, currentY + (tripRowHeight / 2));
    
    // PIX
    ctx.fillStyle = '#1d4ed8';
    ctx.fillText(trip.pix > 0 ? trip.pix.toFixed(2) : '-', tableX + colW.viagem + colW.ida + colW.volta + colW.encom + colW.pix - 8, currentY + (tripRowHeight / 2));

    // Subtotal
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.fillText(formatCurrency(sub), tableX + tableW - 10, currentY + (tripRowHeight / 2));

    currentY += tripRowHeight;
  });

  // Linha de Totais da Tabela
  ctx.fillStyle = '#e2e8f0';
  roundRect(ctx, tableX, currentY, tableW, tripsTotalHeight, 6);
  ctx.fill();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('TOTAIS', tableX + 8, currentY + (tripsTotalHeight / 2));

  ctx.font = 'bold 11px "JetBrains Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#1e293b';
  ctx.fillText(totals.totalIda.toFixed(2), tableX + colW.viagem + colW.ida - 8, currentY + (tripsTotalHeight / 2));
  ctx.fillText(totals.totalVolta.toFixed(2), tableX + colW.viagem + colW.ida + colW.volta - 8, currentY + (tripsTotalHeight / 2));
  ctx.fillText(totals.totalEncom.toFixed(2), tableX + colW.viagem + colW.ida + colW.volta + colW.encom - 8, currentY + (tripsTotalHeight / 2));
  
  ctx.fillStyle = '#1e40af';
  ctx.fillText(totals.totalPix.toFixed(2), tableX + colW.viagem + colW.ida + colW.volta + colW.encom + colW.pix - 8, currentY + (tripsTotalHeight / 2));

  ctx.fillStyle = '#047857';
  ctx.font = '900 13px "JetBrains Mono", monospace';
  ctx.fillText(formatCurrency(totals.totalArrecadado), tableX + tableW - 10, currentY + (tripsTotalHeight / 2));

  currentY += tripsTotalHeight + 12;

  // 4. BLOCO DE REPARTIÇÃO: TOTAL PIX vs TOTAL DINHEIRO
  const splitBoxW = (tableW - 12) / 2;

  // Box PIX
  ctx.fillStyle = '#eff6ff';
  roundRect(ctx, tableX, currentY, splitBoxW, 58, 8);
  ctx.fill();
  ctx.strokeStyle = '#bfdbfe';
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#1d4ed8';
  ctx.font = 'bold 9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('TOTAL EM PIX (CONTA BANCÁRIA)', tableX + 12, currentY + 16);

  ctx.font = '900 16px "JetBrains Mono", monospace';
  ctx.fillStyle = '#1e3a8a';
  ctx.fillText(formatCurrency(totals.totalPix), tableX + 12, currentY + 36);

  ctx.font = '8px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#3b82f6';
  ctx.fillText('Caiu direto na conta bancária', tableX + 12, currentY + 50);

  // Box Dinheiro Entrada
  const boxDinheiroX = tableX + splitBoxW + 12;
  ctx.fillStyle = '#f0fdf4';
  roundRect(ctx, boxDinheiroX, currentY, splitBoxW, 58, 8);
  ctx.fill();
  ctx.strokeStyle = '#bbf7d0';
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#15803d';
  ctx.font = 'bold 9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('TOTAL RECEBIDO EM DINHEIRO', boxDinheiroX + 12, currentY + 16);

  ctx.font = '900 16px "JetBrains Mono", monospace';
  ctx.fillStyle = '#14532d';
  ctx.fillText(formatCurrency(totals.totalDinheiro), boxDinheiroX + 12, currentY + 36);

  ctx.font = '8px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#16a34a';
  ctx.fillText('Cédulas físicas recebidas', boxDinheiroX + 12, currentY + 50);

  currentY += 58 + 16;

  // 5. DESPESAS OPERACIONAIS
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('DESPESAS OPERACIONAIS DO DIA', tableX, currentY);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#be123c';
  ctx.font = '900 12px "JetBrains Mono", monospace';
  ctx.fillText(`TOTAL: ${formatCurrency(totals.totalDespesas)}`, tableX + tableW, currentY);
  currentY += 12;

  // Grid com despesas
  const expBoxW = (tableW - 10) / 2;
  validExpenses.forEach((exp, idx) => {
    const isColRight = idx % 2 !== 0;
    const itemX = isColRight ? tableX + expBoxW + 10 : tableX;
    const itemY = currentY + (Math.floor(idx / 2) * (expenseRowHeight + 6));

    ctx.fillStyle = '#fff1f2';
    roundRect(ctx, itemX, itemY, expBoxW, expenseRowHeight, 6);
    ctx.fill();
    ctx.strokeStyle = '#fecdd3';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`${exp.label}:`, itemX + 8, itemY + (expenseRowHeight / 2));

    ctx.textAlign = 'right';
    ctx.fillStyle = '#be123c';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.fillText(formatCurrency(exp.value || 0), itemX + expBoxW - 8, itemY + (expenseRowHeight / 2));
  });

  currentY += (Math.ceil(validExpenses.length / 2) * (expenseRowHeight + 6)) + 14;

  // 6. SOBRA LÍQUIDA GERAL
  ctx.fillStyle = '#f8fafc';
  roundRect(ctx, tableX, currentY, tableW, 44, 8);
  ctx.fill();
  ctx.strokeStyle = '#cbd5e1';
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('SOBRA LÍQUIDA GERAL (Arrecadação - Despesas)', tableX + 12, currentY + 22);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#1e3a8a';
  ctx.font = '900 16px "JetBrains Mono", monospace';
  ctx.fillText(formatCurrency(totals.sobraLiquida), tableX + tableW - 12, currentY + 22);

  currentY += 44 + 14;

  // 7. DESTAQUE MÁXIMO: SOBRA REAL EM DINHEIRO (ESPÉCIE NO CAIXA)
  const sobraBoxY = currentY;
  const sobraBoxHeight = 118;

  ctx.fillStyle = '#047857'; // Verde Escuro
  roundRect(ctx, tableX, sobraBoxY, tableW, sobraBoxHeight, 14);
  ctx.fill();
  ctx.strokeStyle = '#065f46';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#a7f3d0';
  ctx.font = '900 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('⭐ SOBRA REAL EM DINHEIRO (ESPÉCIE NO CAIXA)', baseWidth / 2, sobraBoxY + 22);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 28px "JetBrains Mono", monospace';
  ctx.fillText(formatCurrency(totals.sobraDinheiroEspecie), baseWidth / 2, sobraBoxY + 54);

  // Pílula da Fórmula
  const pillY = sobraBoxY + 76;
  ctx.fillStyle = 'rgba(6, 95, 70, 0.9)';
  roundRect(ctx, (baseWidth / 2) - 180, pillY, 360, 20, 10);
  ctx.fill();

  ctx.fillStyle = '#d1fae5';
  ctx.font = 'bold 9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`Fórmula: Sobra Líquida (${formatCurrency(totals.sobraLiquida)}) — Total PIX (${formatCurrency(totals.totalPix)})`, baseWidth / 2, pillY + 10);

  ctx.fillStyle = '#a7f3d0';
  ctx.font = 'italic 9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('💵 Este é o valor exato em cédulas físicas que deve estar no caixa em mãos.', baseWidth / 2, sobraBoxY + 106);

  currentY += sobraBoxHeight + 14;

  // 8. RODAPÉ DE VALIDAÇÃO
  drawDashedLine(ctx, 20, currentY, baseWidth - 20, currentY);
  currentY += 16;

  ctx.textAlign = 'center';
  ctx.fillStyle = '#047857';
  ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('✔ Fechamento Conferido e Aprovado', baseWidth / 2, currentY);

  const now = new Date();
  const timeStr = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`Documento digital gerado em ${timeStr}`, baseWidth / 2, currentY + 16);

  return canvas;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawDashedLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.save();
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}
