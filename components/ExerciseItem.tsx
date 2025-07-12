import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Exercise } from '../types';
import { 
    RepeatIcon, 
    ClockIcon, 
    TrashIcon, 
    CheckCircleIcon, 
    CircleIcon, 
    PlayIcon,
    PauseIcon,
    RotateCwIcon
} from './Icons';

// Helper function to parse time strings like "60s" or "2min" into seconds
const parseTimeToSeconds = (timeStr: string): number => {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const time = timeStr.toLowerCase().trim();
  if (time.endsWith('s')) {
    const seconds = parseInt(time.slice(0, -1), 10);
    return isNaN(seconds) ? 0 : seconds;
  }
  if (time.endsWith('m') || time.endsWith('min')) {
    const minutes = parseInt(time.replace(/min|m/g, ''), 10);
    return isNaN(minutes) ? 0 : minutes * 60;
  }
  const seconds = parseInt(time, 10);
  return isNaN(seconds) ? 0 : seconds;
};

// Helper to format seconds into MM:SS
const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

interface ExerciseItemProps {
  exercise: Exercise;
  onToggleComplete?: () => void;
  onDelete?: () => void;
}

const ExerciseItem: React.FC<ExerciseItemProps> = ({ exercise, onToggleComplete, onDelete }) => {
  const initialSeconds = useMemo(() => parseTimeToSeconds(exercise.time), [exercise.time]);
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const isTimerFinished = initialSeconds > 0 && timeLeft <= 0;

  // Novos estados para repetições e descanso
  const totalSets = exercise.sets || 1;
  const [setsDone, setSetsDone] = useState(0);
  // O descanso sempre usa o valor padrão salvo no localStorage
  const defaultRest = localStorage.getItem('defaultRest') || '60';
  const [restTime, setRestTime] = useState(defaultRest);
  const restSeconds = useMemo(() => parseTimeToSeconds(restTime), [restTime]);
  const [restLeft, setRestLeft] = useState(restSeconds);
  const [isResting, setIsResting] = useState(false);
  const [restCompleted, setRestCompleted] = useState(!!exercise.restCompleted);

  // Sempre que iniciar descanso, atualiza o tempo para o padrão
  useEffect(() => {
    if (isResting) {
      const padrão = localStorage.getItem('defaultRest') || '60';
      setRestTime(padrão);
      setRestLeft(parseTimeToSeconds(padrão));
    }
  }, [isResting]);

  // Função deve vir antes do return!
  const handleRestTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRestTime(e.target.value);
  };

  // Ao marcar uma série, inicia descanso (exceto após a última)
  const handleSetClick = () => {
    if (setsDone < totalSets) {
      setSetsDone((v) => v + 1);
      setIsResting(true);
    }
  };

  // Quando o descanso termina
  useEffect(() => {
    if (isResting && restLeft > 0) {
      const interval = setInterval(() => setRestLeft((v) => v - 1), 1000);
      return () => clearInterval(interval);
    }
    if (isResting && restLeft <= 0) {
      setIsResting(false);
      setRestLeft(restSeconds); // reseta para o próximo descanso
      // Se terminou todas as séries, marca como concluído
      if (setsDone === totalSets && onToggleComplete && !exercise.completed) {
        onToggleComplete();
      }
    }
  }, [isResting, restLeft, setsDone, totalSets, restSeconds, onToggleComplete, exercise.completed]);

  const [isDeleting, setIsDeleting] = useState(false);
  const deleteTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Só dispara se clicar diretamente no card (não em botões internos)
    if (!onDelete || e.target !== e.currentTarget) return;
    setIsDeleting(true);
    deleteTimeout.current = setTimeout(() => {
      onDelete();
      setIsDeleting(false);
    }, 1000); // 1 segundo
  };

  const handleMouseUp = () => {
    setIsDeleting(false);
    if (deleteTimeout.current) clearTimeout(deleteTimeout.current);
  };

  return (
    <div
      className={`group p-3 rounded-lg transition-all duration-300
        ${exercise.completed ? 'bg-green-500/10' : 'bg-gray-700/50 hover:bg-gray-700'}
        ${isTimerActive ? 'ring-2 ring-blue-500/50' : ''}
        ${isDeleting ? 'border-2 border-red-500 bg-red-900/30' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      title={onDelete ? 'Segure para excluir' : ''}
    >
      <div className="flex items-center">
        <button 
            onClick={e => { e.stopPropagation(); if (onToggleComplete) onToggleComplete(); }}
            className="mr-4 flex-shrink-0"
            aria-label={exercise.completed ? 'Marcar como incompleto' : 'Marcar como completo'}
            disabled={!onToggleComplete}
        >
          {exercise.completed 
              ? <CheckCircleIcon className="w-6 h-6 text-green-400" /> 
              : <CircleIcon className="w-6 h-6 text-gray-500 group-hover:text-blue-400" />
          }
        </button>
        <div className="flex-grow">
          <p className={`font-semibold text-white ${exercise.completed ? 'line-through text-gray-400' : ''}`}>{exercise.name}</p>
          <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 mt-1">
            <span className="flex items-center gap-1">
              <RepeatIcon className="w-3 h-3" />
              {totalSets}x{exercise.reps}
            </span>
            {exercise.time && (
              <span className="flex items-center gap-1">
                <ClockIcon className="w-3 h-3" />
                {exercise.time} seg
              </span>
            )}
          </div>
          {/* Séries individuais - container separado para rolagem */}
          <div className="block w-full max-w-full overflow-x-auto mt-2">
            <div className="inline-flex gap-2 whitespace-nowrap min-w-max pb-2">
              {Array.from({ length: totalSets }).map((_, i) => (
                <button
                  key={i}
                  onClick={e => { e.stopPropagation(); handleSetClick(); }}
                  onMouseDown={e => e.stopPropagation()}
                  onMouseUp={e => e.stopPropagation()}
                  disabled={i !== setsDone || isResting || setsDone >= totalSets}
                  className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold
                    ${i < setsDone ? 'bg-green-400 text-white' : 'bg-gray-600 text-gray-200'}
                    ${isResting ? 'opacity-50' : 'hover:bg-blue-400 hover:text-white'}`}
                  aria-label={`Série ${i + 1}`}
                >
                  {i < setsDone ? <CheckCircleIcon className="w-4 h-4" /> : i + 1}
                </button>
              ))}
            </div>
          </div>
          {/* Descanso entre séries */}
          {isResting && (
            <div className="mt-4 w-full flex flex-wrap items-center gap-2 break-all">
              <span className="text-blue-400 font-mono text-lg">{formatTime(restLeft)}</span>
              <span className="ml-2 text-green-400 whitespace-nowrap">Descansando...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExerciseItem;
