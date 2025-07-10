import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from './Icons';
import { Day, WeekData, DayName, Exercise, DayByDate } from '../types';
import DayCard from './DayCard';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface CalendarProps {
  days: Day[];
}

const Calendar: React.FC<CalendarProps> = ({
  days
}) => {
  const [currentWeek, setCurrentWeek] = useState(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    return startOfWeek;
  });

  const [weekData, setWeekData] = useState<DayByDate[]>([]);
  const [isLoadingWeek, setIsLoadingWeek] = useState(false);

  const dayNamesInOrder: DayName[] = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

  // Função para formatar data como YYYY-MM-DD
  const formatDateToString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Função para obter o nome do dia da semana
  const getDayName = (date: Date): DayName => {
    return dayNamesInOrder[date.getDay()];
  };

  // Função para buscar exercícios por data específica
  const fetchExercisesByDate = useCallback(async (dateString: string): Promise<Exercise[]> => {
    try {
      const exerciseDocRef = doc(db, 'exercises_by_date', dateString);
      const exerciseDoc = await getDoc(exerciseDocRef);
      
      if (exerciseDoc.exists()) {
        return exerciseDoc.data().exercises || [];
      }
      return [];
    } catch (error) {
      console.error(`Erro ao buscar exercícios para ${dateString}:`, error);
      return [];
    }
  }, []);

  // Função para salvar exercícios por data específica
  const saveExercisesByDate = useCallback(async (dateString: string, exercises: Exercise[]) => {
    try {
      const exerciseDocRef = doc(db, 'exercises_by_date', dateString);
      await setDoc(exerciseDocRef, { 
        date: dateString,
        exercises: exercises.map(ex => ({
          id: ex.id,
          name: ex.name,
          reps: ex.reps,
          time: ex.time,
          completed: ex.completed,
        }))
      });
    } catch (error) {
      console.error(`Erro ao salvar exercícios para ${dateString}:`, error);
    }
  }, []);

  // Carregar dados da semana atual
  const loadWeekData = useCallback(async (weekStart: Date) => {
    setIsLoadingWeek(true);
    const weekDays: DayByDate[] = [];
    
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(weekStart);
      currentDate.setDate(weekStart.getDate() + i);
      const dateString = formatDateToString(currentDate);
      const dayName = getDayName(currentDate);
      
      // Buscar exercícios para esta data específica
      const exercises = await fetchExercisesByDate(dateString);
      
      weekDays.push({
        date: dateString,
        dayName,
        exercises
      });
    }
    
    setWeekData(weekDays);
    setIsLoadingWeek(false);
  }, [fetchExercisesByDate]);

  // Carregar dados quando a semana muda
  useEffect(() => {
    loadWeekData(currentWeek);
  }, [currentWeek, loadWeekData]);

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(currentWeek);
    if (direction === 'prev') {
      newWeek.setDate(currentWeek.getDate() - 7);
    } else {
      newWeek.setDate(currentWeek.getDate() + 7);
    }
    setCurrentWeek(newWeek);
  };

  const goToCurrentWeek = () => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    setCurrentWeek(startOfWeek);
  };

  const isCurrentWeek = () => {
    const now = new Date();
    const startOfCurrentWeek = new Date(now);
    startOfCurrentWeek.setDate(now.getDate() - now.getDay());
    return currentWeek.getTime() === startOfCurrentWeek.getTime();
  };

  // Função para criar um Day compatível com DayCard
  const createDayFromDate = (dayByDate: DayByDate): Day => {
    return {
      name: dayByDate.dayName,
      exercises: dayByDate.exercises,
      order: dayNamesInOrder.indexOf(dayByDate.dayName)
    };
  };

  // Handlers específicos para o calendário
  const handleCalendarToggleComplete = useCallback(async (dayName: DayName, exerciseId: string) => {
    const dayByDate = weekData.find(d => d.dayName === dayName);
    if (!dayByDate) return;
    
    const updatedExercises = dayByDate.exercises.map(ex =>
      ex.id === exerciseId ? { ...ex, completed: !ex.completed } : ex
    );
    
    // Atualizar localmente
    setWeekData(prev => prev.map(d => 
      d.date === dayByDate.date 
        ? { ...d, exercises: updatedExercises }
        : d
    ));
    
    // Salvar no Firebase (por data)
    await saveExercisesByDate(dayByDate.date, updatedExercises);

    // Sincronizar também na coleção workout_days se a data for da semana atual
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const dayIndex = dayNamesInOrder.indexOf(dayName);
    const expectedDate = new Date(startOfWeek);
    expectedDate.setDate(startOfWeek.getDate() + dayIndex);
    const expectedDateString = formatDateToString(expectedDate);
    if (dayByDate.date === expectedDateString) {
      const dayRef = doc(db, 'workout_days', dayName);
      await setDoc(dayRef, { name: dayName, exercises: updatedExercises, order: dayIndex });
    }
  }, [weekData, saveExercisesByDate]);

  const handleCalendarAddExercise = useCallback(async (dayName: DayName, newExerciseData: Omit<Exercise, 'id' | 'completed'>) => {
    const dayByDate = weekData.find(d => d.dayName === dayName);
    if (!dayByDate) return;
    
    const newExercise: Exercise = {
      ...newExerciseData,
      id: crypto.randomUUID(),
      completed: false
    };
    
    const updatedExercises = [...dayByDate.exercises, newExercise];
    
    // Atualizar localmente
    setWeekData(prev => prev.map(d => 
      d.date === dayByDate.date 
        ? { ...d, exercises: updatedExercises }
        : d
    ));
    
    // Salvar no Firebase (por data)
    await saveExercisesByDate(dayByDate.date, updatedExercises);

    // Sincronizar também na coleção workout_days se a data for da semana atual
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const dayIndex = dayNamesInOrder.indexOf(dayName);
    const expectedDate = new Date(startOfWeek);
    expectedDate.setDate(startOfWeek.getDate() + dayIndex);
    const expectedDateString = formatDateToString(expectedDate);
    if (dayByDate.date === expectedDateString) {
      const dayRef = doc(db, 'workout_days', dayName);
      await setDoc(dayRef, { name: dayName, exercises: updatedExercises, order: dayIndex });
    }
  }, [weekData, saveExercisesByDate]);

  const handleCalendarDeleteExercise = useCallback(async (dayName: DayName, exerciseId: string) => {
    const dayByDate = weekData.find(d => d.dayName === dayName);
    if (!dayByDate) return;
    
    const updatedExercises = dayByDate.exercises.filter(ex => ex.id !== exerciseId);
    
    // Atualizar localmente
    setWeekData(prev => prev.map(d => 
      d.date === dayByDate.date 
        ? { ...d, exercises: updatedExercises }
        : d
    ));
    
    // Salvar no Firebase (por data)
    await saveExercisesByDate(dayByDate.date, updatedExercises);

    // Sincronizar também na coleção workout_days se a data for da semana atual
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const dayIndex = dayNamesInOrder.indexOf(dayName);
    const expectedDate = new Date(startOfWeek);
    expectedDate.setDate(startOfWeek.getDate() + dayIndex);
    const expectedDateString = formatDateToString(expectedDate);
    if (dayByDate.date === expectedDateString) {
      const dayRef = doc(db, 'workout_days', dayName);
      await setDoc(dayRef, { name: dayName, exercises: updatedExercises, order: dayIndex });
    }
  }, [weekData, saveExercisesByDate]);

  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <CalendarIcon className="w-6 h-6 text-blue-400" />
          <h2 className="text-2xl font-bold text-gray-100">Calendário de Treinos</h2>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateWeek('prev')}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
            title="Semana anterior"
          >
            <ChevronLeftIcon className="w-5 h-5 text-gray-300" />
          </button>
          
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-100">
              {formatDate(currentWeek)} - {formatDate(new Date(currentWeek.getTime() + 6 * 24 * 60 * 60 * 1000))}
            </div>
            <div className="text-sm text-gray-400">
              Semana {currentWeek.getDate()}/{currentWeek.getMonth() + 1}
            </div>
          </div>
          
          <button
            onClick={() => navigateWeek('next')}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
            title="Próxima semana"
          >
            <ChevronRightIcon className="w-5 h-5 text-gray-300" />
          </button>
          
          {!isCurrentWeek() && (
            <button
              onClick={goToCurrentWeek}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
            >
              Hoje
            </button>
          )}
        </div>
      </div>

      {isLoadingWeek ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
          <span className="ml-3 text-gray-400">Carregando semana...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {weekData.map((dayByDate) => {
            const day = createDayFromDate(dayByDate);
            const date = new Date(dayByDate.date);
            const dayNumber = date.getDate();
            
            return (
              <div key={dayByDate.date} className="relative">
                <div className="absolute -top-2 -left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                  {dayNumber}
                </div>
                <div className="absolute -top-2 -right-2 bg-gray-600 text-white text-xs px-2 py-1 rounded-full">
                  {dayByDate.dayName.slice(0, 3)}
                </div>
                <DayCard
                  day={day}
                  onToggleComplete={() => {}}
                  onAddExercise={() => {}}
                  onDeleteExercise={() => {}}
                  readonly={true}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Calendar; 