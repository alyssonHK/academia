
import React, { useState } from 'react';
import { Exercise } from '../types';

interface AddExerciseFormProps {
  onAdd: (exercise: Omit<Exercise, 'id' | 'completed'>) => void;
  onCancel: () => void;
  defaultRest?: string;
  exerciseList: string[];
}

const AddExerciseForm: React.FC<AddExerciseFormProps> = ({ onAdd, onCancel, defaultRest, exerciseList }) => {
  const [name, setName] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [time, setTime] = useState(defaultRest || '60');

  const filtered = name
    ? exerciseList.filter(ex => ex.toLowerCase().includes(name.toLowerCase()))
    : exerciseList;

  const handleSelect = (ex: string) => {
    setName(ex);
    setShowSuggestions(false);
    setHighlighted(-1);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return;
    if (e.key === 'ArrowDown') {
      setHighlighted(h => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      setHighlighted(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && highlighted >= 0) {
      handleSelect(filtered[highlighted]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return; // Basic validation
    onAdd({ name, sets: Number(sets), reps: Number(reps), time });
    setName('');
    setSets('');
    setReps('');
    setTime(defaultRest || '60');
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 bg-gray-700 rounded-lg space-y-3 animate-fade-in relative">
      <div className="relative">
        <input
          type="text"
          placeholder="Nome do Exercício"
          value={name}
          onChange={(e) => { setName(e.target.value); setShowSuggestions(true); setHighlighted(-1); }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
          onKeyDown={handleInputKeyDown}
          className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500"
          autoComplete="off"
          required
        />
        {showSuggestions && filtered.length > 0 && (
          <ul className="absolute z-10 left-0 right-0 bg-gray-900 border border-gray-700 rounded shadow-lg max-h-40 overflow-y-auto mt-1">
            {filtered.map((ex, i) => (
              <li
                key={ex}
                className={`px-3 py-2 cursor-pointer ${i === highlighted ? 'bg-blue-600 text-white' : 'text-gray-200 hover:bg-gray-800'}`}
                onMouseDown={() => handleSelect(ex)}
                onMouseEnter={() => setHighlighted(i)}
              >
                {ex}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          placeholder="Séries"
          value={sets}
          onChange={(e) => setSets(e.target.value)}
          className="w-1/3 px-3 py-2 bg-gray-800 text-white border border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500"
          min={1}
          required
        />
        <input
          type="number"
          placeholder="Repetições"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          className="w-1/3 px-3 py-2 bg-gray-800 text-white border border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500"
          min={1}
          required
        />
        <input
          type="number"
          placeholder="Tempo (segundos, ex: 30 para prancha)"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-1/3 px-3 py-2 bg-gray-800 text-white border border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500"
          min={0}
        />
      </div>
      <span className="text-xs text-gray-400 block">O campo tempo é opcional e serve apenas para exercícios de isometria, como prancha.</span>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 rounded-md hover:bg-gray-500"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
        >
          Salvar
        </button>
      </div>
    </form>
  );
};

export default AddExerciseForm;
