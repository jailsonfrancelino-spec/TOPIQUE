import React, { useState } from 'react';
import { Printer, Download, ToggleLeft, ToggleRight, Sparkles, FileText } from 'lucide-react';
import { WeeklySheet } from '../types';
import { 
  calculateDayTotals, 
  calculateTripSubtotal, 
  calculateWeeklyTotals, 
  formatCurrencySimple, 
  formatDatePtBR 
} from '../utils/calculations';

interface PrintableSheetProps {
  sheet: WeeklySheet;
}

export const PrintableSheet: React.FC<PrintableSheetProps> = ({ sheet }) => {
  const [printBlank, setPrintBlank] = useState<boolean>(false);
  const weekly = calculateWeeklyTotals(sheet);

  const handleTriggerPrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Print Control Bar (Hidden on print) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Modo de Impressão (A4 Oficial)
            </h2>
            <p className="text-xs text-slate-500">
              Visual idêntico à ficha de controle diário e semanal física da sua empresa.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Toggle Blank vs Filled */}
          <button
            onClick={() => setPrintBlank(!printBlank)}
            className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
          >
            {printBlank ? (
              <ToggleRight className="w-4 h-4 text-blue-600" />
            ) : (
              <ToggleLeft className="w-4 h-4 text-slate-400" />
            )}
            <span>{printBlank ? 'Ficha em Branco (Prancheta)' : 'Ficha com Dados Preenchidos'}</span>
          </button>

          <button
            onClick={handleTriggerPrint}
            className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Agora (Ctrl + P)</span>
          </button>
        </div>
      </div>

      {/* Printable Sheet Container (Styled for both Screen preview and Physical Print) */}
      <div className="bg-white p-6 sm:p-10 rounded-2xl border border-slate-300 shadow-md max-w-[960px] mx-auto text-black font-sans print:p-0 print:border-none print:shadow-none print:max-w-none print:rounded-none">
        
        {/* ================= PAGE 1: FICHA DE CONTROLE DIÁRIO E SEMANAL ================= */}
        <div className="print-page page-1 border-2 border-blue-900 p-4 rounded-lg print:rounded-none print:border-blue-900">
          
          {/* Top Header Banner */}
          <div className="bg-blue-900 text-white px-4 py-2.5 rounded-t flex flex-col md:flex-row md:items-center md:justify-between border-b-2 border-blue-950">
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-wide uppercase">
                FICHA DE CONTROLE DIÁRIO E SEMANAL
              </h1>
              <p className="text-[11px] sm:text-xs text-blue-200">
                {sheet.companyRoute}
              </p>
            </div>

            <div className="text-right text-xs mt-1 md:mt-0 font-medium">
              <div>
                <span className="font-bold">SEMANA:</span> De{' '}
                <span className="font-semibold underline">
                  {printBlank ? '____/____/____' : formatDatePtBR(sheet.startDate)}
                </span>{' '}
                a{' '}
                <span className="font-semibold underline">
                  {printBlank ? '____/____/____' : formatDatePtBR(sheet.endDate)}
                </span>
              </div>
            </div>
          </div>

          {/* Daily Blocks (Segunda a Domingo) */}
          <div className="mt-3 space-y-3">
            {sheet.days.map((day) => {
              const totals = calculateDayTotals(day);
              const isSunday = day.dayOfWeek === 'domingo';

              return (
                <div key={day.id} className="border border-slate-400 text-[11px] leading-tight">
                  
                  {/* Day Title bar */}
                  <div className="bg-slate-200 font-bold px-2.5 py-1 border-b border-slate-400 flex justify-between items-center text-slate-900">
                    <span>
                      {day.dayLabel} — Data: {printBlank ? '____/____/2026' : formatDatePtBR(day.date)}
                    </span>
                  </div>

                  {/* Combined Table: Viagens (Left) & Despesas (Right) */}
                  <div className="grid grid-cols-12 divide-x divide-slate-400">
                    
                    {/* Viagens (7 cols) */}
                    <div className="col-span-7 sm:col-span-7">
                      <table className="w-full text-center border-collapse text-[10px]">
                        <thead>
                          <tr className="bg-slate-100 font-bold border-b border-slate-400">
                            <th className="py-0.5 px-1 text-left">VIAGEM</th>
                            <th className="py-0.5 px-1 text-right">IDA (R$)</th>
                            <th className="py-0.5 px-1 text-right">VOLTA (R$)</th>
                            <th className="py-0.5 px-1 text-right">ENCOM. (R$)</th>
                            <th className="py-0.5 px-1 text-right bg-blue-50">PIX (R$)</th>
                            <th className="py-0.5 px-1 text-right bg-slate-100">SUBTOTAL</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300">
                          {day.trips.map((t) => {
                            const sub = calculateTripSubtotal(t);
                            return (
                              <tr key={t.id}>
                                <td className="py-0.5 px-1 text-left font-medium">{t.tripName}</td>
                                <td className="py-0.5 px-1 text-right font-mono">
                                  {printBlank ? '' : (t.ida > 0 ? formatCurrencySimple(t.ida) : '-')}
                                </td>
                                <td className="py-0.5 px-1 text-right font-mono">
                                  {printBlank ? '' : (t.volta > 0 ? formatCurrencySimple(t.volta) : '-')}
                                </td>
                                <td className="py-0.5 px-1 text-right font-mono">
                                  {printBlank ? '' : (t.encom > 0 ? formatCurrencySimple(t.encom) : '-')}
                                </td>
                                <td className="py-0.5 px-1 text-right font-mono bg-blue-50/50">
                                  {printBlank ? '' : (t.pix > 0 ? formatCurrencySimple(t.pix) : '-')}
                                </td>
                                <td className="py-0.5 px-1 text-right font-mono font-bold bg-slate-50">
                                  {printBlank ? '' : (sub > 0 ? formatCurrencySimple(sub) : '-')}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Despesas (5 cols) */}
                    <div className="col-span-5 sm:col-span-5">
                      <table className="w-full text-center border-collapse text-[10px]">
                        <thead>
                          <tr className="bg-slate-100 font-bold border-b border-slate-400">
                            <th className="py-0.5 px-1.5 text-left">DESPESA</th>
                            <th className="py-0.5 px-1.5 text-right">VALOR (R$)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300">
                          {day.expenses.map((e) => (
                            <tr key={e.id}>
                              <td className="py-0.5 px-1.5 text-left">{e.label}</td>
                              <td className="py-0.5 px-1.5 text-right font-mono font-medium">
                                {printBlank ? '' : (e.value > 0 ? formatCurrencySimple(e.value) : '-')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                  </div>

                  {/* Totals Row */}
                  <div className="bg-slate-100/90 border-t border-slate-400 px-2 py-1 flex flex-wrap items-center justify-between text-[10px] sm:text-[11px] font-semibold">
                    <div>
                      <span>Total Arrecadado: R$ </span>
                      <span className="font-mono font-bold">
                        {printBlank ? '_________' : formatCurrencySimple(totals.totalArrecadado)}
                      </span>
                    </div>

                    <div>
                      <span>Total Despesas: R$ </span>
                      <span className="font-mono font-bold">
                        {printBlank ? '_________' : formatCurrencySimple(totals.totalDespesas)}
                      </span>
                    </div>

                    <div>
                      <span>Total Dinheiro: R$ </span>
                      <span className="font-mono font-bold">
                        {printBlank ? '_________' : formatCurrencySimple(totals.totalDinheiro)}
                      </span>
                    </div>

                    <div>
                      <span>Total Pix: R$ </span>
                      <span className="font-mono font-bold">
                        {printBlank ? '_________' : formatCurrencySimple(totals.totalPix)}
                      </span>
                    </div>

                    <div className="bg-slate-800 text-white px-2 py-0.5 rounded text-xs font-bold">
                      <span>SOBRA LÍQ: R$ </span>
                      <span className="font-mono">
                        {printBlank ? '_________' : formatCurrencySimple(totals.sobraLiquida)}
                      </span>
                    </div>

                    <div className="bg-emerald-800 text-white px-2 py-0.5 rounded text-xs font-bold">
                      <span>SOBRA ESPÉCIE (CAIXA): R$ </span>
                      <span className="font-mono">
                        {printBlank ? '_________' : formatCurrencySimple(totals.sobraDinheiroEspecie)}
                      </span>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

          <div className="mt-2 text-[10px] text-slate-500 text-center font-medium border-t border-slate-300 pt-1">
            Transporte de Passageiros e Encomendas — Tianguá x Viçosa • Veículo: {sheet.vehiclePlate}
          </div>

        </div>

        {/* Page break marker for printer */}
        <div className="print-break my-8 border-b-2 border-dashed border-slate-300 print:hidden text-center">
          <span className="bg-white px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Fim da Página 1 / Início da Página 2
          </span>
        </div>

        {/* ================= PAGE 2: RESUMO DO FECHAMENTO SEMANAL ================= */}
        <div className="print-page page-2 border-2 border-blue-900 p-6 rounded-lg print:rounded-none print:border-blue-900">
          
          {/* Header Banner */}
          <div className="bg-blue-900 text-white px-4 py-3 rounded-t flex items-center justify-between border-b-2 border-blue-950">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-200" />
              <h2 className="text-sm sm:text-base font-black tracking-wide uppercase">
                RESUMO DO FECHAMENTO SEMANAL (SEGUNDA A DOMINGO)
              </h2>
            </div>
            <div className="text-xs text-blue-200 font-medium">
              Semana: <span className="font-bold text-white">{formatDatePtBR(sheet.startDate)} a {formatDatePtBR(sheet.endDate)}</span>
            </div>
          </div>

          {/* Table matching Page 2 of the PDF */}
          <div className="overflow-x-auto border border-blue-900 mt-2">
            <table className="w-full text-center border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-200 font-bold border-b border-blue-900 text-slate-900">
                  <th className="py-2.5 px-3 text-left border-r border-slate-400">
                    DIA DA SEMANA
                  </th>
                  <th className="py-2.5 px-2 border-r border-slate-400">
                    ARRECADAÇÃO (R$)
                  </th>
                  <th className="py-2.5 px-2 border-r border-slate-400">
                    DESPESAS (R$)
                  </th>
                  <th className="py-2.5 px-2 border-r border-slate-400">
                    DINHEIRO (R$)
                  </th>
                  <th className="py-2.5 px-2 border-r border-slate-400 bg-blue-50">
                    PIX (R$)
                  </th>
                  <th className="py-2.5 px-3 border-r border-slate-400 font-bold">
                    SOBRA LÍQUIDA (R$)
                  </th>
                  <th className="py-2.5 px-3 font-extrabold bg-emerald-50 text-emerald-950">
                    SOBRA ESPÉCIE (R$)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {weekly.daysSummary.map((row) => (
                  <tr key={row.dayOfWeek} className="hover:bg-slate-50">
                    <td className="py-2 px-3 text-left font-semibold text-slate-900 border-r border-slate-400">
                      {row.dayLabel.split('—')[0]}
                    </td>
                    <td className="py-2 px-2 text-right font-mono border-r border-slate-400">
                      {printBlank ? '' : formatCurrencySimple(row.arrecadacao)}
                    </td>
                    <td className="py-2 px-2 text-right font-mono border-r border-slate-400">
                      {printBlank ? '' : formatCurrencySimple(row.despesas)}
                    </td>
                    <td className="py-2 px-2 text-right font-mono border-r border-slate-400">
                      {printBlank ? '' : formatCurrencySimple(row.dinheiro)}
                    </td>
                    <td className="py-2 px-2 text-right font-mono border-r border-slate-400 bg-blue-50/40 font-medium">
                      {printBlank ? '' : formatCurrencySimple(row.pix)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold bg-slate-50 border-r border-slate-400">
                      {printBlank ? '' : formatCurrencySimple(row.sobraLiquida)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-black text-emerald-900 bg-emerald-50/60">
                      {printBlank ? '' : formatCurrencySimple(row.sobraDinheiroEspecie)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-bold border-t-2 border-blue-900 text-xs sm:text-sm">
                  <td className="py-3 px-3 text-left uppercase tracking-wider font-extrabold border-r border-slate-700">
                    TOTAL DA SEMANA
                  </td>
                  <td className="py-3 px-2 text-right font-mono border-r border-slate-700">
                    {printBlank ? '' : formatCurrencySimple(weekly.totalArrecadacao)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono border-r border-slate-700">
                    {printBlank ? '' : formatCurrencySimple(weekly.totalDespesas)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono border-r border-slate-700">
                    {printBlank ? '' : formatCurrencySimple(weekly.totalDinheiro)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono border-r border-slate-700 bg-slate-800">
                    {printBlank ? '' : formatCurrencySimple(weekly.totalPix)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-extrabold text-sm text-slate-100 bg-slate-950 border-r border-slate-700">
                    {printBlank ? '' : formatCurrencySimple(weekly.totalSobraLiquida)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black text-sm text-emerald-300 bg-emerald-950">
                    {printBlank ? '' : formatCurrencySimple(weekly.totalSobraDinheiroEspecie)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Footer instruction note matching Page 2 */}
          <div className="mt-4 p-3 bg-slate-50 border border-slate-300 rounded text-xs text-slate-700 leading-normal">
            <span className="font-bold">* Instrução de preenchimento:</span> Anote os valores de Pix de cada viagem na coluna destacada. O Subtotal de cada viagem inclui (Ida + Volta + Encomenda). A Sobra Líquida diária é obtida subtraindo as Despesas do Total Arrecadado.
          </div>

          {/* Signature / Validation Lines for Manager / Driver */}
          <div className="mt-12 pt-6 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <div className="border-t border-slate-700 w-48 mx-auto mb-1"></div>
              <span className="font-semibold text-slate-800">Responsável / Motorista</span>
            </div>
            <div>
              <div className="border-t border-slate-700 w-48 mx-auto mb-1"></div>
              <span className="font-semibold text-slate-800">Conferência / Financeiro</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
