import React, { useState, useCallback, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, writeBatch, getDocs, query, orderBy, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Day, Exercise, DayName, DayByDate } from './types';
import DayCard from './components/DayCard';
import Calendar from './components/Calendar';
import { DumbbellIcon, CalendarIcon, ViewColumnsIcon } from './components/Icons';

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

// Função para inicializar o banco de dados com dias padrão se estiver vazio
const initializeDaysInDB = async () => {
    const daysCollectionRef = collection(db, 'workout_days');
    const querySnapshot = await getDocs(daysCollectionRef);
    if (querySnapshot.empty) {
        console.log("Inicializando o banco de dados com dias padrão.");
        const batch = writeBatch(db);
        dayNamesInOrder.forEach((name, index) => {
            const dayDocRef = doc(db, 'workout_days', name);
            batch.set(dayDocRef, { name, exercises: [], order: index });
        });
        await batch.commit();
    }
};

function App() {
  const [days, setDays] = useState<Day[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'normal' | 'calendar'>('normal');

  useEffect(() => {
    const setup = async () => {
        await initializeDaysInDB();
        
        const daysCollectionRef = collection(db, 'workout_days');
        const q = query(daysCollectionRef, orderBy('order'));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const daysData = snapshot.docs.map(doc => doc.data() as Day);
            setDays(daysData);
            setIsLoading(false);
        }, (error) => {
            console.error("Erro ao buscar dias de treino: ", error);
            setIsLoading(false);
        });

        // Resetar progresso toda sexta-feira (ou início de semana)
        const now = new Date();
        const currentWeek = getISOWeekString(now);
        const lastResetWeek = localStorage.getItem('lastResetWeek');
        if (lastResetWeek !== currentWeek) {
          // Zerar o campo completed de todos os exercícios
          const daysSnapshot = await getDocs(daysCollectionRef);
          daysSnapshot.forEach(async (docSnap) => {
            const dayData = docSnap.data() as Day;
            if (dayData.exercises && dayData.exercises.length > 0) {
              const resetExercises = dayData.exercises.map(ex => ({ ...ex, completed: false }));
              await updateDoc(doc(db, 'workout_days', dayData.name), { exercises: resetExercises });
            }
          });
          localStorage.setItem('lastResetWeek', currentWeek);
        }

        return () => unsubscribe();
    };
    
    setup().catch(console.error);
  }, []);

  const handleDayUpdate = useCallback(async (dayName: DayName, updatedExercises: Exercise[]) => {
    const dayRef = doc(db, 'workout_days', dayName);
    try {
        // Explicitly create plain JavaScript objects to ensure they are serializable.
        const exercisesToSave = updatedExercises.map(ex => ({
            id: ex.id,
            name: ex.name,
            reps: ex.reps,
            time: ex.time,
            completed: ex.completed,
        }));
        await updateDoc(dayRef, { exercises: exercisesToSave });

        // Sincronizar também na coleção exercises_by_date para a data da semana atual
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const dayIndex = dayNamesInOrder.indexOf(dayName);
        const exerciseDate = new Date(startOfWeek);
        exerciseDate.setDate(startOfWeek.getDate() + dayIndex);
        const dateString = formatDateToString(exerciseDate);
        const exerciseDocRef = doc(db, 'exercises_by_date', dateString);
        await setDoc(exerciseDocRef, {
          date: dateString,
          exercises: exercisesToSave
        });
    } catch (error) {
        console.error(`Erro ao atualizar o dia ${dayName}:`, error);
    }
}, []);

  const handleToggleComplete = useCallback((dayName: DayName, exerciseId: string) => {
    const day = days.find(d => d.name === dayName);
    if (!day) return;
    const updatedExercises = day.exercises.map(ex =>
      ex.id === exerciseId ? { ...ex, completed: !ex.completed } : ex
    );
    handleDayUpdate(dayName, updatedExercises);
  }, [days, handleDayUpdate]);

  const handleAddExercise = useCallback((dayName: DayName, newExerciseData: Omit<Exercise, 'id' | 'completed'>) => {
    const day = days.find(d => d.name === dayName);
    if (!day) return;
    const newExercise: Exercise = {
        ...newExerciseData,
        id: crypto.randomUUID(),
        completed: false
    };
    const updatedExercises = [...day.exercises, newExercise];
    handleDayUpdate(dayName, updatedExercises);
  }, [days, handleDayUpdate]);

  const handleDeleteExercise = useCallback((dayName: DayName, exerciseId: string) => {
      const day = days.find(d => d.name === dayName);
      if (!day) return;
      const updatedExercises = day.exercises.filter(ex => ex.id !== exerciseId);
      handleDayUpdate(dayName, updatedExercises);
  }, [days, handleDayUpdate]);
  
  if (isLoading) {
    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-4 flex flex-col items-center justify-center">
            <DumbbellIcon className="w-16 h-16 text-blue-400 animate-bounce" />
            <h1 className="mt-4 text-2xl text-gray-400">Carregando seus treinos...</h1>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-4 sm:p-6 lg:p-8">
      <header className="text-center mb-10">
        <div className="flex items-center justify-center gap-4">
            <img src="/chicken.ico" alt="Chicken" className="w-12 h-12" />
            <h1 className="text-4xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-teal-300 text-transparent bg-clip-text">
            Projeto Mary monstro
            </h1>
        </div>
        {/* <p className="mt-4 text-lg text-gray-400">DALEEEEEEEEEEEEE</p> */}
      </header>

      {/* Toggle de visualização */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-800 rounded-lg p-1 flex">
          <button
            onClick={() => setViewMode('normal')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              viewMode === 'normal' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <ViewColumnsIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Visualização Normal</span>
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              viewMode === 'calendar' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <CalendarIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Calendário</span>
          </button>
        </div>
      </div>

      <main>
        {viewMode === 'calendar' ? (
          <Calendar days={days} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {days.map(day => (
              <DayCard
                key={day.name}
                day={day}
                onToggleComplete={handleToggleComplete}
                onAddExercise={handleAddExercise}
                onDeleteExercise={handleDeleteExercise}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="text-center mt-12 text-gray-500 text-sm">
        <p>Feito com 💪 e Firebase.</p>
      </footer>
    </div>
  );
}

// Função utilitária para obter a semana ISO (ano-semana)
function getISOWeekString(date: Date): string {
  const temp = new Date(date.getTime());
  temp.setHours(0, 0, 0, 0);
  // Quinta-feira é sempre na semana atual
  temp.setDate(temp.getDate() + 3 - ((temp.getDay() + 6) % 7));
  // 1º de janeiro da semana ISO
  const week1 = new Date(temp.getFullYear(), 0, 4);
  // Número da semana ISO
  const weekNo = 1 + Math.round(((temp.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${temp.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export default App;