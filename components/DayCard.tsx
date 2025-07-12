
import React, { useState } from 'react';
import { Day, Exercise, DayName } from '../types';
import ExerciseItem from './ExerciseItem';
import AddExerciseForm from './AddExerciseForm';
import { PlusIcon } from './Icons';

interface DayCardProps {
  day: Day;
  onToggleComplete: (dayName: DayName, exerciseId: string) => void;
  onAddExercise: (dayName: DayName, newExercise: Omit<Exercise, 'id' | 'completed'>) => void;
  onDeleteExercise: (dayName: DayName, exerciseId: string) => void;
  readonly?: boolean;
  exerciseList: string[];
}

const DayCard: React.FC<DayCardProps> = ({ day, onToggleComplete, onAddExercise, onDeleteExercise, readonly, exerciseList }) => {
  const [isAdding, setIsAdding] = useState(false);

  const handleAddSubmit = (exerciseData: Omit<Exercise, 'id' | 'completed'>) => {
    onAddExercise(day.name, exerciseData);
    setIsAdding(false);
  };
  
  const progress = day.exercises.length > 0 
    ? (day.exercises.filter(e => e.completed).length / day.exercises.length) * 100
    : 0;

  return (
    <div className="bg-gray-800 rounded-xl shadow-lg flex flex-col overflow-hidden transition-all duration-300 hover:shadow-blue-500/20 hover:scale-[1.02]">
      <div className="p-5 bg-gray-800 border-b border-gray-700">
        <h3 className="text-2xl font-bold text-white">{day.name}</h3>
        <div className="mt-2">
            <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div 
                    className="bg-blue-500 h-2.5 rounded-full transition-all duration-500" 
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
            <p className="text-xs text-gray-400 mt-1 text-right">{Math.round(progress)}% Completo</p>
        </div>
      </div>
      
      <div className="p-5 flex-grow min-h-[200px] flex flex-col gap-3">
        {day.exercises.length === 0 && !isAdding && (
          <div className="flex-grow flex flex-col items-center justify-center text-gray-500">
            <p>Dia de descanso!</p>
            <p className="text-sm">Adicione um exercício para começar.</p>
          </div>
        )}
        
        {day.exercises.map(exercise => (
          <ExerciseItem
            key={exercise.id}
            exercise={exercise}
            onToggleComplete={readonly ? undefined : () => onToggleComplete(day.name, exercise.id)}
            onDelete={readonly ? undefined : () => onDeleteExercise(day.name, exercise.id)}
          />
        ))}

        {isAdding && !readonly && (
            <AddExerciseForm
                onAdd={handleAddSubmit}
                onCancel={() => setIsAdding(false)}
                defaultRest={localStorage.getItem('defaultRest') || '60'}
                exerciseList={exerciseList}
            />
        )}
      </div>

      {!isAdding && !readonly && (
        <div className="p-4 bg-gray-800 border-t border-gray-700 mt-auto">
          <button
            onClick={() => setIsAdding(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 transition-all duration-200"
          >
            <PlusIcon className="w-5 h-5" />
            Adicionar Exercício
          </button>
        </div>
      )}
    </div>
  );
};

export default DayCard;
