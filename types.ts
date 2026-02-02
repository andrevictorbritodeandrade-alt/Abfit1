export interface ExerciseDatabase {
  [key: string]: string[];
}

export interface StudentProfile {
  id?: string;
  name: string;
  age: string;
  height: string;
  weight: string;
  objectives: string;
  neurodivergence: string;
  medicalHistory: string;
  bariatric: boolean;
  medications: string;
  exercisePreference: string;
  otherActivities: string;
  trainingSchedule: string;
  sessionDuration: string;
  goalTimeline: string;
}

export interface PeriodizationData {
  summary: string;
  macrocycle: string;
  clinicalNotes: string[];
}

export interface ExerciseDetails {
  name: string;
  description?: string;
  benefits?: string;
}

export interface BrainResult {
  description: string;
  benefits: string;
  visualPrompt: string;
}

export interface PrescribedExercise {
  id: string;
  name: string;
  sets: string;
  reps: string;
  rest: string;
  technique: string;
  observation: string;
  image?: string;
}

export type AppView = 'teacher-login' | 'student-list' | 'workspace';