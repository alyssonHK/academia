import React, { useState, useCallback, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, writeBatch, getDocs, query, orderBy, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Day, Exercise, DayName, DayByDate } from './types';
import DayCard from './components/DayCard';
import Calendar from './components/Calendar';
import { DumbbellIcon, CalendarIcon, ViewColumnsIcon, CogIcon, ClockIcon as TimerIcon, PlusIcon } from './components/Icons';
import chickenIcon from './chicken.ico';

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

// Remover completamente INITIAL_EXERCISE_LIST, getExerciseList, saveExerciseList e qualquer referência a eles.

function App() {
  const [days, setDays] = useState<Day[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'normal' | 'calendar'>('normal');

  // Estado para modal de descanso padrão
  const [showRestModal, setShowRestModal] = useState(false);
  const [defaultRest, setDefaultRest] = useState(() => localStorage.getItem('defaultRest') || '60');
  const [tempRest, setTempRest] = useState(defaultRest);

  // Estado para modal de cronômetro
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [timer, setTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  // Estado para lista global de exercícios
  const [exerciseList, setExerciseList] = useState<string[]>([]);

  // Buscar exercícios do Firestore ao abrir o app
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'exercises'), (snapshot) => {
      setExerciseList(snapshot.docs.map(doc => doc.data().name));
    });
    return () => unsub();
  }, []);

  // Estado para modal de cadastro de exercício global
  const [showGlobalAddModal, setShowGlobalAddModal] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');

  // Estado para modal de cadastro global
  const [globalExercise, setGlobalExercise] = useState('');
  const [globalSets, setGlobalSets] = useState('');
  const [globalReps, setGlobalReps] = useState('');
  const [globalTime, setGlobalTime] = useState('');
  const [selectedDay, setSelectedDay] = useState<DayName | null>(null);

  useEffect(() => {
    if (timerActive) {
      const interval = setInterval(() => setTimer((t) => t + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timerActive]);

  // Funções para salvar descanso padrão
  const handleSaveRest = () => {
    setDefaultRest(tempRest);
    localStorage.setItem('defaultRest', tempRest);
    setShowRestModal(false);
  };

  // Funções do cronômetro
  const handleStartTimer = () => setTimerActive(true);
  const handlePauseTimer = () => setTimerActive(false);
  const handleResetTimer = () => { setTimer(0); setTimerActive(false); };

  // Função para fechar o cronômetro e resetar
  const handleCloseTimerModal = () => {
    setTimerActive(false);
    setTimer(0);
    setShowTimerModal(false);
  };

  // Função para adicionar exercício global (agora salva no Firestore)
  const handleAddGlobalExercise = async () => {
    const name = newExerciseName.trim();
    if (!name || exerciseList.includes(name)) return;
    await setDoc(doc(collection(db, 'exercises'), name), { name });
    setShowGlobalAddModal(false);
    setNewExerciseName('');
  };

  // Função para abrir modal de cadastro global
  const handleOpenGlobalAdd = (dayName?: DayName) => {
    setShowGlobalAddModal(true);
    setSelectedDay(dayName || null);
    setGlobalExercise('');
    setGlobalSets('');
    setGlobalReps('');
    setGlobalTime('');
  };

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
            sets: ex.sets, // garantir que séries sejam salvas
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
            <img src={chickenIcon} alt="Chicken" className="w-12 h-12" />
            <h1 className="text-4xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-teal-300 text-transparent bg-clip-text">
            Projeto Hello Kitty Bombada
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

      {/* Barra superior com ícones */}
      <div className="flex justify-end items-center gap-4 mb-2">
        <button onClick={() => setShowRestModal(true)} className="p-2 rounded-full hover:bg-gray-700" title="Tempo padrão de descanso">
          <CogIcon className="w-6 h-6 text-blue-300" />
        </button>
        <button onClick={() => setShowTimerModal(true)} className="p-2 rounded-full hover:bg-gray-700" title="Abrir cronômetro manual">
          <TimerIcon className="w-6 h-6 text-green-300" />
        </button>
        <button onClick={() => setShowGlobalAddModal(true)} className="p-2 rounded-full hover:bg-gray-700" title="Cadastrar exercício">
          <PlusIcon className="w-6 h-6 text-yellow-300" />
        </button>
      </div>
      {/* Modal descanso padrão */}
      {showRestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col gap-4 min-w-[300px]">
            <h2 className="text-lg font-bold text-white">Tempo padrão de descanso</h2>
            <input
              type="number"
              value={tempRest}
              onChange={e => setTempRest(e.target.value)}
              className="w-full px-3 py-2 rounded bg-gray-900 text-blue-200 border border-gray-600 text-center"
              min={0}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowRestModal(false)} className="px-4 py-2 rounded bg-gray-600 text-gray-200">Cancelar</button>
              <button onClick={handleSaveRest} className="px-4 py-2 rounded bg-blue-600 text-white">Salvar</button>
            </div>
          </div>
        </div>
      )}
      {/* Modal cronômetro */}
      {showTimerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col gap-4 min-w-[300px] items-center">
            <h2 className="text-lg font-bold text-white">Cronômetro</h2>
            <span className="text-4xl font-mono text-green-300">{String(Math.floor(timer/60)).padStart(2,'0')}:{String(timer%60).padStart(2,'0')}</span>
            <div className="flex gap-2">
              <button onClick={handleStartTimer} className="px-4 py-2 rounded bg-green-600 text-white">Iniciar</button>
              <button onClick={handlePauseTimer} className="px-4 py-2 rounded bg-yellow-600 text-white">Pausar</button>
              <button onClick={handleResetTimer} className="px-4 py-2 rounded bg-gray-600 text-white">Zerar</button>
            </div>
            <button onClick={handleCloseTimerModal} className="mt-2 px-4 py-2 rounded bg-gray-700 text-gray-200">Fechar</button>
          </div>
        </div>
      )}
      {/* Modal de cadastro global de exercício */}
      {showGlobalAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col gap-4 min-w-[320px]">
            <h2 className="text-lg font-bold text-white">Cadastrar Exercício</h2>
            <input
              type="text"
              placeholder="Nome do exercício"
              value={newExerciseName}
              onChange={e => setNewExerciseName(e.target.value)}
              className="w-full px-3 py-2 rounded bg-gray-900 text-blue-200 border border-gray-600 text-center mb-2"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowGlobalAddModal(false)} className="px-4 py-2 rounded bg-gray-600 text-gray-200">Cancelar</button>
              <button onClick={handleAddGlobalExercise} className="px-4 py-2 rounded bg-green-600 text-white">Cadastrar</button>
            </div>
          </div>
        </div>
      )}

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
                exerciseList={exerciseList}
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