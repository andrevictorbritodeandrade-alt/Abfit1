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
  Save
} from 'lucide-react';
import { EXERCISE_DATABASE, MUSCLE_GROUPS, GEMINI_MODEL, IMAGEN_MODEL } from './constants';
import { StudentProfile, PeriodizationData, ExerciseDetails, BrainResult, AppView, PrescribedExercise } from './types';

// Initialize the Google GenAI SDK
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const INITIAL_STUDENTS = [
  { name: "André Brito" },
  { name: "Liliane Torres" },
  { name: "Marcelly Bispo" }
];

const App = () => {
  // Navigation State
  const [view, setView] = useState<AppView>('teacher-login');
  const [professorName, setProfessorName] = useState("André Brito");

  // PWA State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // Workspace State
  const [selectedMuscle, setSelectedMuscle] = useState("");
  const [exerciseOptions, setExerciseOptions] = useState<string[]>([]); 
  const [selectedExercise, setSelectedExercise] = useState<ExerciseDetails | null>(null);
  const [exerciseImage, setExerciseImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [isPlaying] = useState(true);

  // Workout Construction State
  const [workoutName, setWorkoutName] = useState("TREINO A");
  const [workout, setWorkout] = useState<PrescribedExercise[]>([]);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showWorkoutList, setShowWorkoutList] = useState(false);
  const [showGlobalSettings, setShowGlobalSettings] = useState(false);
  
  // State for Editing
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);

  // Default Configuration (Global)
  const [defaultConfig, setDefaultConfig] = useState({
    sets: "3",
    reps: "10-12",
    rest: "60s",
    technique: "Normal",
    observation: ""
  });

  // Current Config being edited/added
  const [exerciseConfig, setExerciseConfig] = useState(defaultConfig);

  // Gemini States
  const [bioInsight, setBioInsight] = useState("");
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  const [technicalCue, setTechnicalCue] = useState("");
  const [isGeneratingCue, setIsGeneratingCue] = useState(false);

  // Anamnese States
  const [showAnamnesis, setShowAnamnesis] = useState(false);
  const [studentProfile, setStudentProfile] = useState<StudentProfile>({
    name: "", age: "", height: "", weight: "",
    objectives: "", neurodivergence: "", medicalHistory: "",
    bariatric: false, medications: "", exercisePreference: "Gosta",
    otherActivities: "", trainingSchedule: "", sessionDuration: "",
    goalTimeline: ""
  });

  // Periodization States
  const [isConsulting, setIsConsulting] = useState(false);
  const [periodizationData, setPeriodizationData] = useState<PeriodizationData | null>(null);
  const [showReport, setShowReport] = useState(false);

  const detailSectionRef = useRef<HTMLDivElement>(null);

  const animationStyles = `
    @keyframes biomechanicalVideo {
      0% { transform: scale(1) translateY(0); filter: brightness(1) contrast(1); }
      40% { transform: scale(1.05) translateY(-5px); filter: brightness(1.1) contrast(1.1); }
      60% { transform: scale(1.05) translateY(-5px); filter: brightness(1.1) contrast(1.1); }
      100% { transform: scale(1) translateY(0); filter: brightness(1) contrast(1); }
    }
    .video-motion-engine { animation: biomechanicalVideo 5s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
  `;

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
      setExerciseOptions(EXERCISE_DATABASE[selectedMuscle]);
    } else {
      setExerciseOptions([]);
    }
  }, [selectedMuscle]);

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
    setPeriodizationData(null);
    setWorkout([]); 
    setWorkoutName("TREINO A");
    
    // Set student
    setStudentProfile(prev => ({ ...prev, name: name }));
    setView('workspace');
    
    // Prompt to check anamnesis
    setShowAnamnesis(true);
  };

  const handleBackToStudents = () => {
    setView('student-list');
  };

  // --- Workout Management Handlers ---
  
  // Open modal to Add New Exercise (using defaults)
  const handleOpenConfigAdd = () => {
    setExerciseConfig({ ...defaultConfig }); // Load defaults
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
    
    // If editing from the list, we might want to ensure the "selectedExercise" context matches visually,
    // but primarily we just need the modal to be open.
    // For visual consistency, let's just open the modal.
    setShowConfigModal(true);
  };

  const handleConfirmAddOrUpdate = () => {
    if (editingExerciseId) {
      // UPDATE EXISTING
      setWorkout(prev => prev.map(item => 
        item.id === editingExerciseId 
        ? { 
            ...item, 
            sets: exerciseConfig.sets,
            reps: exerciseConfig.reps,
            rest: exerciseConfig.rest,
            technique: exerciseConfig.technique,
            observation: exerciseConfig.observation
          } 
        : item
      ));
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
      setWorkout(prev => [...prev, newExercise]);
    }
    
    setShowConfigModal(false);
    setEditingExerciseId(null);
  };

  const handleRemoveExercise = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening edit modal
    setWorkout(prev => prev.filter(item => item.id !== id));
  };

  const cycleWorkoutName = () => {
    const names = ["TREINO A", "TREINO B", "TREINO C", "TREINO D", "TREINO E"];
    const currentIndex = names.indexOf(workoutName);
    const nextIndex = (currentIndex + 1) % names.length;
    setWorkoutName(names[nextIndex]);
  };

  // --- Gemini Functions ---
  const generateBioInsight = async () => {
    if (!studentProfile.name) return;
    setIsGeneratingInsight(true);
    setBioInsight("");
    
    const prompt = `Analise: Aluno: ${studentProfile.name}, TEA/TDAH: ${studentProfile.neurodivergence}, Bariátrica: ${studentProfile.bariatric ? 'Sim' : 'Não'}. Forneça 3 dicas curtas de segurança e foco para o treinador.`;
    
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
    
    const prompt = `Dica biomecânica rápida para: "${exerciseName}". Considere perfil: ${studentProfile.neurodivergence || 'padrão'}.`;
    
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
    
    const prompt = `PhD em Fisiologia: Periodize para ${studentProfile.name}. Objetivos: ${studentProfile.objectives}. TEA/TDAH: ${studentProfile.neurodivergence}.`;
    
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
              clinicalNotes: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["summary", "macrocycle", "clinicalNotes"]
          }
        }
      });
      
      const jsonText = response.text;
      if (jsonText) {
        setPeriodizationData(JSON.parse(jsonText));
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
        const imagenResponse = await ai.models.generateImages({
          model: IMAGEN_MODEL,
          prompt: brainResult.visualPrompt,
          config: {
            numberOfImages: 1,
            aspectRatio: '16:9',
            outputMimeType: 'image/jpeg'
          }
        });

        const base64Image = imagenResponse.generatedImages?.[0]?.image?.imageBytes;
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

        <main className="max-w-7xl mx-auto px-6 py-12">
           <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-12 flex items-center gap-3">
             <Users className="w-8 h-8 text-red-500" />
             Meus Alunos
           </h1>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {INITIAL_STUDENTS.map((student, idx) => (
                <button 
                  key={idx}
                  onClick={() => handleSelectStudent(student.name)}
                  className="bg-neutral-900/50 border border-white/10 p-8 rounded-[2.5rem] hover:bg-neutral-900 hover:border-red-500/50 transition-all group text-left relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transition-opacity">
                     <ChevronRight className="w-6 h-6 text-red-500" />
                  </div>
                  <div className="h-16 w-16 rounded-2xl bg-neutral-950 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-white/5 group-hover:border-red-500/30">
                     <Users className="w-6 h-6 text-neutral-400 group-hover:text-red-500" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{student.name}</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 group-hover:text-red-400">Acessar Prontuário</p>
                </button>
              ))}
              
              <button className="bg-transparent border-2 border-dashed border-white/10 p-8 rounded-[2.5rem] hover:border-red-500/30 hover:bg-red-500/5 transition-all flex flex-col items-center justify-center gap-4 text-neutral-500 hover:text-red-500 h-full min-h-[240px]">
                 <Plus className="w-8 h-8" />
                 <span className="text-[10px] font-black uppercase tracking-widest">Novo Cadastro</span>
              </button>
           </div>
        </main>
      </div>
    );
  }

  // --- Workspace View (Existing App Logic wrapped) ---
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
            
            {/* Workout Name Selector */}
            <button onClick={cycleWorkoutName} className="flex flex-col group cursor-pointer">
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-red-500 group-hover:text-red-400 transition-colors">Ficha de Treino</span>
              <span className="font-bold leading-none flex items-center gap-2">
                {workoutName} <Edit3 className="w-3 h-3 text-neutral-600 group-hover:text-white" />
              </span>
            </button>
          </div>
          <div className="flex gap-3">
            {/* Global Settings Button */}
            <button 
              onClick={() => setShowGlobalSettings(true)}
              className="bg-white/5 hover:bg-white/10 p-2.5 rounded-full transition-colors border border-white/10 text-neutral-400 hover:text-white"
              title="Configurar Padrão (Séries/Reps)"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button 
              onClick={() => setShowWorkoutList(true)} 
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] px-5 py-2.5 rounded-full border border-white/10 hover:bg-white/10 transition-all text-white"
            >
              <Dumbbell className="w-3 h-3" /> Treino ({workout.length})
            </button>
            
            {periodizationData && (
              <button onClick={() => setShowReport(true)} className="hidden md:flex items-center gap-2 text-[10px] font-black text-red-500 uppercase tracking-[0.2em] bg-red-500/10 px-5 py-2.5 rounded-full border border-red-500/20">
                <FileText className="w-3 h-3" /> Relatório
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <aside className="lg:col-span-4 space-y-6">
          {bioInsight && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-[2rem] p-6 shadow-xl animate-in slide-in-from-left-4">
              <div className="flex items-center gap-2 mb-4">
                 <Sparkles className="w-4 h-4 text-red-500" />
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">Bio-Insight ✨</span>
              </div>
              <div className="text-[11px] text-neutral-300 leading-relaxed italic whitespace-pre-wrap">
                {bioInsight}
              </div>
            </div>
          )}

          <div className="bg-neutral-900/40 p-6 rounded-[2.5rem] border border-white/5 shadow-2xl sticky top-24 backdrop-blur-md">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500 mb-6 flex items-center gap-2">
              <Target className="w-4 h-4 text-red-500" /> Inventário Prescrito
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
                  <div className="grid grid-cols-1 gap-2 max-h-[50vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-red-500/20">
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
          {!selectedExercise && !isConsulting && (
            <div className="h-full min-h-[550px] flex flex-col items-center justify-center text-neutral-700 border-2 border-dashed border-white/5 rounded-[3rem] bg-neutral-950/20">
              <Video className="w-16 h-16 opacity-10 mb-6" />
              <p className="font-black uppercase tracking-[0.4em] text-[10px] text-red-500 text-center px-8">Selecione um exercício para ver a biomecânica 8K analisada por IA</p>
            </div>
          )}

          {isConsulting && (
            <div className="h-full min-h-[550px] flex flex-col items-center justify-center text-neutral-700 bg-neutral-950/20 rounded-[3rem]">
               <Loader2 className="w-12 h-12 animate-spin text-red-500 mb-4" />
               <p className="text-[10px] uppercase tracking-widest text-neutral-500">Gerando Periodização para {studentProfile.name}...</p>
            </div>
          )}

          {selectedExercise && !isConsulting && (
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
                  <div className="flex justify-between items-start mb-10">
                    <h2 className="text-5xl font-black uppercase italic tracking-tighter text-white leading-none max-w-lg">{selectedExercise.name}</h2>
                    
                    {/* Container do Botão Lâmpada + Sinal de + */}
                    <div className="flex flex-col items-center gap-3">
                      <button 
                        onClick={() => generateTechnicalCue(selectedExercise.name)}
                        disabled={isGeneratingCue}
                        className="bg-red-500 p-4 rounded-2xl hover:scale-105 transition-all shadow-lg shadow-red-500/30 group"
                        title="Dica IA"
                      >
                        {isGeneratingCue ? <Loader2 className="w-6 h-6 animate-spin text-black" /> : <Lightbulb className="w-6 h-6 text-black group-hover:fill-black" />}
                      </button>
                      
                      <button 
                        onClick={handleOpenConfigAdd}
                        className="bg-white/10 p-3 rounded-full hover:bg-red-500 hover:text-black transition-all border border-white/10 group shadow-lg"
                        title="Adicionar ao Treino"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {technicalCue && (
                    <div className="mb-10 p-6 bg-white/5 border border-red-500/30 rounded-3xl animate-in zoom-in-95">
                      <div className="flex items-center gap-2 mb-3 text-red-500">
                         <Zap className="w-3 h-3 fill-red-500" />
                         <span className="text-[10px] font-black uppercase tracking-[0.3em]">Dica IA ✨</span>
                      </div>
                      <p className="text-sm text-neutral-200 italic leading-relaxed font-medium">"{technicalCue}"</p>
                    </div>
                  )}

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

      {/* MODALS AREA */}

      {/* Modal de Configuração Global (Padrões) */}
      {showGlobalSettings && (
        <div className="fixed inset-0 z-[130] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-neutral-900 border border-white/10 w-full max-w-sm rounded-[2.5rem] p-8 shadow-3xl animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                   <Settings className="w-5 h-5 text-red-500"/> Padrão do Treino
                </h3>
                <button onClick={() => setShowGlobalSettings(false)} className="text-neutral-500 hover:text-white"><X className="w-5 h-5"/></button>
              </div>
              <p className="text-xs text-neutral-500 mb-4">Defina os valores que serão carregados automaticamente ao adicionar novos exercícios.</p>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-neutral-500">Séries Padrão</label>
                      <input className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-center font-bold outline-none focus:border-red-500" value={defaultConfig.sets} onChange={(e) => setDefaultConfig({...defaultConfig, sets: e.target.value})} />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-neutral-500">Reps Padrão</label>
                      <input className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-center font-bold outline-none focus:border-red-500" value={defaultConfig.reps} onChange={(e) => setDefaultConfig({...defaultConfig, reps: e.target.value})} />
                   </div>
                </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-neutral-500">Descanso Padrão</label>
                    <input className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-center font-bold outline-none focus:border-red-500" value={defaultConfig.rest} onChange={(e) => setDefaultConfig({...defaultConfig, rest: e.target.value})} />
                 </div>
                 <button onClick={() => setShowGlobalSettings(false)} className="w-full py-3 bg-red-500 text-black font-black uppercase tracking-widest rounded-xl mt-2">Salvar Padrão</button>
              </div>
           </div>
        </div>
      )}
      
      {/* Modal de Configuração de Exercício (Adicionar/Editar) */}
      {showConfigModal && (
        <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-white/10 w-full max-w-lg rounded-[2.5rem] p-8 shadow-3xl animate-in zoom-in-95">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">{editingExerciseId ? 'Editar Exercício' : 'Adicionar à Série'}</h3>
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
                      <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">{workoutName}</h2>
                      <p className="text-[10px] text-neutral-500 font-bold">{workout.length} Exercícios</p>
                    </div>
                 </div>
                 <button onClick={() => setShowWorkoutList(false)} className="bg-white/5 hover:bg-white/10 p-2 rounded-full transition-colors"><X className="w-5 h-5 text-white" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                 {workout.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center text-neutral-600 gap-4">
                      <Dumbbell className="w-12 h-12 opacity-20" />
                      <p className="text-xs uppercase tracking-widest font-bold">Nenhum exercício adicionado</p>
                   </div>
                 ) : (
                   workout.map((item, idx) => (
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

      {/* Modal de Relatório */}
      {showReport && periodizationData && (
        <div className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6">
          <div className="bg-neutral-900 border border-white/10 w-full max-w-5xl h-[85vh] rounded-[3.5rem] overflow-hidden flex flex-col shadow-3xl animate-in zoom-in-95">
            <div className="p-10 border-b border-white/5 bg-neutral-950 flex justify-between items-center">
              <div className="flex items-center gap-4 text-red-500">
                <TrendingUp className="w-6 h-6" />
                <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-none text-white">Relatório Científico</h2>
              </div>
              <button onClick={() => setShowReport(false)} className="bg-white text-black px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 transition-all">Fechar</button>
            </div>
            <div className="flex-1 overflow-y-auto p-12 scrollbar-thin scrollbar-thumb-red-500/20">
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 bg-black/40 p-8 rounded-[2rem] border border-white/5">
                    <h3 className="text-xs font-black text-red-500 uppercase mb-4 tracking-widest">Estratégia Geral</h3>
                    <p className="text-neutral-200 text-lg italic mb-6 leading-relaxed">"{periodizationData.summary}"</p>
                    <div className="text-sm text-neutral-400 leading-loose whitespace-pre-wrap">{periodizationData.macrocycle}</div>
                  </div>
                  <div className="bg-red-500/5 p-8 rounded-[2rem] border border-red-500/20">
                    <h3 className="text-xs font-black text-red-500 uppercase mb-6 tracking-widest">Segurança Clínica</h3>
                    <ul className="space-y-4">
                      {periodizationData.clinicalNotes.map((note, idx) => (
                        <li key={idx} className="flex gap-3 text-sm text-neutral-300">
                          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                          <span>{note}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Anamnese */}
      {showAnamnesis && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-white/10 w-full max-w-4xl max-h-[90vh] rounded-[3.5rem] overflow-hidden flex flex-col shadow-3xl animate-in zoom-in-95">
            <div className="p-10 border-b border-white/5 flex justify-between items-center bg-neutral-950">
              <div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">Anamnese de Precisão</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-red-500">{studentProfile.name}</p>
              </div>
              <button onClick={() => setShowAnamnesis(false)} className="text-neutral-500 hover:text-white transition-colors text-xs font-black uppercase tracking-widest">Salvar e Sair</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-12 grid grid-cols-1 md:grid-cols-2 gap-10 scrollbar-thin scrollbar-thumb-red-500/20">
              <div className="space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500">Dados Antropométricos</h3>
                <div className="grid grid-cols-3 gap-3">
                   <input placeholder="Idade" className="bg-black border border-white/5 rounded-2xl p-5 text-sm outline-none focus:border-red-500 text-white" value={studentProfile.age} onChange={e => setStudentProfile({...studentProfile, age: e.target.value})} />
                   <input placeholder="cm" className="bg-black border border-white/5 rounded-2xl p-5 text-sm outline-none focus:border-red-500 text-white" value={studentProfile.height} onChange={e => setStudentProfile({...studentProfile, height: e.target.value})} />
                   <input placeholder="kg" className="bg-black border border-white/5 rounded-2xl p-5 text-sm outline-none focus:border-red-500 text-white" value={studentProfile.weight} onChange={e => setStudentProfile({...studentProfile, weight: e.target.value})} />
                </div>
                <textarea placeholder="Objetivos do aluno (Ex: Hipertrofia, emagrecimento, correção postural)..." className="w-full bg-black border border-white/5 rounded-2xl p-5 text-sm h-28 outline-none focus:border-red-500 text-white resize-none" value={studentProfile.objectives} onChange={e => setStudentProfile({...studentProfile, objectives: e.target.value})} />
              </div>
              <div className="space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500">Saúde e Neuro</h3>
                <input placeholder="Neurodivergência (TEA/TDAH/Nenhuma)?" className="w-full bg-black border border-white/5 rounded-2xl p-5 text-sm outline-none focus:border-red-500 text-white" value={studentProfile.neurodivergence} onChange={e => setStudentProfile({...studentProfile, neurodivergence: e.target.value})} />
                <input placeholder="Histórico Médico / Lesões?" className="w-full bg-black border border-white/5 rounded-2xl p-5 text-sm outline-none focus:border-red-500 text-white" value={studentProfile.medicalHistory} onChange={e => setStudentProfile({...studentProfile, medicalHistory: e.target.value})} />
                <div className="flex items-center justify-between bg-black p-5 rounded-2xl border border-white/5">
                  <span className="text-[10px] text-neutral-500 font-black uppercase">Fez Bariátrica?</span>
                  <button className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${studentProfile.bariatric ? 'bg-red-500 text-black shadow-lg shadow-red-500/20' : 'bg-white/5 text-neutral-700'}`} onClick={() => setStudentProfile({...studentProfile, bariatric: !studentProfile.bariatric})}>{studentProfile.bariatric ? 'SIM' : 'NÃO'}</button>
                </div>
              </div>
            </div>
            <div className="p-10 border-t border-white/5 bg-neutral-950">
              <button onClick={generatePeriodization} className="w-full py-6 bg-red-500 text-black font-black uppercase tracking-[0.2em] rounded-[1.5rem] hover:bg-white transition-all shadow-2xl text-xs">Gerar Periodização Científica ✨</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;