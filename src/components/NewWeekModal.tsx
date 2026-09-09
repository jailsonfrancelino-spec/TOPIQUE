import React, { useState } from 'react';
import { X, Calendar, Car, MapPin, Check } from 'lucide-react';
import { formatDateIso, getMonday } from '../utils/storage';

interface NewWeekModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (startDate: string, vehiclePlate: string, companyRoute: string) => void;
  defaultPlate: string;
  defaultRoute: string;
}

export const NewWeekModal: React.FC<NewWeekModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  defaultPlate,
  defaultRoute,
}) => {
  const [startDate, setStartDate] = useState<string>(() => {
    const nextMonday = getMonday(new Date());
    return formatDateIso(nextMonday);
  });
  const [vehiclePlate, setVehiclePlate] = useState<string>(defaultPlate);
  const [companyRoute, setCompanyRoute] = useState<string>(defaultRoute);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(
      startDate,
      vehiclePlate.trim() || 'SEM PLACA',
      companyRoute.trim() || 'Transporte de Passageiros e Encomendas'
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
                Cria uma nova ficha de controle de segunda a domingo.
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
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Data Inicial da Semana (Segunda-feira)
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Veículo / Placa
            </label>
            <div className="relative">
              <Car className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value)}
                placeholder="Ex: MTO-4A82 ou Van 01"
                required
                className="w-full text-sm border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 focus:ring-2 focus:ring-blue-500 uppercase bg-white font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Nome da Linha / Rota
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={companyRoute}
                onChange={(e) => setCompanyRoute(e.target.value)}
                placeholder="Ex: Transporte de Passageiros e Encomendas — Tianguá x Viçosa"
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
