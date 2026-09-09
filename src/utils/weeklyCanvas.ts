import { WeeklySheet } from '../types';
import { calculateWeeklyTotals, formatCurrency, formatDatePtBR } from './calculations';

/**
 * Gera um canvas 2D nativo em altíssima resolução com o Resumo Consolidado do Fechamento Semanal.
 * 100% nativo, sem bibliotecas externas instáveis, compatível com computadores e celulares.
 */
export function generateWeeklySummaryCanvas(sheet: WeeklySheet): HTMLCanvasElement {
  const weekly = calculateWeeklyTotals(sheet);
  const startDateStr = formatDatePtBR(sheet.startDate);
  const endDateStr = formatDatePtBR(sheet.endDate);

  // Escala para Retina / Alta Resolução (2x)
  const scale = 2;
  const baseWidth = 780;

  // Cálculo de alturas
  const headerHeight = 150;
  const kpisHeight = 110;
  const tableHeaderHeight = 36;
  const tableRowHeight = 28;
  const tableTotalRowHeight = 36;
  const tableHeight = tableHeaderHeight + (weekly.daysSummary.length * tableRowHeight) + tableTotalRowHeight + 20;
  const breakdownsHeight = 120;
  const bigCashBoxHeight = 120;
  const footerHeight = 60;
  const paddingY = 40;

  const baseHeight = headerHeight + kpisHeight + tableHeight + breakdownsHeight + bigCashBoxHeight + footerHeight + paddingY;

  const canvas = document.createElement('canvas');
  canvas.width = baseWidth * scale;
  canvas.height = baseHeight * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.scale(scale, scale);
  ctx.textBaseline = 'middle';
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. Fundo Branco com borda externa
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, baseWidth, baseHeight);

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, baseWidth - 2, baseHeight - 2);

  let currentY = 24;

  // 2. CABEÇALHO
  ctx.fillStyle = '#1e3a8a';
  ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(sheet.companyRoute.toUpperCase(), baseWidth / 2, currentY);
  currentY += 22;

  ctx.fillStyle = '#0f172a';
  ctx.font = '900 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('FECHAMENTO CONSOLIDADO SEMANAL DE CAIXA', baseWidth / 2, currentY);
  currentY += 22;

  // Banner da Semana
  const bannerY = currentY;
  const bannerHeight = 52;
  const bannerMargin = 24;
  const bannerWidth = baseWidth - (bannerMargin * 2);

  ctx.fillStyle = '#1e3a8a'; // Azul Marinho Corporativo
  roundRect(ctx, bannerMargin, bannerY, bannerWidth, bannerHeight, 10);
  ctx.fill();

  ctx.fillStyle = '#93c5fd';
  ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('PERÍODO OPERACIONAL (SEGUNDA A DOMINGO)', baseWidth / 2, bannerY + 16);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`SEMANA DE ${startDateStr} A ${endDateStr}`, baseWidth / 2, bannerY + 36);

  currentY += bannerHeight + 18;

  // 3. CARDS DE KPI (4 Caixas informativas)
  const cardMargin = 24;
  const totalCardsWidth = baseWidth - (cardMargin * 2);
  const cardGap = 12;
  const cardWidth = (totalCardsWidth - (cardGap * 3)) / 4;
  const cardHeight = 76;

  // Card 1: Arrecadação Total
  drawKpiCard(
    ctx, 
    cardMargin, 
    currentY, 
    cardWidth, 
    cardHeight, 
    'ARRECADAÇÃO TOTAL', 
    formatCurrency(weekly.totalArrecadacao), 
    `${weekly.tripsCount} viagens registradas`,
    '#f8fafc',
    '#0f172a',
    '#2563eb'
  );

  // Card 2: Despesas
  drawKpiCard(
    ctx, 
    cardMargin + cardWidth + cardGap, 
    currentY, 
    cardWidth, 
    cardHeight, 
    'DESPESAS TOTAIS', 
    formatCurrency(weekly.totalDespesas), 
    'Combustível + Diárias + Outros',
    '#fff1f2',
    '#e11d48',
    '#e11d48'
  );

  // Card 3: Sobra Líquida
  drawKpiCard(
    ctx, 
    cardMargin + (cardWidth + cardGap) * 2, 
    currentY, 
    cardWidth, 
    cardHeight, 
    'SOBRA LÍQUIDA', 
    formatCurrency(weekly.totalSobraLiquida), 
    `Margem: ${weekly.margemLucroPercent.toFixed(1)}%`,
    '#eff6ff',
    '#1e40af',
    '#1e40af'
  );

  // Card 4: SOBRA EM ESPÉCIE (DESTACADO EM VERDE)
  drawKpiCard(
    ctx, 
    cardMargin + (cardWidth + cardGap) * 3, 
    currentY, 
    cardWidth, 
    cardHeight, 
    'SOBRA EM ESPÉCIE', 
    formatCurrency(weekly.totalSobraDinheiroEspecie), 
    'Dinheiro físico em mãos',
    '#ecfdf5',
    '#047857',
    '#059669',
    true // borda destacada
  );

  currentY += cardHeight + 18;

  // 4. TABELA PRINCIPAL DE DIAS DA SEMANA
  const tableX = 24;
  const tableW = baseWidth - (tableX * 2);

  // Cabeçalho da Tabela
  ctx.fillStyle = '#0f172a';
  roundRect(ctx, tableX, currentY, tableW, tableHeaderHeight, 6);
  ctx.fill();

  const cols = [
    { label: 'DIA DA SEMANA', width: 140, align: 'left' },
    { label: 'ARRECADAÇÃO', width: 100, align: 'right' },
    { label: 'DESPESAS', width: 95, align: 'right' },
    { label: 'DINHEIRO', width: 95, align: 'right' },
    { label: 'PIX', width: 95, align: 'right' },
    { label: 'SOBRA LÍQ.', width: 100, align: 'right' },
    { label: 'SOBRA ESPÉCIE', width: 105, align: 'right' },
  ];

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  let curX = tableX;

  cols.forEach((col) => {
    ctx.textAlign = col.align as CanvasTextAlign;
    const textX = col.align === 'left' ? curX + 10 : curX + col.width - 10;
    ctx.fillText(col.label, textX, currentY + (tableHeaderHeight / 2));
    curX += col.width;
  });

  currentY += tableHeaderHeight;

  // Linhas dos Dias da Semana
  weekly.daysSummary.forEach((day, index) => {
    const rowY = currentY + (index * tableRowHeight);
    const isEven = index % 2 === 0;

    // Fundo zebrado
    ctx.fillStyle = isEven ? '#ffffff' : '#f8fafc';
    ctx.fillRect(tableX, rowY, tableW, tableRowHeight);

    // Linha inferior sutil
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tableX, rowY + tableRowHeight);
    ctx.lineTo(tableX + tableW, rowY + tableRowHeight);
    ctx.stroke();

    let colX = tableX;

    // Coluna 1: Dia da Semana
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(day.dayLabel, colX + 10, rowY + (tableRowHeight / 2));
    colX += cols[0].width;

    // Coluna 2: Arrecadação
    ctx.textAlign = 'right';
    ctx.fillStyle = '#0f172a';
    ctx.font = '500 11px monospace';
    ctx.fillText(formatCurrency(day.arrecadacao), colX + cols[1].width - 10, rowY + (tableRowHeight / 2));
    colX += cols[1].width;

    // Coluna 3: Despesas
    ctx.fillStyle = '#e11d48';
    ctx.fillText(formatCurrency(day.despesas), colX + cols[2].width - 10, rowY + (tableRowHeight / 2));
    colX += cols[2].width;

    // Coluna 4: Dinheiro
    ctx.fillStyle = '#047857';
    ctx.fillText(formatCurrency(day.dinheiro), colX + cols[3].width - 10, rowY + (tableRowHeight / 2));
    colX += cols[3].width;

    // Coluna 5: Pix
    ctx.fillStyle = '#1d4ed8';
    ctx.fillText(formatCurrency(day.pix), colX + cols[4].width - 10, rowY + (tableRowHeight / 2));
    colX += cols[4].width;

    // Coluna 6: Sobra Líquida
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = day.sobraLiquida >= 0 ? '#0f172a' : '#e11d48';
    ctx.fillText(formatCurrency(day.sobraLiquida), colX + cols[5].width - 10, rowY + (tableRowHeight / 2));
    colX += cols[5].width;

    // Coluna 7: Sobra Espécie
    ctx.fillStyle = day.sobraDinheiroEspecie >= 0 ? '#047857' : '#e11d48';
    ctx.fillText(formatCurrency(day.sobraDinheiroEspecie), colX + cols[6].width - 10, rowY + (tableRowHeight / 2));
  });

  currentY += (weekly.daysSummary.length * tableRowHeight);

  // Linha de TOTAL DA SEMANA
  const totalRowY = currentY;
  ctx.fillStyle = '#0f172a';
  roundRect(ctx, tableX, totalRowY, tableW, tableTotalRowHeight, 6);
  ctx.fill();

  let totX = tableX;

  // Label Total
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fbbf24'; // Âmbar dourado
  ctx.font = '900 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('TOTAL DA SEMANA', totX + 10, totalRowY + (tableTotalRowHeight / 2));
  totX += cols[0].width;

  // Arrecadação Total
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px monospace';
  ctx.fillText(formatCurrency(weekly.totalArrecadacao), totX + cols[1].width - 10, totalRowY + (tableTotalRowHeight / 2));
  totX += cols[1].width;

  // Despesas Total
  ctx.fillStyle = '#fca5a5';
  ctx.fillText(formatCurrency(weekly.totalDespesas), totX + cols[2].width - 10, totalRowY + (tableTotalRowHeight / 2));
  totX += cols[2].width;

  // Dinheiro Total
  ctx.fillStyle = '#86efac';
  ctx.fillText(formatCurrency(weekly.totalDinheiro), totX + cols[3].width - 10, totalRowY + (tableTotalRowHeight / 2));
  totX += cols[3].width;

  // Pix Total
  ctx.fillStyle = '#93c5fd';
  ctx.fillText(formatCurrency(weekly.totalPix), totX + cols[4].width - 10, totalRowY + (tableTotalRowHeight / 2));
  totX += cols[4].width;

  // Sobra Líquida Total
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 11px monospace';
  ctx.fillText(formatCurrency(weekly.totalSobraLiquida), totX + cols[5].width - 10, totalRowY + (tableTotalRowHeight / 2));
  totX += cols[5].width;

  // Sobra Espécie Total
  ctx.fillStyle = '#a7f3d0';
  ctx.font = '900 12px monospace';
  ctx.fillText(formatCurrency(weekly.totalSobraDinheiroEspecie), totX + cols[6].width - 10, totalRowY + (tableTotalRowHeight / 2));

  currentY += tableTotalRowHeight + 18;

  // 5. DETALHAMENTO DE ORIGEM E CUSTOS (2 Colunas lado a lado)
  const detailBoxW = (tableW - 12) / 2;
  const detailBoxH = 92;

  // Origem das Receitas
  drawDetailBox(
    ctx,
    tableX,
    currentY,
    detailBoxW,
    detailBoxH,
    'ORIGEM DAS RECEITAS',
    [
      { label: 'Passagens - Ida', val: formatCurrency(weekly.totalIda) },
      { label: 'Passagens - Volta', val: formatCurrency(weekly.totalVolta) },
      { label: 'Encomendas & Fretes', val: formatCurrency(weekly.totalEncomendas) },
    ],
    '#1e3a8a'
  );

  // Detalhamento de Custos
  drawDetailBox(
    ctx,
    tableX + detailBoxW + 12,
    currentY,
    detailBoxW,
    detailBoxH,
    'DETALHAMENTO DE CUSTOS',
    [
      { label: 'Combustível (Posto)', val: formatCurrency(weekly.totalCombustivel) },
      { label: 'Diárias Motoristas', val: formatCurrency(weekly.totalMotorista) },
      { label: 'Diárias Cobradores / Outros', val: formatCurrency(weekly.totalCobrador + weekly.totalOutrasDespesas) },
    ],
    '#be123c'
  );

  currentY += detailBoxH + 16;

  // 6. DESTAQUE ESPECIAL: SOBRA REAL EM DINHEIRO EM ESPÉCIE
  const sobraBoxY = currentY;
  const sobraBoxHeight = 88;

  ctx.fillStyle = '#064e3b'; // Verde escuro elegante
  roundRect(ctx, tableX, sobraBoxY, tableW, sobraBoxHeight, 10);
  ctx.fill();

  ctx.strokeStyle = '#059669';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#a7f3d0';
  ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('SOBRA REAL EM DINHEIRO FÍSICO (EM MÃOS NO CAIXA DA SEMANA)', baseWidth / 2, sobraBoxY + 18);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(formatCurrency(weekly.totalSobraDinheiroEspecie), baseWidth / 2, sobraBoxY + 46);

  ctx.fillStyle = '#d1fae5';
  ctx.font = '500 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(
    `Cálculo Oficial: Sobra Líquida (${formatCurrency(weekly.totalSobraLiquida)}) − Total Recebido em PIX (${formatCurrency(weekly.totalPix)})`,
    baseWidth / 2,
    sobraBoxY + 70
  );

  currentY += sobraBoxHeight + 16;

  // 7. RODAPÉ DE AUDITORIA
  drawDashedLine(ctx, 24, currentY, baseWidth - 24, currentY);
  currentY += 16;

  ctx.textAlign = 'center';
  ctx.fillStyle = '#047857';
  ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('✔ Fechamento Semanal Auditado e Aprovado', baseWidth / 2, currentY);

  const now = new Date();
  const timeStr = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`Relatório emitido em ${timeStr} • Sistema de Transporte de Passageiros e Encomendas`, baseWidth / 2, currentY + 16);

  return canvas;
}

function drawKpiCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  value: string,
  subtitle: string,
  bgColor: string,
  textColor: string,
  accentColor: string,
  highlightBorder = false
) {
  ctx.fillStyle = bgColor;
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();

  ctx.strokeStyle = highlightBorder ? accentColor : '#e2e8f0';
  ctx.lineWidth = highlightBorder ? 2 : 1;
  ctx.stroke();

  // Título
  ctx.textAlign = 'left';
  ctx.fillStyle = accentColor;
  ctx.font = 'bold 9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(title, x + 10, y + 16);

  // Valor
  ctx.fillStyle = textColor;
  ctx.font = '900 16px monospace';
  ctx.fillText(value, x + 10, y + 38);

  // Subtítulo
  ctx.fillStyle = '#64748b';
  ctx.font = '500 9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(subtitle, x + 10, y + 58);
}

function drawDetailBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  items: { label: string; val: string }[],
  accentColor: string
) {
  ctx.fillStyle = '#f8fafc';
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Header do box
  ctx.textAlign = 'left';
  ctx.fillStyle = accentColor;
  ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(title, x + 10, y + 16);

  let itemY = y + 34;
  items.forEach((item) => {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#475569';
    ctx.font = '500 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(item.label, x + 10, itemY);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(item.val, x + w - 10, itemY);

    itemY += 18;
  });
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
