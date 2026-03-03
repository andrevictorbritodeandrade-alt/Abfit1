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
  startDate: string;
  weeklyFrequency: string;
  plannedSessions: string;
}

export interface Microcycle {
  range: string;
  focus: string;
  method: string;
  intensity: string;
  volume: string;
  notes: string;
}

export interface PeriodizationData {
  summary: string;
  macrocycle: string;
  microcycles: Microcycle[];
  clinicalNotes: string[];
  references: string[];
  image?: string;
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

export interface StudentData {
  profile: StudentProfile;
  workouts: {
    [key: string]: PrescribedExercise[];
  };
  periodization?: PeriodizationData | null;
  workoutCreatedAt?: string;
  workoutUpdatedAt?: string;
  periodizationCreatedAt?: string;
  periodizationUpdatedAt?: string;
  renewalDate?: string;
}

export interface AppDatabase {
  students: { [key: string]: StudentData };
  globalSettings: {
    sets: string;
    reps: string;
    rest: string;
    technique: string;
    observation: string;
  };
}

export type AppView = 'teacher-login' | 'student-list' | 'workspace' | 'exercise-library' | 'student-dashboard';