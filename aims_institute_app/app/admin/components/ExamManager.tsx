'use client';
import React, { useState } from 'react';
import { BrainCircuit, Edit3, ArrowLeft, Settings, Sparkles, Layers } from 'lucide-react';
import { adminApi } from '../services/adminApi';

interface ExamManagerProps {
  batches: any[];
  onRefresh: () => void;
  onSelectForManual: (examId: string) => void;
  onReviewGenerated: (examId: string, questions: any[]) => void;
}

// SYLLABUS DATA
const SYLLABUS = {
    "Physics 11": [
        "Physical World and Measurement", "Kinematics", "Laws of Motion", "Work, Energy, and Power", 
        "Rotational Motion", "Gravitation", "Properties of Solids and Liquids", "Thermodynamics", 
        "Kinetic Theory of Gases", "Oscillations and Waves"
    ],
    "Chemistry 11": [
        "Some Basic Concepts of Chemistry", "Structure of Atom", "Classification of Elements and Periodicity", 
        "Chemical Bonding and Molecular Structure", "States of Matter", "Chemical Thermodynamics", 
        "Equilibrium", "Redox Reactions", "Hydrogen", "s-Block Elements", "p-Block Elements", 
        "Organic Chemistry: Basic Principles", "Hydrocarbons", "Environmental Chemistry"
    ],
    "Maths 11": [
        "Sets, Relations, and Functions", "Trigonometry", "Complex Numbers and Quadratic Equations", 
        "Linear Inequalities", "Permutations and Combinations", "Binomial Theorem", "Sequence and Series", 
        "Straight Lines", "Conic Sections", "Introduction to 3D Geometry", "Limits and Derivatives", 
        "Statistics and Probability"
    ],
    "Physics 12": [
        "Electrostatics", "Current Electricity", "Magnetic Effects of Current and Magnetism", 
        "EMI and AC", "Optics", "Modern Physics", "Electronic Devices", "Communication Systems"
    ],
    "Chemistry 12": [
        "Solid State", "Solutions", "Electrochemistry", "Chemical Kinetics", "Surface Chemistry", 
        "Metallurgy", "p-Block Elements", "d- and f-Block Elements", "Coordination Compounds", 
        "Haloalkanes and Haloarenes", "Alcohols, Phenols and Ethers", "Aldehydes, Ketones and Carboxylic Acids", 
        "Amines", "Biomolecules", "Polymers", "Chemistry in Everyday Life"
    ],
    "Maths 12": [
        "Relations and Functions", "Inverse Trigonometric Functions", "Matrices and Determinants", 
        "Continuity and Differentiability", "Applications of Derivatives", "Integrals", 
        "Application of Integrals", "Differential Equations", "Vectors and 3D Geometry", "Probability"
    ]
};

