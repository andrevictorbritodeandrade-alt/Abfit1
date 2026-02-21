import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { 
  Target, 
  Loader2, 
  Play, 
  Video,
  FileText,
  Sparkles,
  UserPlus,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Zap,
  ZapIcon,
  Plus,
  Users,
  ChevronRight,
  LogOut,
  Activity,
  ClipboardList,
  Download,
  Dumbbell,
  Trash2,
  CheckCircle2,
  X,
  Settings,
  Edit3,
  Save,
  BookOpen,
  Library,
  Search,
  Grid,
  Calendar,
  Clock,
  Printer
} from 'lucide-react';

import { 
  ExerciseDatabase, 
  StudentProfile, 
  Microcycle, 
  PeriodizationData, 
  ExerciseDetails, 
  BrainResult, 
  PrescribedExercise, 
  AppView,
  StudentData,
  AppDatabase
} from './types';

import { 
  GEMINI_MODEL, 
  IMAGEN_MODEL, 
  EXERCISE_DATABASE, 
  SERIES_OPTIONS,
  MUSCLE_GROUPS 
} from './constants';

// --- INITIAL DATA ---

const INITIAL_DB: AppDatabase = {
  students: {
    "André Brito": {
      profile: { 
        name: "André Brito", age: "", height: "", weight: "", objectives: "", neurodivergence: "", medicalHistory: "", bariatric: false, medications: "", exercisePreference: "Gosta", otherActivities: "", trainingSchedule: "", sessionDuration: "", goalTimeline: "",
        startDate: new Date().toISOString().split('T')[0], weeklyFrequency: "3", plannedSessions: "12"
      },
      workouts: { "A": [], "B": [], "C": [], "D": [], "E": [] },
      periodization: null
    },
    "Liliane Torres": {
      profile: { 
        name: "Liliane Torres", age: "", height: "", weight: "", objectives: "", neurodivergence: "", medicalHistory: "", bariatric: false, medications: "", exercisePreference: "Gosta", otherActivities: "", trainingSchedule: "", sessionDuration: "", goalTimeline: "",
        startDate: new Date().toISOString().split('T')[0], weeklyFrequency: "3", plannedSessions: "12"
      },
      workouts: { "A": [], "B": [], "C": [], "D": [], "E": [] },
      periodization: null
    },
    "Marcelly Bispo": {
      profile: { 
        name: "Marcelly Bispo", age: "", height: "", weight: "", objectives: "", neurodivergence: "", medicalHistory: "", bariatric: false, medications: "", exercisePreference: "Gosta", otherActivities: "", trainingSchedule: "", sessionDuration: "", goalTimeline: "",
        startDate: new Date().toISOString().split('T')[0], weeklyFrequency: "3", plannedSessions: "12"
      },
      workouts: { "A": [], "B": [], "C": [], "D": [], "E": [] },
      periodization: null
    }
  },
  globalSettings: {
    sets: "3",
    reps: "10-12",
    rest: "60s",
    technique: "Normal",
    observation: ""
  }
};

// --- APP COMPONENT ---

// Initialize the Google GenAI SDK conditionally to avoid crashes if API_KEY is missing during dev
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || 'DUMMY_KEY' });

