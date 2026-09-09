import React, { useState } from 'react';
import { X, Calendar, MapPin, Check, Info } from 'lucide-react';
import { formatDateIso, getMonday } from '../utils/storage';
import { formatDatePtBR } from '../utils/calculations';

interface NewWeekModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (startDate: string, companyRoute: string) => void;
  defaultRoute: string;
}

export const NewWeekModal: React.FC<NewWeekModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  defaultRoute,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    const monday = getMonday(today);
    return formatDateIso(monday);
  });
  const [companyRoute, setCompanyRoute] = useState<string>(
    defaultRoute || 'TRANSPORTE DE PASSAGEIROS - TIANGUA X VICOSA / JAILSON'
  );

  if (!isOpen) return null;

  // Compute calculated Monday and Sunday for the selected date
  const parts = selectedDate.split('-').map(Number);
  const pickedDateObj = (parts.length === 3 && !isNaN(parts[0]))
    ? new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0)
    : new Date();
  
  const mondayObj = getMonday(pickedDateObj);
  const sundayObj = new Date(mondayObj);
  sundayObj.setDate(mondayObj.getDate() + 6);

  const mondayIso = formatDateIso(mondayObj);
  const sundayIso = formatDateIso(sundayObj);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Always pass the strict Monday ISO date
    onCreate(
      mondayIso,
      companyRoute.trim() || 'TRANSPORTE DE PASSAGEIROS - TIANGUA X VICOSA / JAILSON'
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Iniciar Nova Semana
              </h3>
              <p className="text-xs text-slate-500">
                Semana sempre começando na Segunda e finalizando no Domingo.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Selecione qualquer dia da semana desejada:
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              required
              className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 bg-white font-semibold text-slate-800 cursor-pointer"
            />

            {/* Visual confirmation of the Mon-Sun range */}
            <div className="mt-2.5 p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs space-y-1">
              <div className="flex items-center gap-1.5 text-blue-900 font-bold">
                <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>Período da Semana Configurado:</span>
              </div>
              <div className="text-slate-700 font-medium pl-5.5">
                📅 <strong>Segunda-feira:</strong> {formatDatePtBR(mondayIso)}
              </div>
              <div className="text-slate-700 font-medium pl-5.5">
                🏁 <strong>Domingo:</strong> {formatDatePtBR(sundayIso)}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Nome da Linha / Rota
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={companyRoute}
                onChange={(e) => setCompanyRoute(e.target.value)}
                placeholder="Ex: TRANSPORTE DE PASSAGEIROS - TIANGUA X VICOSA / JAILSON"
                required
                className="w-full text-sm border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 focus:ring-2 focus:ring-blue-500 bg-white font-medium"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>Criar Ficha Semanal</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
