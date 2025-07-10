
import React, { useState } from 'react';
import { Exercise } from '../types';

interface AddExerciseFormProps {
  onAdd: (exercise: Omit<Exercise, 'id' | 'completed'>) => void;
  onCancel: () => void;
}

const AddExerciseForm: React.FC<AddExerciseFormProps> = ({ onAdd, onCancel }) => {
  const [name, setName] = useState('');
  const [reps, setReps] = useState('');
  const [time, setTime] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return; // Basic validation
    onAdd({ name, reps, time });
    // Reset form fields
    setName('');
    setReps('');
    setTime('');
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 bg-gray-700 rounded-lg space-y-3 animate-fade-in">
      <input
        type="text"
        placeholder="Nome do Exercício"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500"
        required
      />
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Repetições (ex: 3x12)"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          className="w-1/2 px-3 py-2 bg-gray-800 text-white border border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />
        <input
          type="text"
          placeholder="Tempo (ex: 60s)"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-1/2 px-3 py-2 bg-gray-800 text-white border border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
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
