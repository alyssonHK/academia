export interface Exercise {
  id: string;
  name: string;
  reps: string;
  time: string;
  completed: boolean;
}

export type DayName = 'Domingo' | 'Segunda-feira' | 'Terça-feira' | 'Quarta-feira' | 'Quinta-feira' | 'Sexta-feira' | 'Sábado';

export interface Day {
  name: DayName;
  exercises: Exercise[];
  order: number;
}

// Novos tipos para exercícios por data
export interface DayByDate {
  date: string; // formato YYYY-MM-DD
  dayName: DayName;
  exercises: Exercise[];
}

export interface WeekData {
  weekStart: Date;
  weekEnd: Date;
  days: DayByDate[];
}

export interface CalendarView {
  currentWeek: Date;
  weeks: WeekData[];
}