export default function ExamManager({ batches, onRefresh, onSelectForManual, onReviewGenerated }: ExamManagerProps) {
  const [examCreationMode, setExamCreationMode] = useState<'SELECT' | 'AI_FORM' | 'MANUAL_FORM'>('SELECT');
  const [newExam, setNewExam] = useState({ title: '', examType: '', totalMarks: 300, durationMin: 180, scheduledAt: '', batchId: '' });
  
  // SHARED STATE: Exam Level (Used for both AI and Manual)
  const [examLevel, setExamLevel] = useState<'JEE_MAINS' | '11TH' | '12TH'>('JEE_MAINS');

  const [aiConfig, setAiConfig] = useState({ 
      difficulty: 'medium', 
      physics_mcq: 10, physics_integer: 5, 
      chemistry_mcq: 10, chemistry_integer: 5, 
      mathematics_mcq: 10, mathematics_integer: 5, 
      image_ratio: 0.1,
  });
  
  // Topic Selection State
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [activeSubject, setActiveSubject] = useState<keyof typeof SYLLABUS>('Physics 11');

  const glassPanel = "bg-white border border-slate-200 shadow-sm rounded-xl transition-all duration-300";
  const inputStyle = "w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none transition";
  const labelStyle = "block text-[10px] font-bold text-slate-500 uppercase mb-1";

  // Filter Syllabus based on Exam Level
  const getFilteredSubjects = () => {
      const allSubjects = Object.keys(SYLLABUS);
      if (examLevel === '11TH') return allSubjects.filter(s => s.includes('11'));
      if (examLevel === '12TH') return allSubjects.filter(s => s.includes('12'));
      return allSubjects; // JEE MAINS includes both
  };

  const handleLevelChange = (level: 'JEE_MAINS' | '11TH' | '12TH') => {
      setExamLevel(level);
      setSelectedTopics([]); // Reset topics
      if (level === '11TH') setActiveSubject('Physics 11');
      else if (level === '12TH') setActiveSubject('Physics 12');
      else setActiveSubject('Physics 11');
  };

  const toggleTopic = (topic: string) => {
      setSelectedTopics(prev => prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]);
  };

  const handleCreateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // FIX: Convert local HTML datetime string to Absolute UTC ISO String based on browser's local timezone
      const isoScheduledAt = new Date(newExam.scheduledAt).toISOString();

      const createdExam = await adminApi.createExam({ 
          ...newExam, 
          scheduledAt: isoScheduledAt,
          subject: 'Combined', 
          examType: 'MANUAL',
          tags: [examLevel] 
      });
      onRefresh();
      setNewExam({ title: '', examType: '', totalMarks: 300, durationMin: 180, scheduledAt: '', batchId: '' });
      onSelectForManual(createdExam.id);
      setExamCreationMode('SELECT'); 
    } catch (e) { alert("Failed to create draft"); }
  };

  const handleGenerateAI = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // FIX: Convert local HTML datetime string to Absolute UTC ISO String based on browser's local timezone
      const isoScheduledAt = new Date(newExam.scheduledAt).toISOString();

      const createdExam = await adminApi.createExam({ 
          ...newExam, 
          scheduledAt: isoScheduledAt,
          subject: 'Combined', 
          examType: 'AI_GENERATED',
          tags: [examLevel] 
      });
      
      let topicsString = "";

      // Explicitly listing all chapters if none selected
      if (selectedTopics.length > 0) {
          topicsString = selectedTopics.join(', ');
      } else {
          // Flatten all relevant chapters into a single string
          let targetKeys: (keyof typeof SYLLABUS)[] = [];

          if (examLevel === '11TH') {
              targetKeys = ['Physics 11', 'Chemistry 11', 'Maths 11'];
          } else if (examLevel === '12TH') {
              targetKeys = ['Physics 12', 'Chemistry 12', 'Maths 12'];
          } else {
              // JEE MAINS (Both 11th and 12th)
              targetKeys = [
                  'Physics 11', 'Chemistry 11', 'Maths 11',
                  'Physics 12', 'Chemistry 12', 'Maths 12'
              ];
          }

          const allChapters = targetKeys.flatMap(key => SYLLABUS[key] || []);
          topicsString = allChapters.join(', ');
      }

      const aiPayload = { 
          difficulty: aiConfig.difficulty,
          title: newExam.title,
          physics_mcq: Number(aiConfig.physics_mcq),
          physics_integer: Number(aiConfig.physics_integer),
          chemistry_mcq: Number(aiConfig.chemistry_mcq),
          chemistry_integer: Number(aiConfig.chemistry_integer),
          mathematics_mcq: Number(aiConfig.mathematics_mcq),
          mathematics_integer: Number(aiConfig.mathematics_integer),
          image_ratio: Number(aiConfig.image_ratio),
          topics: topicsString
      };
      
      const aiRes = await adminApi.generateAiPaper(aiPayload);
      
      if (aiRes && aiRes.questions) {
        onReviewGenerated(createdExam.id, aiRes.questions);
        setExamCreationMode('SELECT');
        onRefresh();
      }
    } catch (e: any) { alert(`AI Generation Failed: ${e.message}`); }
  };

  return (
    <div className="grid grid-cols-1 gap-8">
       {examCreationMode === 'SELECT' && (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[600px]">
           <div onClick={() => setExamCreationMode('AI_FORM')} className={`${glassPanel} p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-xl hover:border-amber-400 group transition`}>
             <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition"><BrainCircuit size={40} className="text-amber-600"/></div>
             <h3 className="text-2xl font-bold text-slate-800 mb-2">Auto Create Exam Paper</h3>
             <p className="text-slate-500 max-w-xs">Use AI to generate a complete exam paper instantly by specifying subjects, difficulty, and topics.</p>
             <span className="mt-4 px-3 py-1 bg-amber-200 text-amber-800 text-xs font-bold rounded-full flex items-center gap-1"><Sparkles size={12}/> AI Powered</span>
           </div>
           <div onClick={() => setExamCreationMode('MANUAL_FORM')} className={`${glassPanel} p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-xl hover:border-blue-400 group transition`}>
             <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition"><Edit3 size={40} className="text-blue-600"/></div>
             <h3 className="text-2xl font-bold text-slate-800 mb-2">Manual Builder</h3>
             <p className="text-slate-500 max-w-xs">Create a draft and manually select questions from the repository using smart filters.</p>
           </div>
         </div>
       )}

       {examCreationMode === 'AI_FORM' && (
         <div className={`${glassPanel} p-8 max-w-5xl mx-auto w-full`}>
           <div className="flex items-center gap-4 mb-6 border-b border-slate-200 pb-4">
             <button onClick={() => setExamCreationMode('SELECT')} className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-full transition shadow-sm border border-slate-300">
                <ArrowLeft size={20}/>
             </button>
             <h3 className="text-xl font-bold text-slate-800">Auto Generate Exam</h3>
           </div>
           <form onSubmit={handleGenerateAI} className="space-y-6">
             <div className="grid grid-cols-2 gap-4">
               <div><label className={labelStyle}>Title</label><input className={inputStyle} required value={newExam.title} onChange={e => setNewExam({...newExam, title: e.target.value})} placeholder="e.g. JEE Mock 1"/></div>
               <div><label className={labelStyle}>Batch</label><select className={inputStyle} required value={newExam.batchId} onChange={e => setNewExam({...newExam, batchId: e.target.value})}><option value="">Select Batch</option>{batches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
             </div>
             <div className="grid grid-cols-3 gap-4">
               <div><label className={labelStyle}>Date & Time</label><input type="datetime-local" className={inputStyle} required value={newExam.scheduledAt} onChange={e => setNewExam({...newExam, scheduledAt: e.target.value})}/></div>
               <div><label className={labelStyle}>Duration (m)</label><input type="number" className={inputStyle} value={newExam.durationMin} onChange={e => setNewExam({...newExam, durationMin: +e.target.value})}/></div>
               <div><label className={labelStyle}>Total Marks</label><input type="number" className={inputStyle} value={newExam.totalMarks} onChange={e => setNewExam({...newExam, totalMarks: +e.target.value})}/></div>
             </div>
             
             <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                 <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Settings size={16}/> Configuration</h4>
                 
                 <div className="mb-6">
                     <label className={labelStyle}>Target Exam Level</label>
                     <div className="flex gap-4">
                         <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition ${examLevel === 'JEE_MAINS' ? 'bg-amber-100 border-amber-500 text-amber-800 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                             <input type="radio" name="level" className="hidden" checked={examLevel === 'JEE_MAINS'} onChange={() => handleLevelChange('JEE_MAINS')} />
                             <Layers size={16}/> JEE Mains
                         </label>
                         <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition ${examLevel === '11TH' ? 'bg-amber-100 border-amber-500 text-amber-800 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                             <input type="radio" name="level" className="hidden" checked={examLevel === '11TH'} onChange={() => handleLevelChange('11TH')} />
                             <Layers size={16}/> Class 11th
                         </label>
                         <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition ${examLevel === '12TH' ? 'bg-amber-100 border-amber-500 text-amber-800 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                             <input type="radio" name="level" className="hidden" checked={examLevel === '12TH'} onChange={() => handleLevelChange('12TH')} />
                             <Layers size={16}/> Class 12th
                         </label>
                     </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                     <div>
                        <label className={labelStyle}>Difficulty</label>
                        <select className={inputStyle} value={aiConfig.difficulty} onChange={e=>setAiConfig({...aiConfig, difficulty: e.target.value})}>
                            <option value="medium">Medium</option>
                            <option value="easy">Easy</option>
                            <option value="hard">Hard</option>
                        </select>
                     </div>
                     <div>
                        <label className={labelStyle}>Phys (MCQ/Int)</label>
                        <div className="flex gap-2">
                            <input type="number" className={inputStyle} value={aiConfig.physics_mcq} onChange={e=>setAiConfig({...aiConfig, physics_mcq: +e.target.value})}/>
                            <input type="number" className={inputStyle} value={aiConfig.physics_integer} onChange={e=>setAiConfig({...aiConfig, physics_integer: +e.target.value})}/>
                        </div>
                     </div>
                     <div>
                        <label className={labelStyle}>Chem (MCQ/Int)</label>
                        <div className="flex gap-2">
                            <input type="number" className={inputStyle} value={aiConfig.chemistry_mcq} onChange={e=>setAiConfig({...aiConfig, chemistry_mcq: +e.target.value})}/>
                            <input type="number" className={inputStyle} value={aiConfig.chemistry_integer} onChange={e=>setAiConfig({...aiConfig, chemistry_integer: +e.target.value})}/>
                        </div>
                     </div>
                     <div>
                        <label className={labelStyle}>Maths (MCQ/Int)</label>
                        <div className="flex gap-2">
                            <input type="number" className={inputStyle} value={aiConfig.mathematics_mcq} onChange={e=>setAiConfig({...aiConfig, mathematics_mcq: +e.target.value})}/>
                            <input type="number" className={inputStyle} value={aiConfig.mathematics_integer} onChange={e=>setAiConfig({...aiConfig, mathematics_integer: +e.target.value})}/>
                        </div>
                     </div>
                 </div>
                 
                 <div className="border-t border-slate-200 pt-4">
                    <label className={labelStyle}>Syllabus & Topics ({examLevel.replace('_', ' ')})</label>
                    <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
                        {getFilteredSubjects().map(sub => (
                            <button key={sub} type="button" onClick={() => setActiveSubject(sub as any)} className={`px-3 py-1 rounded text-xs font-bold whitespace-nowrap ${activeSubject === sub ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-600'}`}>{sub}</button>
                        ))}
                    </div>
                    <div className="h-40 overflow-y-auto border rounded bg-white p-3 grid grid-cols-3 gap-2 custom-scrollbar">
                        {SYLLABUS[activeSubject] && SYLLABUS[activeSubject].map(topic => (
                            <div key={topic} onClick={() => toggleTopic(topic)} className={`cursor-pointer p-2 rounded text-xs border transition ${selectedTopics.includes(topic) ? 'bg-amber-50 border-amber-500 text-amber-900 font-bold' : 'border-slate-100 text-slate-600'}`}>
                                {topic}
                            </div>
                        ))}
                    </div>
                 </div>
             </div>
             <div className="flex justify-end pt-4"><button className="bg-amber-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-amber-700 shadow-lg flex gap-2"><BrainCircuit/> Generate & Review</button></div>
           </form>
         </div>
       )}

       {examCreationMode === 'MANUAL_FORM' && (
         <div className={`${glassPanel} p-8 max-w-4xl mx-auto w-full`}>
           <div className="flex items-center gap-4 mb-6 border-b border-slate-200 pb-4">
             <button onClick={() => setExamCreationMode('SELECT')} className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-full transition shadow-sm border border-slate-300">
                <ArrowLeft size={20}/>
             </button>
             <h3 className="text-xl font-bold text-slate-800">Create Draft & Select</h3>
           </div>
           <form onSubmit={handleCreateDraft} className="space-y-6">
             <div className="grid grid-cols-2 gap-4">
               <div><label className={labelStyle}>Title</label><input className={inputStyle} required value={newExam.title} onChange={e => setNewExam({...newExam, title: e.target.value})} placeholder="e.g. Unit Test 1"/></div>
               <div><label className={labelStyle}>Batch</label><select className={inputStyle} required value={newExam.batchId} onChange={e => setNewExam({...newExam, batchId: e.target.value})}><option value="">Select Batch</option>{batches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
             </div>
             
             {/* EXAM LEVEL SELECTOR FOR MANUAL FORM */}
             <div>
                 <label className={labelStyle}>Target Exam Level</label>
                 <div className="flex gap-4">
                     <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition ${examLevel === 'JEE_MAINS' ? 'bg-amber-100 border-amber-500 text-amber-800 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                         <input type="radio" name="manual_level" className="hidden" checked={examLevel === 'JEE_MAINS'} onChange={() => handleLevelChange('JEE_MAINS')} />
                         <Layers size={16}/> JEE Mains
                     </label>
                     <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition ${examLevel === '11TH' ? 'bg-amber-100 border-amber-500 text-amber-800 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                         <input type="radio" name="manual_level" className="hidden" checked={examLevel === '11TH'} onChange={() => handleLevelChange('11TH')} />
                         <Layers size={16}/> Class 11th
                     </label>
                     <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition ${examLevel === '12TH' ? 'bg-amber-100 border-amber-500 text-amber-800 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                         <input type="radio" name="manual_level" className="hidden" checked={examLevel === '12TH'} onChange={() => handleLevelChange('12TH')} />
                         <Layers size={16}/> Class 12th
                     </label>
                 </div>
             </div>

             <div className="grid grid-cols-3 gap-4">
               <div><label className={labelStyle}>Date & Time</label><input type="datetime-local" className={inputStyle} required value={newExam.scheduledAt} onChange={e => setNewExam({...newExam, scheduledAt: e.target.value})}/></div>
               <div><label className={labelStyle}>Duration (m)</label><input type="number" className={inputStyle} value={newExam.durationMin} onChange={e => setNewExam({...newExam, durationMin: +e.target.value})}/></div>
               <div><label className={labelStyle}>Total Marks</label><input type="number" className={inputStyle} value={newExam.totalMarks} onChange={e => setNewExam({...newExam, totalMarks: +e.target.value})}/></div>
             </div>
             <div className="flex justify-end pt-4"><button className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg flex gap-2"><Edit3/> Start Selecting</button></div>
           </form>
         </div>
       )}
    </div>
  );
}