const App = () => {
  // Navigation State
  const [view, setView] = useState<AppView>('teacher-login');
  const [professorName, setProfessorName] = useState("André Brito");

  // PWA State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // DATA STATE (Centralized)
  const [db, setDb] = useState<AppDatabase>(INITIAL_DB);
  const [currentStudentName, setCurrentStudentName] = useState<string>("");

  // Workspace State
  const [selectedMuscle, setSelectedMuscle] = useState("");
  const [exerciseOptions, setExerciseOptions] = useState<string[]>([]); 
  const [selectedExercise, setSelectedExercise] = useState<ExerciseDetails | null>(null);
  const [exerciseImage, setExerciseImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [isPlaying] = useState(true);

  // Workout Construction State
  const [activeSeries, setActiveSeries] = useState<string>("A"); // "A", "B", "C"...
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showWorkoutList, setShowWorkoutList] = useState(false);
  const [showGlobalSettings, setShowGlobalSettings] = useState(false);
  
  // State for Editing
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);

  // Current Config being edited/added (Derived from Global defaults initially)
  const [exerciseConfig, setExerciseConfig] = useState(db.globalSettings);

  // Gemini States
  const [bioInsight, setBioInsight] = useState("");
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  const [technicalCue, setTechnicalCue] = useState("");
  const [isGeneratingCue, setIsGeneratingCue] = useState(false);

  // Anamnese States
  const [showAnamnesis, setShowAnamnesis] = useState(false);
  
  // Periodization States
  const [isConsulting, setIsConsulting] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const detailSectionRef = useRef<HTMLDivElement>(null);

  // --- LOCAL STORAGE & INIT ---

  useEffect(() => {
    const savedData = localStorage.getItem('prescreveai-data-v2');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        // Robust merge logic
        const mergedStudents = { ...INITIAL_DB.students };
        
        const loadedStudents = parsed.students || {};
        
        // Merge loaded students with default structure to ensure new fields exist
        Object.keys(loadedStudents).forEach(key => {
            const savedStudent = loadedStudents[key];
            const defaultProfile = INITIAL_DB.students["André Brito"].profile; // Use a template for defaults
            
            mergedStudents[key] = {
                ...savedStudent,
                profile: {
                    ...defaultProfile, // Set defaults first
                    ...(savedStudent.profile || {}), // Override with saved
                    name: savedStudent.profile?.name || key // Guarantee name
                },
                workouts: savedStudent.workouts || { "A": [], "B": [], "C": [], "D": [], "E": [] }
            };
        });

        setDb({ 
            students: mergedStudents,
            globalSettings: { ...INITIAL_DB.globalSettings, ...(parsed.globalSettings || {}) } 
        });
      } catch (e) {
        console.error("Failed to load data, using defaults", e);
      }
    }
  }, []);

  // Save whenever DB changes
  useEffect(() => {
    try {
      localStorage.setItem('prescreveai-data-v2', JSON.stringify(db));
    } catch (e) {
      console.error("Failed to save data", e);
    }
  }, [db]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  const scrollToDetail = () => {
    if (detailSectionRef.current) {
      detailSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  useEffect(() => {
    if (selectedMuscle) {
      setExerciseOptions(EXERCISE_DATABASE[selectedMuscle] || []);
    } else {
      setExerciseOptions([]);
    }
  }, [selectedMuscle]);

  // --- Helpers to Update DB ---

  const updateStudentProfile = (name: string, updates: Partial<StudentProfile>) => {
    setDb(prev => ({
      ...prev,
      students: {
        ...prev.students,
        [name]: {
          ...prev.students[name],
          profile: { ...prev.students[name].profile, ...updates }
        }
      }
    }));
  };

  const addExerciseToSeries = (studentName: string, series: string, exercise: PrescribedExercise) => {
    setDb(prev => {
      const student = prev.students[studentName];
      const currentWorkout = student.workouts[series] || [];
      return {
        ...prev,
        students: {
          ...prev.students,
          [studentName]: {
            ...student,
            workouts: {
              ...student.workouts,
              [series]: [...currentWorkout, exercise]
            }
          }
        }
      };
    });
  };

  const updateExerciseInSeries = (studentName: string, series: string, updatedEx: PrescribedExercise) => {
    setDb(prev => {
      const student = prev.students[studentName];
      return {
        ...prev,
        students: {
          ...prev.students,
          [studentName]: {
            ...student,
            workouts: {
              ...student.workouts,
              [series]: student.workouts[series].map(ex => ex.id === updatedEx.id ? updatedEx : ex)
            }
          }
        }
      };
    });
  };

  const removeExerciseFromSeries = (studentName: string, series: string, exId: string) => {
    setDb(prev => {
      const student = prev.students[studentName];
      return {
        ...prev,
        students: {
          ...prev.students,
          [studentName]: {
            ...student,
            workouts: {
              ...student.workouts,
              [series]: student.workouts[series].filter(ex => ex.id !== exId)
            }
          }
        }
      };
    });
  };

  const updatePeriodization = (studentName: string, data: PeriodizationData) => {
    setDb(prev => ({
      ...prev,
      students: {
        ...prev.students,
        [studentName]: {
          ...prev.students[studentName],
          periodization: data
        }
      }
    }));
  };

  const saveGlobalSettings = (settings: typeof db.globalSettings) => {
    setDb(prev => ({ ...prev, globalSettings: settings }));
  };

  // --- Date Calculations ---
  const calculateRenewalDate = (profile: StudentProfile) => {
      if(!profile.startDate || !profile.plannedSessions || !profile.weeklyFrequency) return null;
      
      const start = new Date(profile.startDate);
      const sessions = parseInt(profile.plannedSessions);
      const freq = parseInt(profile.weeklyFrequency);
      
      if(isNaN(sessions) || isNaN(freq) || freq === 0) return null;

      const weeksDuration = sessions / freq;
      const daysDuration = weeksDuration * 7;
      
      const renewalDate = new Date(start);
      renewalDate.setDate(start.getDate() + daysDuration);
      
      return renewalDate;
  };

  const getRenewalStatus = (renewalDate: Date | null) => {
      if(!renewalDate) return { status: 'ok', message: '' };
      
      const today = new Date();
      const diffTime = renewalDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

      if (diffDays < 0) return { status: 'expired', message: `Vencido há ${Math.abs(diffDays)} dias!` };
      if (diffDays <= 7) return { status: 'warning', message: `Renovar em ${diffDays} dias` };
      return { status: 'ok', message: `Renovação: ${renewalDate.toLocaleDateString('pt-BR')}` };
  };


  // --- Handlers for Navigation ---
  const handleTeacherLogin = () => {
    if (professorName.trim()) {
      setView('student-list');
    }
  };

  const handleSelectStudent = (name: string) => {
    // Reset workspace state
    setSelectedMuscle("");
    setExerciseOptions([]);
    setSelectedExercise(null);
    setExerciseImage(null);
    setBioInsight("");
    setTechnicalCue("");
    
    // Ensure student exists in DB (if new)
    if (!db.students[name]) {
       // Create a new student with default values
       const defaultProfile = INITIAL_DB.students["André Brito"].profile;
       setDb(prev => ({
         ...prev,
         students: {
           ...prev.students,
           [name]: {
             profile: { 
                 ...defaultProfile,
                 name: name,
                 startDate: new Date().toISOString().split('T')[0], 
                 weeklyFrequency: "3", 
                 plannedSessions: "12"
             },
             workouts: { "A": [], "B": [], "C": [], "D": [], "E": [] },
             periodization: null
           }
         }
       }));
    }

    setCurrentStudentName(name);
    setActiveSeries("A");
    setView('workspace');
    setShowAnamnesis(true); // Check anamnesis on entry
  };

  const handleOpenLibrary = () => {
    // Reset general state for library viewing
    setSelectedMuscle("");
    setExerciseOptions([]);
    setSelectedExercise(null);
    setExerciseImage(null);
    setTechnicalCue("");
    setView('exercise-library');
  };

  const handleQuickInspect = (exName: string) => {
    setView('exercise-library');
    setTimeout(() => {
        handleSelectExerciseWithDelay(exName);
    }, 100);
  };

  const handleBackToStudents = () => {
    setView('student-list');
  };

  const handlePrint = () => {
    window.print();
  };

  // --- Workout Management Handlers ---
  
  // Open modal to Add New Exercise (using saved global defaults)
  const handleOpenConfigAdd = () => {
    setExerciseConfig({ ...db.globalSettings }); // Load persistent defaults
    setEditingExerciseId(null); // Ensure we are in "Add" mode
    setShowConfigModal(true);
  };

  // Open modal to Edit Existing Exercise
  const handleOpenConfigEdit = (exercise: PrescribedExercise) => {
    setExerciseConfig({
      sets: exercise.sets,
      reps: exercise.reps,
      rest: exercise.rest,
      technique: exercise.technique,
      observation: exercise.observation
    });
    setEditingExerciseId(exercise.id); // Set ID to "Edit" mode
    setShowConfigModal(true);
  };

  const handleConfirmAddOrUpdate = () => {
    if (editingExerciseId) {
      // UPDATE EXISTING
      const exerciseToUpdate = db.students[currentStudentName].workouts[activeSeries].find(ex => ex.id === editingExerciseId);
      if (exerciseToUpdate) {
        updateExerciseInSeries(currentStudentName, activeSeries, {
            ...exerciseToUpdate,
            sets: exerciseConfig.sets,
            reps: exerciseConfig.reps,
            rest: exerciseConfig.rest,
            technique: exerciseConfig.technique,
            observation: exerciseConfig.observation
        });
      }
    } else {
      // ADD NEW
      if (!selectedExercise) return;
      const newExercise: PrescribedExercise = {
        id: Date.now().toString(),
        name: selectedExercise.name,
        sets: exerciseConfig.sets,
        reps: exerciseConfig.reps,
        rest: exerciseConfig.rest,
        technique: exerciseConfig.technique,
        observation: exerciseConfig.observation,
        image: exerciseImage || undefined
      };
      addExerciseToSeries(currentStudentName, activeSeries, newExercise);
    }
    
    setShowConfigModal(false);
    setEditingExerciseId(null);
  };

  const handleRemoveExercise = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening edit modal
    removeExerciseFromSeries(currentStudentName, activeSeries, id);
  };

  // --- Gemini Functions ---
  const generateBioInsight = async () => {
    const profile = db.students[currentStudentName]?.profile;
    if (!profile) return;

    setIsGeneratingInsight(true);
    setBioInsight("");
    
    const prompt = `Analise: Aluno: ${profile.name}, TEA/TDAH: ${profile.neurodivergence}, Bariátrica: ${profile.bariatric ? 'Sim' : 'Não'}. Forneça 3 dicas curtas de segurança e foco para o treinador.`;
    
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt
      });
      if (response.text) {
        setBioInsight(response.text);
      }
    } catch (err) {
      console.error(err);
    } finally { 
      setIsGeneratingInsight(false); 
    }
  };

  const generateTechnicalCue = async (exerciseName: string) => {
    setIsGeneratingCue(true);
    setTechnicalCue("");
    const profile = db.students[currentStudentName]?.profile;
    
    const prompt = `Dica biomecânica rápida para: "${exerciseName}". Considere perfil: ${profile?.neurodivergence || 'padrão'}.`;
    
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt
      });
      if (response.text) {
        setTechnicalCue(response.text);
      }
    } catch (err) { 
      setTechnicalCue("Foque na estabilidade e controle do movimento."); 
    } finally { 
      setIsGeneratingCue(false); 
    }
  };

  const generatePeriodization = async () => {
    setIsConsulting(true);
    setShowAnamnesis(false);
    const profile = db.students[currentStudentName]?.profile;
    
    const prompt = `
      Crie uma periodização INCISIVA e CIENTÍFICA para ${profile.name}.
      Objetivo: ${profile.objectives}.
      Perfil: ${profile.neurodivergence ? profile.neurodivergence : "Padrão"}.
      
      Estrutura Obrigatória:
      1. Microciclos explícitos (ex: "Semana 1-2", "Semana 3-4").
      2. Para cada microciclo defina: Foco, Método de Treino (ex: GVT, FST-7, Drop-set), Intensidade (%RM ou PSE) e Volume.
      3. Cite referências científicas reais (ACSM, NSCA, estudos) que embasam a escolha.
      
      Responda APENAS com JSON.
    `;
    
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              macrocycle: { type: Type.STRING },
              microcycles: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    range: { type: Type.STRING },
                    focus: { type: Type.STRING },
                    method: { type: Type.STRING },
                    intensity: { type: Type.STRING },
                    volume: { type: Type.STRING },
                    notes: { type: Type.STRING }
                  }
                }
              },
              clinicalNotes: { type: Type.ARRAY, items: { type: Type.STRING } },
              references: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["summary", "microcycles", "clinicalNotes", "references"]
          }
        }
      });
      
      const jsonText = response.text;
      if (jsonText) {
        const data = JSON.parse(jsonText);
        updatePeriodization(currentStudentName, data);
        setShowReport(true);
        generateBioInsight();
      }
    } catch (err) { 
      console.error("Erro no plano.", err); 
    } finally { 
      setIsConsulting(false); 
    }
  };

  const handleSelectExerciseWithDelay = (exerciseName: string) => {
    setSelectedExercise({ name: exerciseName });
    setExerciseImage(null);
    setTechnicalCue("");
    scrollToDetail();
    setTimeout(() => {
      processExerciseDataAndGenerateImage(exerciseName);
    }, 500);
  };

  const processExerciseDataAndGenerateImage = async (exerciseName: string) => {
    setImageLoading(true);
    try {
      const brainPrompt = `Analise o exercício "${exerciseName}". 
      Instruções biomecânicas:
      - Se HBC: Haltere (Dumbbell). Nunca barra.
      - Se HBL: Barra Longa.
      - Se "alternado": Execução asimétrica.
      - Se "sumô": Pernas bem afastadas.
      
      Forneça:
      1. Descrição técnica curta (português).
      2. 3 Benefícios (português).
      3. PROMPT VISUAL INGLÊS 8k descrevendo atleta preto, biomecânica e luz de estúdio.`;

      // 1. Get Text Analysis
      const brainData = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: brainPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING },
              benefits: { type: Type.STRING },
              visualPrompt: { type: Type.STRING }
            }
          }
        }
      });

      const brainResult = JSON.parse(brainData.text || "{}") as BrainResult;

      // 2. Generate Image using Imagen
      if (brainResult.visualPrompt) {
        const imageResponse = await ai.models.generateContent({
          model: IMAGEN_MODEL,
          contents: {
            parts: [{ text: brainResult.visualPrompt }]
          },
          config: {
            imageConfig: {
              aspectRatio: "16:9"
            }
          }
        });

        let base64Image = null;
        for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            base64Image = part.inlineData.data;
            break;
          }
        }

        if (base64Image) {
          setExerciseImage(`data:image/jpeg;base64,${base64Image}`);
        }
      }

      setSelectedExercise({
        name: exerciseName,
        description: brainResult.description,
        benefits: brainResult.benefits
      });

    } catch (err) {
      console.error("Erro ao processar.", err);
    } finally {
      setImageLoading(false);
    }
  };

  const animationStyles = `
    @keyframes biomechanicalVideo {
      0% { transform: scale(1) translateY(0); filter: brightness(1) contrast(1); }
      40% { transform: scale(1.05) translateY(-5px); filter: brightness(1.1) contrast(1.1); }
      60% { transform: scale(1.05) translateY(-5px); filter: brightness(1.1) contrast(1.1); }
      100% { transform: scale(1) translateY(0); filter: brightness(1) contrast(1); }
    }
    .video-motion-engine { animation: biomechanicalVideo 5s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
    
    @media print {
      body * {
        visibility: hidden;
      }
      .printable-area, .printable-area * {
        visibility: visible;
      }
      .printable-area {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        color: black !important;
        background: white !important;
      }
      .no-print {
        display: none !important;
      }
    }
  `;

  // --- Views ---

  if (view === 'teacher-login') {
    return (
      <div className="min-h-screen bg-black text-white font-sans flex items-center justify-center p-6 relative overflow-hidden">
        <style>{animationStyles}</style>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-900/10 via-black to-black opacity-50 pointer-events-none"></div>
        <div className="max-w-md w-full bg-neutral-900/50 border border-white/10 p-12 rounded-[3rem] shadow-2xl relative z-10 backdrop-blur-xl">
           <div className="flex justify-center mb-8">
              <div className="bg-red-500 p-3 rounded-2xl rotate-3 shadow-lg shadow-red-500/20">
                <Video className="w-8 h-8 text-black" />
              </div>
           </div>
           <h1 className="text-4xl font-black text-center uppercase italic tracking-tighter mb-2">Prescreve<span className="text-red-500">AI</span></h1>
           <p className="text-center text-neutral-500 text-xs font-black uppercase tracking-[0.3em] mb-12">Portal do Professor</p>
           
           <div className="space-y-6">
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-red-500 pl-4">Nome do Professor</label>
                <input 
                  type="text"
                  value={professorName}
                  onChange={(e) => setProfessorName(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-red-500 transition-all text-center font-bold"
                  placeholder="Digite seu nome..."
                />
             </div>
             <button 
                onClick={handleTeacherLogin}
                className="w-full bg-red-500 hover:bg-white hover:text-black text-black font-black uppercase tracking-[0.2em] py-5 rounded-2xl transition-all shadow-lg shadow-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!professorName.trim()}
             >
               Acessar
             </button>

             {isInstallable && (
               <button 
                 onClick={handleInstallClick}
                 className="w-full flex items-center justify-center gap-2 text-neutral-400 hover:text-red-500 text-[10px] font-black uppercase tracking-widest mt-4 transition-colors animate-pulse"
               >
                 <Download className="w-4 h-4" /> Instalar App
               </button>
             )}
           </div>
        </div>
      </div>
    );
  }

  if (view === 'student-list') {
    return (
      <div className="min-h-screen bg-black text-white font-sans selection:bg-red-500/30">
        <nav className="border-b border-white/5 bg-black/95 backdrop-blur-3xl sticky top-0 z-50 h-20 flex items-center">
          <div className="max-w-7xl mx-auto px-6 w-full flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-red-500 to-red-800 flex items-center justify-center font-bold text-black text-sm">
                 {professorName.charAt(0).toUpperCase()}
               </div>
               <div>
                 <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">Professor</p>
                 <h2 className="text-lg font-bold leading-none">{professorName}</h2>
               </div>
            </div>
            <div className="flex items-center gap-4">
              {isInstallable && (
                <button onClick={handleInstallClick} className="text-neutral-500 hover:text-red-500 transition-colors" title="Instalar App">
                  <Download className="w-5 h-5" />
                </button>
              )}
              <button onClick={() => setView('teacher-login')} className="text-neutral-500 hover:text-red-500 transition-colors">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-6 py-12 space-y-16">
           <section>
             <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-12 flex items-center gap-3">
               <Users className="w-8 h-8 text-red-500" />
               Meus Alunos
             </h1>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.keys(db.students).map((studentName, idx) => {
                  const student = db.students[studentName];
                  const renewalDate = calculateRenewalDate(student.profile);
                  const renewalStatus = getRenewalStatus(renewalDate);
                  
                  return (
                    <button 
                      key={idx}
                      onClick={() => handleSelectStudent(studentName)}
                      className="bg-neutral-900/50 border border-white/10 p-8 rounded-[2.5rem] hover:bg-neutral-900 hover:border-red-500/50 transition-all group text-left relative overflow-hidden"
                    >
                      {renewalStatus.status !== 'ok' && (
                        <div className={`absolute top-0 right-0 p-4`}>
                           <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${renewalStatus.status === 'expired' ? 'bg-red-500 text-black animate-pulse' : 'bg-yellow-500 text-black'}`}>
                             <AlertTriangle className="w-3 h-3" /> {renewalStatus.message}
                           </div>
                        </div>
                      )}

                      <div className="h-16 w-16 rounded-2xl bg-neutral-950 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-white/5 group-hover:border-red-500/30">
                        <Users className="w-6 h-6 text-neutral-400 group-hover:text-red-500" />
                      </div>
                      <h3 className="text-xl font-bold mb-2">{studentName}</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 group-hover:text-red-400">Acessar Prontuário</p>
                    </button>
                  );
                })}
                
                <button 
                  onClick={handleOpenLibrary}
                  className="bg-red-500/5 border-2 border-dashed border-red-500/20 p-8 rounded-[2.5rem] hover:border-red-500/50 hover:bg-red-500/10 transition-all group text-left relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transition-opacity">
                       <BookOpen className="w-6 h-6 text-red-500" />
                    </div>
                    <div className="h-16 w-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-red-500/20">
                       <Library className="w-6 h-6 text-red-500" />
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-red-500">Acervo Completo</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 group-hover:text-red-400">Visualizar Exercícios & IA</p>
                </button>

                <button className="bg-transparent border-2 border-dashed border-white/10 p-8 rounded-[2.5rem] hover:border-red-500/30 hover:bg-red-500/5 transition-all flex flex-col items-center justify-center gap-4 text-neutral-500 hover:text-red-500 h-full min-h-[240px]">
                   <Plus className="w-8 h-8" />
                   <span className="text-[10px] font-black uppercase tracking-widest">Novo Cadastro</span>
                </button>
             </div>
           </section>

           <section className="pt-8 border-t border-white/5">
              <div className="flex items-center justify-between mb-8">
                 <h2 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-3">
                    <div className="bg-red-500 p-2 rounded-lg rotate-3">
                      <Dumbbell className="w-5 h-5 text-black" />
                    </div>
                    Inventário Geral
                 </h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                 <div className="lg:col-span-4 space-y-4">
                    <div className="bg-neutral-900/50 p-6 rounded-[2rem] border border-white/10 sticky top-24">
                       <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-4 block">Filtrar por Grupo</label>
                       <select 
                          className="w-full bg-black border border-white/10 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-red-500 transition-colors cursor-pointer"
                          value={selectedMuscle}
                          onChange={(e) => setSelectedMuscle(e.target.value)}
                        >
                          <option value="">Selecione...</option>
                          {MUSCLE_GROUPS.map(m => <option key={m} value={m}>{m}</option>)}
                       </select>
                       
                       {selectedMuscle && (
                         <div className="mt-6 p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                            <div className="text-2xl font-black text-red-500 mb-1">{exerciseOptions.length}</div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Exercícios Encontrados</div>
                         </div>
                       )}
                    </div>
                 </div>

                 <div className="lg:col-span-8">
                    {selectedMuscle ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-in slide-in-from-bottom-4">
                        {exerciseOptions.map((ex, i) => (
                           <button 
                             key={i} 
                             onClick={() => handleQuickInspect(ex)}
                             className="group p-4 bg-neutral-900/30 border border-white/5 rounded-2xl hover:bg-neutral-900 hover:border-red-500/30 transition-all flex items-center gap-3 text-left w-full"
                           >
                              <div className="h-8 w-8 rounded-full bg-black flex shrink-0 items-center justify-center border border-white/5 text-[10px] font-black text-neutral-600 group-hover:text-red-500 group-hover:border-red-500/30">
                                {i + 1}
                              </div>
                              <span className="text-xs font-bold text-neutral-300 group-hover:text-white leading-tight">{ex}</span>
                              <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                <Search className="w-3 h-3 text-red-500" />
                              </div>
                           </button>
                        ))}
                      </div>
                    ) : (
                      <div className="h-64 flex flex-col items-center justify-center text-neutral-700 border-2 border-dashed border-white/5 rounded-[2rem]">
                         <Dumbbell className="w-12 h-12 opacity-20 mb-4" />
                         <span className="text-xs font-black uppercase tracking-widest opacity-50">Selecione um grupo muscular para visualizar</span>
                      </div>
                    )}
                 </div>
              </div>
           </section>
        </main>
      </div>
    );
  }

  // --- Exercise Library View ---
  if (view === 'exercise-library') {
    return (
      <div className="min-h-screen bg-black text-white font-sans selection:bg-red-500/30 overflow-x-hidden">
        <style>{animationStyles}</style>
        
        <nav className="border-b border-white/5 bg-black/95 backdrop-blur-3xl sticky top-0 z-50 h-16 flex items-center">
          <div className="max-w-7xl mx-auto px-6 w-full flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={handleBackToStudents} className="bg-neutral-900 p-2 rounded-lg hover:bg-neutral-800 transition-colors group">
                 <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white rotate-180" />
              </button>
              <div className="h-8 w-px bg-white/10 mx-2"></div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-red-500">Módulo</span>
                <span className="font-bold leading-none">Acervo Biomecânico</span>
              </div>
            </div>
            <div className="flex gap-3">
               <div className="px-4 py-2 bg-white/5 rounded-full border border-white/10 text-[10px] text-neutral-400 font-bold uppercase tracking-wider flex items-center gap-2">
                 <Library className="w-3 h-3 text-red-500" /> Modo Visualização
               </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-neutral-900/40 p-6 rounded-[2.5rem] border border-white/5 shadow-2xl sticky top-24 backdrop-blur-md">
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500 mb-6 flex items-center gap-2">
                <Target className="w-4 h-4 text-red-500" /> Base de Dados
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-neutral-600 mb-3 block uppercase tracking-widest">Grupo Muscular</label>
                  <select className="w-full bg-neutral-950 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:border-red-500 outline-none appearance-none cursor-pointer hover:bg-neutral-900" value={selectedMuscle} onChange={(e) => setSelectedMuscle(e.target.value)}>
                    <option value="">Selecione o grupo...</option>
                    {MUSCLE_GROUPS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                {selectedMuscle && (
                  <div className="animate-in fade-in slide-in-from-top-4">
                    <div className="grid grid-cols-1 gap-2 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-red-500/20">
                      {exerciseOptions.map((exName, i) => (
                        <button key={i} onClick={() => handleSelectExerciseWithDelay(exName)} className={`text-left px-5 py-4 rounded-2xl text-[11px] transition-all border flex items-center justify-between group ${selectedExercise?.name === exName ? 'bg-red-500 border-red-500 text-black font-black' : 'bg-neutral-950 border-white/5 text-neutral-400 hover:bg-neutral-900'}`}>
                          <span className="truncate">{exName}</span>
                          <Play className={`w-3 h-3 ${selectedExercise?.name === exName ? 'fill-black' : 'fill-red-500'}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>

          <section className="lg:col-span-8 space-y-6">
            {!selectedExercise ? (
              <div className="h-full min-h-[550px] flex flex-col items-center justify-center text-neutral-700 border-2 border-dashed border-white/5 rounded-[3rem] bg-neutral-950/20">
                <Video className="w-16 h-16 opacity-10 mb-6" />
                <p className="font-black uppercase tracking-[0.4em] text-[10px] text-red-500 text-center px-8">Selecione um exercício para ver a biomecânica 8K</p>
              </div>
            ) : (
              <div ref={detailSectionRef} className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="bg-neutral-900/40 rounded-[3rem] overflow-hidden border border-white/10 shadow-3xl backdrop-blur-xl">
                  
                  <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden border-b border-white/5">
                    {imageLoading ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950 z-20">
                        <Loader2 className="w-12 h-12 animate-spin text-red-500" />
                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-neutral-500 mt-4 italic">Analysing Asymmetry... (0.5s snap delay)</span>
                      </div>
                    ) : exerciseImage ? (
                      <div className={`w-full h-full relative ${isPlaying ? 'video-motion-engine' : ''}`}>
                        <img src={exerciseImage} alt="Execução" className="w-full h-full object-cover" />
                        <div className="absolute top-8 left-8 flex items-center gap-3">
                          <div className="bg-red-600 h-2 w-2 rounded-full animate-pulse shadow-lg"></div>
                          <span className="text-[10px] font-black uppercase tracking-widest bg-black/60 px-2 py-1 rounded border border-white/10 backdrop-blur-md">LIVE BIOMECHANIC FEED</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-neutral-700">
                          <Video className="w-10 h-10 opacity-20 mb-2"/>
                          <span className="text-[10px] uppercase tracking-widest opacity-40">Aguardando geração visual</span>
                      </div>
                    )}
                  </div>

                  <div className="p-12">
                    <div className="mb-10">
                      <h2 className="text-5xl font-black uppercase italic tracking-tighter text-white leading-none max-w-lg mb-4">{selectedExercise.name}</h2>
                      <div className="flex gap-3">
                         <span className="text-[10px] font-black uppercase tracking-widest bg-red-500 text-black px-3 py-1 rounded-full">Análise AI</span>
                         <span className="text-[10px] font-black uppercase tracking-widest bg-white/10 text-white px-3 py-1 rounded-full">Biomecânica</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500 flex items-center gap-2"><ZapIcon className="w-4 h-4 fill-red-500" /> Técnica Aplicada</h4>
                        <p className="text-neutral-400 text-lg leading-relaxed border-l-2 border-red-500/20 pl-6">{selectedExercise.description || "Iniciando processamento biomecânico..."}</p>
                      </div>
                      <div className="bg-black/50 p-10 rounded-[2.5rem] border border-white/5 shadow-inner">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500 mb-6">Impacto Fisiológico</h4>
                        <div className="text-neutral-300 text-sm italic whitespace-pre-wrap">{selectedExercise.benefits}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    );
  }

  // --- Workspace View (Default Fallback) ---
  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-red-500/30 pb-32">
       <nav className="border-b border-white/5 bg-black/95 backdrop-blur-3xl sticky top-0 z-50 h-20 flex items-center">
          <div className="max-w-7xl mx-auto px-6 w-full flex items-center justify-between">
            <div className="flex items-center gap-4">
               <button onClick={handleBackToStudents} className="bg-neutral-900 p-2 rounded-lg hover:bg-neutral-800 transition-colors group">
                 <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white rotate-180" />
               </button>
               <div>
                 <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">Aluno(a)</p>
                 <h2 className="text-lg font-bold leading-none">{currentStudentName}</h2>
               </div>
            </div>
            
            <div className="flex items-center gap-2">
               <button onClick={() => setShowAnamnesis(true)} className="p-2 text-neutral-500 hover:text-white transition-colors flex items-center gap-2 group">
                 <span className="text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Prontuário</span>
                 <ClipboardList className="w-5 h-5" />
               </button>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
           {/* Series Selector */}
           <div className="space-y-2">
             <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Série Ativa</label>
             <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {SERIES_OPTIONS.map(series => (
                  <button
                    key={series}
                    onClick={() => setActiveSeries(series)}
                    className={`h-14 w-14 rounded-2xl flex items-center justify-center font-black text-xl transition-all flex-shrink-0 ${activeSeries === series ? 'bg-red-500 text-black shadow-lg shadow-red-500/20 scale-110' : 'bg-neutral-900 text-neutral-600 border border-white/5 hover:bg-neutral-800'}`}
                  >
                    {series}
                  </button>
                ))}
             </div>
           </div>

           {/* Workout Builder */}
           <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4 space-y-6">
                 <div className="bg-neutral-900/40 p-6 rounded-[2.5rem] border border-white/5 sticky top-24">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-6 flex items-center gap-2">
                      <Plus className="w-4 h-4 text-red-500" /> Adicionar Exercício
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-neutral-600 mb-2 block uppercase tracking-widest">Grupo Muscular</label>
                        <select 
                          className="w-full bg-neutral-950 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:border-red-500 transition-colors cursor-pointer"
                          value={selectedMuscle}
                          onChange={(e) => {
                            setSelectedMuscle(e.target.value);
                            setSelectedExercise(null);
                          }}
                        >
                          <option value="">Selecione...</option>
                          {MUSCLE_GROUPS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>

                      {selectedExercise && (
                         <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-2xl animate-in fade-in zoom-in-95">
                            <p className="text-[10px] text-red-400 font-black uppercase tracking-widest mb-2">Selecionado</p>
                            <p className="font-bold text-white text-lg leading-tight mb-4">{selectedExercise.name}</p>
                            <button 
                              onClick={handleOpenConfigAdd}
                              className="w-full py-4 bg-red-500 hover:bg-white hover:text-black text-black font-black uppercase tracking-widest rounded-xl transition-all text-xs shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
                            >
                              Configurar <ChevronRight className="w-3 h-3" />
                            </button>
                         </div>
                      )}
                    </div>
                 </div>
              </div>

              <div className="lg:col-span-8">
                 {selectedMuscle ? (
                    <div className="space-y-3 animate-in slide-in-from-bottom-4">
                       <div className="flex items-center justify-between px-2 mb-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">{exerciseOptions.length} Opções</span>
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {exerciseOptions.map((ex, i) => (
                           <button 
                             key={i} 
                             onClick={() => setSelectedExercise({ name: ex })}
                             className={`p-5 rounded-2xl transition-all flex items-center gap-4 text-left w-full border ${selectedExercise?.name === ex ? 'bg-neutral-800 border-red-500/50 ring-1 ring-red-500/20' : 'bg-neutral-900/30 border-white/5 hover:bg-neutral-900 hover:border-red-500/30'}`}
                           >
                              <div className={`h-8 w-8 rounded-full flex shrink-0 items-center justify-center border text-[10px] font-black transition-colors ${selectedExercise?.name === ex ? 'bg-red-500 text-black border-red-500' : 'bg-black border-white/5 text-neutral-600'}`}>
                                {selectedExercise?.name === ex ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                              </div>
                              <span className={`text-sm font-bold leading-tight ${selectedExercise?.name === ex ? 'text-white' : 'text-neutral-400'}`}>{ex}</span>
                           </button>
                        ))}
                       </div>
                    </div>
                 ) : (
                    <div className="h-64 flex flex-col items-center justify-center text-neutral-700 border-2 border-dashed border-white/5 rounded-[3rem] bg-neutral-950/30">
                       <div className="bg-neutral-900 p-4 rounded-full mb-4">
                         <Dumbbell className="w-8 h-8 opacity-20" />
                       </div>
                       <span className="text-xs font-black uppercase tracking-widest opacity-50">Selecione um grupo muscular</span>
                    </div>
                 )}
              </div>
           </div>
        </main>

        {/* Floating Action Bar */}
        <div className="fixed bottom-6 left-6 right-6 z-40">
           <div className="max-w-4xl mx-auto">
              <div className="bg-neutral-900/80 backdrop-blur-xl border border-white/10 p-2 pl-6 rounded-full shadow-2xl flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                       <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                       <span className="text-xs font-black uppercase tracking-widest text-white">Série {activeSeries}</span>
                    </div>
                    <span className="text-xs text-neutral-500 font-bold border-l border-white/10 pl-4">{db.students[currentStudentName]?.workouts[activeSeries]?.length || 0} exercícios</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <button 
                     onClick={() => setShowGlobalSettings(true)}
                     className="h-10 w-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors border border-white/5"
                     title="Padrões de Série"
                   >
                     <Settings className="w-4 h-4" />
                   </button>
                   <button 
                     onClick={() => setShowWorkoutList(true)}
                     className="h-10 px-6 rounded-full bg-white text-black font-black uppercase tracking-widest text-[10px] hover:bg-red-500 transition-colors shadow-lg flex items-center gap-2"
                   >
                     <ClipboardList className="w-4 h-4" /> Ver Treino
                   </button>
                 </div>
              </div>
           </div>
        </div>

      {/* MODALS AREA */}

      {/* Modal de Configuração Global (Padrões) */}
      {showGlobalSettings && (
        <div className="fixed inset-0 z-[130] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-neutral-900 border border-white/10 w-full max-w-sm rounded-[2.5rem] p-8 shadow-3xl animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                   <Settings className="w-5 h-5 text-red-500"/> Padrão Geral (Salvo)
                </h3>
                <button onClick={() => setShowGlobalSettings(false)} className="text-neutral-500 hover:text-white"><X className="w-5 h-5"/></button>
              </div>
              <p className="text-xs text-neutral-500 mb-4">Esses valores ficarão salvos no seu dispositivo para todos os próximos treinos.</p>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-neutral-500">Séries Padrão</label>
                      <input className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-center font-bold outline-none focus:border-red-500" value={db.globalSettings.sets} onChange={(e) => saveGlobalSettings({...db.globalSettings, sets: e.target.value})} />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-neutral-500">Reps Padrão</label>
                      <input className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-center font-bold outline-none focus:border-red-500" value={db.globalSettings.reps} onChange={(e) => saveGlobalSettings({...db.globalSettings, reps: e.target.value})} />
                   </div>
                </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-neutral-500">Descanso Padrão</label>
                    <input className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-center font-bold outline-none focus:border-red-500" value={db.globalSettings.rest} onChange={(e) => saveGlobalSettings({...db.globalSettings, rest: e.target.value})} />
                 </div>
                 <button onClick={() => setShowGlobalSettings(false)} className="w-full py-3 bg-red-500 text-black font-black uppercase tracking-widest rounded-xl mt-2">Fechar e Manter</button>
              </div>
           </div>
        </div>
      )}
      
      {/* Modal de Configuração de Exercício (Adicionar/Editar) */}
      {showConfigModal && (
        <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-white/10 w-full max-w-lg rounded-[2.5rem] p-8 shadow-3xl animate-in zoom-in-95">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">{editingExerciseId ? 'Editar Exercício' : `Adicionar à Série ${activeSeries}`}</h3>
                <button onClick={() => setShowConfigModal(false)} className="text-neutral-500 hover:text-white"><X className="w-6 h-6"/></button>
             </div>
             <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-neutral-500">Séries</label>
                      <input className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-center font-bold outline-none focus:border-red-500" value={exerciseConfig.sets} onChange={(e) => setExerciseConfig({...exerciseConfig, sets: e.target.value})} />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-neutral-500">Repetições</label>
                      <input className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-center font-bold outline-none focus:border-red-500" value={exerciseConfig.reps} onChange={(e) => setExerciseConfig({...exerciseConfig, reps: e.target.value})} />
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-neutral-500">Intervalo</label>
                      <input className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-center font-bold outline-none focus:border-red-500" value={exerciseConfig.rest} onChange={(e) => setExerciseConfig({...exerciseConfig, rest: e.target.value})} />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-neutral-500">Técnica/Método</label>
                      <input className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-center font-bold outline-none focus:border-red-500" value={exerciseConfig.technique} onChange={(e) => setExerciseConfig({...exerciseConfig, technique: e.target.value})} />
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-neutral-500">Observações (Opcional)</label>
                   <textarea className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-red-500 resize-none h-20" placeholder="Ex: Cadência 3030..." value={exerciseConfig.observation} onChange={(e) => setExerciseConfig({...exerciseConfig, observation: e.target.value})} />
                </div>
                <button onClick={handleConfirmAddOrUpdate} className="w-full py-4 bg-red-500 hover:bg-white hover:text-black text-black font-black uppercase tracking-widest rounded-xl transition-all mt-4 flex items-center justify-center gap-2">
                   <CheckCircle2 className="w-5 h-5" /> {editingExerciseId ? 'Salvar Alterações' : 'Confirmar e Adicionar'}
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Modal de Lista de Treino (Meu Treino) */}
      {showWorkoutList && (
        <div className="fixed inset-0 z-[115] bg-black/90 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-6">
           <div className="bg-neutral-900 border-t md:border border-white/10 w-full max-w-2xl h-[80vh] rounded-t-[2.5rem] md:rounded-[2.5rem] flex flex-col shadow-3xl animate-in slide-in-from-bottom-10">
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-neutral-950 rounded-t-[2.5rem]">
                 <div className="flex items-center gap-3">
                    <Dumbbell className="w-6 h-6 text-red-500" />
                    <div>
                      <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">Treino {activeSeries}</h2>
                      <p className="text-[10px] text-neutral-500 font-bold">{db.students[currentStudentName]?.workouts[activeSeries]?.length || 0} Exercícios</p>
                    </div>
                 </div>
                 <button onClick={() => setShowWorkoutList(false)} className="bg-white/5 hover:bg-white/10 p-2 rounded-full transition-colors"><X className="w-5 h-5 text-white" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                 {(!db.students[currentStudentName]?.workouts[activeSeries] || db.students[currentStudentName].workouts[activeSeries].length === 0) ? (
                   <div className="h-full flex flex-col items-center justify-center text-neutral-600 gap-4">
                      <Dumbbell className="w-12 h-12 opacity-20" />
                      <p className="text-xs uppercase tracking-widest font-bold">Nenhum exercício na Série {activeSeries}</p>
                   </div>
                 ) : (
                   db.students[currentStudentName].workouts[activeSeries].map((item, idx) => (
                     <div 
                        key={item.id} 
                        onClick={() => handleOpenConfigEdit(item)}
                        className="bg-black border border-white/5 p-5 rounded-2xl flex items-center justify-between group hover:border-red-500/30 transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                           {/* Ordinal Number logic: idx + 1 + 'º' */}
                           <div className="h-10 w-10 bg-neutral-900 rounded-full flex items-center justify-center font-black text-red-500 text-sm border border-white/5">
                             {idx + 1}º
                           </div>
                           <div>
                              <h4 className="font-bold text-white text-sm">{item.name}</h4>
                              <p className="text-[10px] text-neutral-400 font-medium mt-1 flex gap-2">
                                <span className="bg-white/10 px-1.5 rounded">{item.sets} Séries</span>
                                <span className="bg-white/10 px-1.5 rounded">{item.reps} Reps</span>
                                <span className="bg-white/10 px-1.5 rounded">{item.rest}</span>
                              </p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Edit3 className="w-4 h-4 text-neutral-600 group-hover:text-white" />
                          <button onClick={(e) => handleRemoveExercise(item.id, e)} className="p-2 text-neutral-600 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5" /></button>
                        </div>
                     </div>
                   ))
                 )}
              </div>
              <div className="p-6 border-t border-white/5 bg-neutral-950 rounded-b-[2.5rem]">
                 <button className="w-full py-4 bg-white/5 hover:bg-red-500 hover:text-black text-neutral-300 font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2">
                    <Download className="w-5 h-5" /> Exportar PDF
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Modal de Anamnese & Gerenciamento de Plano */}
      {showAnamnesis && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-white/10 w-full max-w-4xl max-h-[90vh] rounded-[3.5rem] overflow-hidden flex flex-col shadow-3xl animate-in zoom-in-95">
            <div className="p-10 border-b border-white/5 flex justify-between items-center bg-neutral-950">
              <div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">Anamnese & Plano</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-red-500">{db.students[currentStudentName]?.profile.name}</p>
              </div>
              <button onClick={() => setShowAnamnesis(false)} className="text-neutral-500 hover:text-white transition-colors text-xs font-black uppercase tracking-widest">Salvar e Sair</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-12 grid grid-cols-1 md:grid-cols-2 gap-10 scrollbar-thin scrollbar-thumb-red-500/20">
               {/* Timeline Management Section */}
               <div className="col-span-1 md:col-span-2 bg-neutral-950/50 p-6 rounded-3xl border border-white/5 mb-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500 mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Gestão do Plano
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                     <div>
                       <label className="block text-[10px] text-neutral-500 font-bold mb-2">Início do Treino</label>
                       <input type="date" className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm text-white" 
                          value={db.students[currentStudentName]?.profile.startDate}
                          onChange={e => updateStudentProfile(currentStudentName, { startDate: e.target.value })}
                       />
                     </div>
                     <div>
                       <label className="block text-[10px] text-neutral-500 font-bold mb-2">Frequência Semanal</label>
                       <select className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm text-white"
                          value={db.students[currentStudentName]?.profile.weeklyFrequency}
                          onChange={e => updateStudentProfile(currentStudentName, { weeklyFrequency: e.target.value })}
                       >
                         <option value="1">1x Semana</option>
                         <option value="2">2x Semana</option>
                         <option value="3">3x Semana</option>
                         <option value="4">4x Semana</option>
                         <option value="5">5x Semana</option>
                         <option value="6">6x Semana</option>
                       </select>
                     </div>
                     <div>
                       <label className="block text-[10px] text-neutral-500 font-bold mb-2">Total de Treinos</label>
                       <input type="number" className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm text-white" 
                          placeholder="Ex: 12"
                          value={db.students[currentStudentName]?.profile.plannedSessions}
                          onChange={e => updateStudentProfile(currentStudentName, { plannedSessions: e.target.value })}
                       />
                     </div>
                  </div>
                  {(() => {
                    const renewal = calculateRenewalDate(db.students[currentStudentName]?.profile);
                    const status = getRenewalStatus(renewal);
                    return renewal ? (
                      <div className={`mt-4 p-4 rounded-xl border flex items-center justify-between ${status.status === 'expired' ? 'bg-red-500/20 border-red-500/50' : 'bg-green-500/10 border-green-500/20'}`}>
                         <div className="flex items-center gap-3">
                            <Clock className={`w-5 h-5 ${status.status === 'expired' ? 'text-red-500' : 'text-green-500'}`} />
                            <div>
                               <p className="text-xs font-bold text-white">Previsão de Renovação</p>
                               <p className="text-[10px] text-neutral-400">{renewal.toLocaleDateString('pt-BR')}</p>
                            </div>
                         </div>
                         <div className="text-xs font-black uppercase">{status.message}</div>
                      </div>
                    ) : null;
                  })()}
               </div>

              <div className="space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500">Dados Antropométricos</h3>
                <div className="grid grid-cols-3 gap-3">
                   <input placeholder="Idade" className="bg-black border border-white/5 rounded-2xl p-5 text-sm outline-none focus:border-red-500 text-white" 
                     value={db.students[currentStudentName]?.profile.age} 
                     onChange={e => updateStudentProfile(currentStudentName, { age: e.target.value })} 
                   />
                   <input placeholder="cm" className="bg-black border border-white/5 rounded-2xl p-5 text-sm outline-none focus:border-red-500 text-white" 
                     value={db.students[currentStudentName]?.profile.height} 
                     onChange={e => updateStudentProfile(currentStudentName, { height: e.target.value })} 
                   />
                   <input placeholder="kg" className="bg-black border border-white/5 rounded-2xl p-5 text-sm outline-none focus:border-red-500 text-white" 
                     value={db.students[currentStudentName]?.profile.weight} 
                     onChange={e => updateStudentProfile(currentStudentName, { weight: e.target.value })} 
                   />
                </div>
                <textarea placeholder="Objetivos do aluno (Ex: Hipertrofia, emagrecimento, correção postural)..." className="w-full bg-black border border-white/5 rounded-2xl p-5 text-sm h-28 outline-none focus:border-red-500 text-white resize-none" 
                  value={db.students[currentStudentName]?.profile.objectives} 
                  onChange={e => updateStudentProfile(currentStudentName, { objectives: e.target.value })} 
                />
              </div>
              <div className="space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500">Saúde e Neuro</h3>
                <input placeholder="Neurodivergência (TEA/TDAH/Nenhuma)?" className="w-full bg-black border border-white/5 rounded-2xl p-5 text-sm outline-none focus:border-red-500 text-white" 
                  value={db.students[currentStudentName]?.profile.neurodivergence} 
                  onChange={e => updateStudentProfile(currentStudentName, { neurodivergence: e.target.value })} 
                />
                <input placeholder="Histórico Médico / Lesões?" className="w-full bg-black border border-white/5 rounded-2xl p-5 text-sm outline-none focus:border-red-500 text-white" 
                  value={db.students[currentStudentName]?.profile.medicalHistory} 
                  onChange={e => updateStudentProfile(currentStudentName, { medicalHistory: e.target.value })} 
                />
                <div className="flex items-center justify-between bg-black p-5 rounded-2xl border border-white/5">
                  <span className="text-[10px] text-neutral-500 font-black uppercase">Fez Bariátrica?</span>
                  <button className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${db.students[currentStudentName]?.profile.bariatric ? 'bg-red-500 text-black shadow-lg shadow-red-500/20' : 'bg-white/5 text-neutral-700'}`} onClick={() => updateStudentProfile(currentStudentName, { bariatric: !db.students[currentStudentName]?.profile.bariatric })}>{db.students[currentStudentName]?.profile.bariatric ? 'SIM' : 'NÃO'}</button>
                </div>
              </div>
            </div>
            <div className="p-10 border-t border-white/5 bg-neutral-950">
              <button onClick={generatePeriodization} className="w-full py-6 bg-red-500 text-black font-black uppercase tracking-[0.2em] rounded-[1.5rem] hover:bg-white transition-all shadow-2xl text-xs">Gerar Periodização Científica ✨</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Relatório (Printable) */}
      {showReport && db.students[currentStudentName]?.periodization && (
        <div className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6 overflow-y-auto">
          <div className="printable-area bg-white text-black w-full max-w-5xl min-h-[90vh] rounded-none md:rounded-[3.5rem] overflow-hidden flex flex-col shadow-3xl animate-in zoom-in-95 relative">
            
            {/* Header / Actions (Hidden on Print) */}
            <div className="no-print p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center sticky top-0 z-10">
               <div className="flex items-center gap-2 text-red-600">
                  <Printer className="w-5 h-5" />
                  <span className="font-bold text-sm uppercase">Modo de Impressão</span>
               </div>
               <div className="flex gap-2">
                 <button onClick={handlePrint} className="bg-red-600 text-white px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-colors">Exportar PDF</button>
                 <button onClick={() => setShowReport(false)} className="bg-gray-200 text-black px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-gray-300 transition-colors">Fechar</button>
               </div>
            </div>

            <div className="p-12 space-y-8">
               {/* Report Header */}
               <div className="border-b-2 border-red-500 pb-6 flex justify-between items-end">
                  <div>
                    <h1 className="text-4xl font-black uppercase italic tracking-tighter text-black mb-2">Prescreve<span className="text-red-600">AI</span></h1>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-[0.3em]">Relatório de Alta Performance</p>
                  </div>
                  <div className="text-right">
                    <h2 className="text-2xl font-bold text-gray-900">{db.students[currentStudentName]?.profile.name}</h2>
                    <p className="text-sm text-gray-500">Data: {new Date().toLocaleDateString('pt-BR')}</p>
                  </div>
               </div>

               {/* Timeline Info (Renewals) */}
               <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 grid grid-cols-3 gap-6">
                  <div>
                     <span className="block text-[10px] font-black uppercase text-gray-400 mb-1">Início</span>
                     <span className="text-lg font-bold">{new Date(db.students[currentStudentName]?.profile.startDate).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div>
                     <span className="block text-[10px] font-black uppercase text-gray-400 mb-1">Volume</span>
                     <span className="text-lg font-bold">{db.students[currentStudentName]?.profile.plannedSessions} Treinos</span>
                  </div>
                  <div>
                     <span className="block text-[10px] font-black uppercase text-gray-400 mb-1">Renovação Estimada</span>
                     <span className="text-lg font-bold text-red-600">
                       {calculateRenewalDate(db.students[currentStudentName]?.profile)?.toLocaleDateString('pt-BR') || "N/A"}
                     </span>
                  </div>
               </div>

               {/* Periodization Content */}
               <div className="space-y-6">
                 <div className="bg-black text-white p-6 rounded-2xl">
                    <h3 className="text-xs font-black text-red-500 uppercase mb-3 tracking-widest">Macro-Estratégia</h3>
                    <p className="text-lg italic leading-relaxed">"{db.students[currentStudentName]?.periodization?.summary}"</p>
                 </div>

                 <div className="space-y-4">
                    <h3 className="text-lg font-black uppercase tracking-tighter border-b border-gray-200 pb-2">Cronograma de Microciclos</h3>
                    {db.students[currentStudentName]?.periodization?.microcycles?.map((micro, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                         <div className="col-span-3 border-r border-gray-200">
                            <span className="text-red-600 font-black text-xl block">{micro.range}</span>
                            <span className="text-[10px] font-bold uppercase text-gray-400">{micro.focus}</span>
                         </div>
                         <div className="col-span-9 grid grid-cols-3 gap-4">
                            <div>
                               <span className="block text-[10px] font-bold text-gray-400 uppercase">Método</span>
                               <span className="font-bold text-sm">{micro.method}</span>
                            </div>
                            <div>
                               <span className="block text-[10px] font-bold text-gray-400 uppercase">Intensidade</span>
                               <span className="font-bold text-sm">{micro.intensity}</span>
                            </div>
                            <div>
                               <span className="block text-[10px] font-bold text-gray-400 uppercase">Volume</span>
                               <span className="font-bold text-sm">{micro.volume}</span>
                            </div>
                            <div className="col-span-3 text-xs text-gray-600 italic bg-white p-2 rounded border border-gray-100 mt-1">
                               Obs: {micro.notes}
                            </div>
                         </div>
                      </div>
                    ))}
                 </div>
               </div>
               
               {/* Workouts Summary (Compact List) */}
               <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-black uppercase tracking-tighter mb-4">Estrutura de Treino Atual</h3>
                  <div className="grid grid-cols-2 gap-6">
                     {SERIES_OPTIONS.map(series => {
                        const workout = db.students[currentStudentName]?.workouts[series];
                        if (!workout || workout.length === 0) return null;
                        return (
                          <div key={series} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm break-inside-avoid">
                             <h4 className="font-black text-red-600 mb-3 border-b border-gray-100 pb-1">Série {series}</h4>
                             <ul className="space-y-2">
                               {workout.map((ex, i) => (
                                 <li key={i} className="text-xs flex justify-between">
                                    <span className="font-bold text-gray-800 w-2/3">{ex.name}</span>
                                    <span className="text-gray-500">{ex.sets}x{ex.reps}</span>
                                 </li>
                               ))}
                             </ul>
                          </div>
                        );
                     })}
                  </div>
               </div>

               {/* References & Safety */}
               <div className="grid grid-cols-2 gap-8 pt-8 border-t border-gray-200">
                  <div>
                     <h4 className="text-[10px] font-black uppercase text-gray-400 mb-2">Referências Científicas</h4>
                     <ul className="list-disc list-inside space-y-1">
                        {db.students[currentStudentName]?.periodization?.references?.map((ref, i) => (
                           <li key={i} className="text-[10px] text-gray-600">{ref}</li>
                        ))}
                     </ul>
                  </div>
                  <div>
                     <h4 className="text-[10px] font-black uppercase text-gray-400 mb-2">Notas Clínicas</h4>
                     <div className="flex flex-wrap gap-2">
                        {db.students[currentStudentName]?.periodization?.clinicalNotes?.map((note, i) => (
                           <span key={i} className="bg-red-50 text-red-800 px-2 py-1 rounded text-[10px] font-bold border border-red-100">{note}</span>
                        ))}
                     </div>
                  </div>
               </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;