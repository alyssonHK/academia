import React, { useState, useEffect, useMemo } from 'react';
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

  useEffect(() => {
    if (!isTimerActive || timeLeft <= 0) {
      if (isTimerActive && timeLeft <= 0) {
        setIsTimerActive(false);
        if (!exercise.completed && onToggleComplete) {
          onToggleComplete();
        }
      }
      return;
    }

    const intervalId = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isTimerActive, timeLeft, exercise.completed, onToggleComplete]);

  useEffect(() => {
    setTimeLeft(initialSeconds);
    setIsTimerActive(false);
  }, [initialSeconds]);

  const handleTimerControl = () => {
    if (isTimerFinished) {
      setTimeLeft(initialSeconds);
    } else {
      setIsTimerActive(!isTimerActive);
    }
  };

  const hasTimer = initialSeconds > 0;

  return (
    <div className={`
      group p-3 rounded-lg transition-all duration-300
      ${exercise.completed ? 'bg-green-500/10' : 'bg-gray-700/50 hover:bg-gray-700'}
      ${isTimerActive ? 'ring-2 ring-blue-500/50' : ''}
    `}>
      <div className="flex items-center">
        <button 
            onClick={onToggleComplete ? onToggleComplete : undefined} 
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
          <p className={`font-semibold text-white ${exercise.completed ? 'line-through text-gray-400' : ''}`}>
            {exercise.name}
          </p>
          <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 mt-1">
            {exercise.reps && (
              <span className="flex items-center gap-1">
                <RepeatIcon className="w-3 h-3" />
                {exercise.reps}
              </span>
            )}
            {hasTimer ? (
                 <span className={`flex items-center gap-1 font-mono ${isTimerActive ? 'text-blue-400' : ''}`}>
                    <ClockIcon className="w-3 h-3" />
                    {formatTime(timeLeft)}
                </span>
            ) : (
                exercise.time && (
                    <span className="flex items-center gap-1">
                        <ClockIcon className="w-3 h-3" />
                        {exercise.time}
                    </span>
                )
            )}
          </div>
        </div>

        <div className="flex items-center ml-2 flex-shrink-0">
            {hasTimer && (
              <button
                onClick={handleTimerControl}
                className="p-2 text-gray-400 rounded-full hover:bg-blue-500/20 hover:text-blue-300 transition-colors duration-200"
                aria-label={isTimerFinished ? "Reiniciar cronômetro" : isTimerActive ? "Pausar cronômetro" : "Iniciar cronômetro"}
              >
                {isTimerFinished ? (
                  <RotateCwIcon className="w-5 h-5" />
                ) : isTimerActive ? (
                  <PauseIcon className="w-5 h-5" />
                ) : (
                  <PlayIcon className="w-5 h-5" />
                )}
              </button>
            )}
            <button
              onClick={onDelete ? onDelete : undefined}
              className="p-2 text-gray-500 rounded-full hover:bg-red-500/20 hover:text-red-400 transition-colors duration-200"
              aria-label="Deletar exercício"
              disabled={!onDelete}
            >
              <TrashIcon className="w-5 h-5" />
            </button>
        </div>
      </div>
       {hasTimer && (
          <div className="mt-2 ml-10">
            <div className="w-full bg-gray-600/50 rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full transition-all ease-linear duration-1000 ${isTimerActive ? 'bg-blue-500' : isTimerFinished ? 'bg-green-500' : 'bg-gray-400'}`}
                style={{ width: `${initialSeconds > 0 ? (timeLeft / initialSeconds) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        )}
    </div>
  );
};

export default ExerciseItem;
