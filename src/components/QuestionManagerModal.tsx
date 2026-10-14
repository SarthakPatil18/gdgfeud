import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Download,
  Upload,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Eye,
} from 'lucide-react';
import type { Question, Answer } from '../types';

interface QuestionManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: Question[];
  activeQuestionIndex: number;
  onSaveQuestions: (updatedQuestions: Question[]) => void;
  onSelectActiveQuestion: (index: number) => void;
  onResetRevealState: (questionIndex?: number) => void;
}

export const QuestionManagerModal: React.FC<QuestionManagerModalProps> = ({
  isOpen,
  onClose,
  questions,
  activeQuestionIndex,
  onSaveQuestions,
  onSelectActiveQuestion,
  onResetRevealState,
}) => {
  // Working local copy of questions
  const [bank, setBank] = useState<Question[]>(() => JSON.parse(JSON.stringify(questions)));
  const [selectedIdx, setSelectedIdx] = useState<number>(activeQuestionIndex);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [previewMode, setPreviewMode] = useState<boolean>(false);
  const [deleteConfirmIdx, setDeleteConfirmIdx] = useState<number | null>(null);
  const [resetConfirmType, setResetConfirmType] = useState<'current' | 'all' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync with prop when opened
  const prevIsOpenRef = React.useRef(isOpen);
  React.useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setBank(JSON.parse(JSON.stringify(questions)));
      setSelectedIdx(Math.min(activeQuestionIndex, Math.max(0, questions.length - 1)));
      setHasUnsavedChanges(false);
      setErrorMessage(null);
      setSuccessMessage(null);
      setDeleteConfirmIdx(null);
      setResetConfirmType(null);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, questions, activeQuestionIndex]);

  if (!isOpen) return null;

  const currentQ: Question | undefined = bank[selectedIdx];

  const markChanged = (updatedBank: Question[]) => {
    setBank(updatedBank);
    setHasUnsavedChanges(true);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // Validation
  const validateQuestion = (q: Question): string | null => {
    if (!q.questionText.trim()) {
      return 'Question text cannot be empty.';
    }
    if (!q.roundTitle.trim()) {
      return 'Round title cannot be empty.';
    }
    if (!q.answers || q.answers.length === 0) {
      return 'Question must contain at least one answer.';
    }
    for (let i = 0; i < q.answers.length; i++) {
      const a = q.answers[i];
      if (!a.text.trim()) {
        return `Answer #${i + 1} text cannot be empty.`;
      }
      if (typeof a.points !== 'number' || isNaN(a.points) || a.points < 0) {
        return `Answer #${i + 1} points must be a non-negative number.`;
      }
    }
    return null;
  };

  const validateAllQuestions = (qs: Question[]): string | null => {
    if (qs.length === 0) {
      return 'Question bank cannot be empty.';
    }
    for (let i = 0; i < qs.length; i++) {
      const err = validateQuestion(qs[i]);
      if (err) return `Question ${i + 1}: ${err}`;
    }
    return null;
  };

  // Check for duplicate answers in current question
  const duplicateAnswerWarnings = (): string[] => {
    if (!currentQ) return [];
    const seen = new Set<string>();
    const dupes: string[] = [];
    currentQ.answers.forEach((a) => {
      const norm = a.text.trim().toLowerCase();
      if (norm && seen.has(norm)) {
        dupes.push(a.text);
      }
      seen.add(norm);
    });
    return dupes;
  };

  // Create new question
  const handleCreateQuestion = () => {
    const newQ: Question = {
      id: `q-${Date.now()}`,
      roundTitle: `ROUND ${bank.length + 1} • SINGLE POINTS`,
      multiplier: 1,
      questionText: 'New Question Prompt',
      answers: [
        { id: `a-${Date.now()}-1`, text: 'Answer 1', points: 40, isRevealed: false },
        { id: `a-${Date.now()}-2`, text: 'Answer 2', points: 30, isRevealed: false },
        { id: `a-${Date.now()}-3`, text: 'Answer 3', points: 20, isRevealed: false },
        { id: `a-${Date.now()}-4`, text: 'Answer 4', points: 10, isRevealed: false },
      ],
    };
    const updated = [...bank, newQ];
    markChanged(updated);
    setSelectedIdx(updated.length - 1);
  };

  // Duplicate current question
  const handleDuplicateQuestion = () => {
    if (!currentQ) return;
    const duplicated: Question = {
      ...JSON.parse(JSON.stringify(currentQ)),
      id: `q-${Date.now()}`,
      roundTitle: `${currentQ.roundTitle} (COPY)`,
      answers: currentQ.answers.map((a, i) => ({
        ...a,
        id: `a-${Date.now()}-${i + 1}`,
        isRevealed: false,
        isAwarded: false,
        awardedToTeamId: null,
      })),
    };
    const updated = [...bank.slice(0, selectedIdx + 1), duplicated, ...bank.slice(selectedIdx + 1)];
    markChanged(updated);
    setSelectedIdx(selectedIdx + 1);
  };

  // Delete question
  const handleDeleteQuestion = (idx: number) => {
    if (bank.length <= 1) {
      setErrorMessage('Cannot delete the only question. The bank must have at least one question.');
      setDeleteConfirmIdx(null);
      return;
    }
    const updated = bank.filter((_, i) => i !== idx);
    markChanged(updated);
    setSelectedIdx(Math.max(0, idx - 1));
    setDeleteConfirmIdx(null);
  };

  // Move question
  const handleMoveQuestion = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= bank.length) return;
    const updated = [...bank];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    markChanged(updated);
    setSelectedIdx(targetIdx);
  };

  // Edit current question fields
  const handleUpdateCurrentQ = (patch: Partial<Question>) => {
    if (!currentQ) return;
    const updated = bank.map((q, i) => (i === selectedIdx ? { ...q, ...patch } : q));
    markChanged(updated);
  };

  // Answer operations
  const handleAddAnswer = () => {
    if (!currentQ) return;
    const newAnswer: Answer = {
      id: `a-${Date.now()}-${currentQ.answers.length + 1}`,
      text: `Answer ${currentQ.answers.length + 1}`,
      points: 5,
      isRevealed: false,
    };
    const updatedAnswers = [...currentQ.answers, newAnswer];
    handleUpdateCurrentQ({ answers: updatedAnswers });
  };

  const handleRemoveAnswer = (ansIdx: number) => {
    if (!currentQ || currentQ.answers.length <= 1) {
      setErrorMessage('A question must have at least one answer.');
      return;
    }
    const updatedAnswers = currentQ.answers.filter((_, i) => i !== ansIdx);
    handleUpdateCurrentQ({ answers: updatedAnswers });
  };

  const handleMoveAnswer = (ansIdx: number, direction: 'up' | 'down') => {
    if (!currentQ) return;
    const targetIdx = direction === 'up' ? ansIdx - 1 : ansIdx + 1;
    if (targetIdx < 0 || targetIdx >= currentQ.answers.length) return;
    const updatedAnswers = [...currentQ.answers];
    const temp = updatedAnswers[ansIdx];
    updatedAnswers[ansIdx] = updatedAnswers[targetIdx];
    updatedAnswers[targetIdx] = temp;
    handleUpdateCurrentQ({ answers: updatedAnswers });
  };

  const handleUpdateAnswer = (ansIdx: number, patch: Partial<Answer>) => {
    if (!currentQ) return;
    const updatedAnswers = currentQ.answers.map((a, i) => (i === ansIdx ? { ...a, ...patch } : a));
    handleUpdateCurrentQ({ answers: updatedAnswers });
  };

  // Save changes
  const handleSave = () => {
    const err = validateAllQuestions(bank);
    if (err) {
      setErrorMessage(err);
      return;
    }
    onSaveQuestions(bank);
    setHasUnsavedChanges(false);
    setSuccessMessage('Question bank saved successfully!');
    setTimeout(() => {
      setSuccessMessage(null);
    }, 2500);
  };

  // Export JSON
  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(bank, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `gdg_feud_questions_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!Array.isArray(parsed) || parsed.length === 0) {
          throw new Error('Imported file must contain a non-empty array of questions.');
        }

        // Validate structure
        const validated: Question[] = parsed.map((item, qIdx) => {
          if (!item.questionText || typeof item.questionText !== 'string') {
            throw new Error(`Question ${qIdx + 1} is missing a valid 'questionText'.`);
          }
          if (!Array.isArray(item.answers) || item.answers.length === 0) {
            throw new Error(`Question ${qIdx + 1} must contain at least one answer in 'answers'.`);
          }
          const validAnswers: Answer[] = item.answers.map((ans: Partial<Answer>, aIdx: number) => ({
            id: ans.id || `a-imp-${qIdx}-${aIdx}-${Date.now()}`,
            text: String(ans.text || '').trim(),
            points: typeof ans.points === 'number' && !isNaN(ans.points) ? Math.max(0, ans.points) : 10,
            isRevealed: false,
            isAwarded: false,
            awardedToTeamId: null,
          }));

          return {
            id: item.id || `q-imp-${qIdx}-${Date.now()}`,
            roundTitle: item.roundTitle || `ROUND ${qIdx + 1}`,
            multiplier: typeof item.multiplier === 'number' ? Math.max(1, Math.min(3, item.multiplier)) : 1,
            questionText: item.questionText.trim(),
            answers: validAnswers,
          };
        });

        markChanged(validated);
        setSelectedIdx(0);
        setSuccessMessage(`Successfully imported ${validated.length} questions! Click Save to apply.`);
      } catch (err) {
        setErrorMessage(`Import failed: ${(err as Error).message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const totalPoints = currentQ ? currentQ.answers.reduce((acc, a) => acc + (a.points || 0), 0) : 0;
  const dupes = duplicateAnswerWarnings();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-6xl max-h-[94vh] flex flex-col rounded-3xl bg-[#090e1c] border-2 border-amber-400/80 shadow-[0_0_60px_rgba(212,175,55,0.4)] overflow-hidden text-gray-100">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#111933] to-[#0a0f21] border-b border-amber-400/40">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-amber-400/20 text-amber-300">
              <HelpCircle className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold uppercase tracking-wider text-white">
                  Question Bank & Round Manager
                </h2>
                {hasUnsavedChanges && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                    Unsaved Edits
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">
                Organize rounds, create and edit prompts, reorder answers, and export/import game data.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold uppercase text-zinc-300 hover:text-white flex items-center gap-1.5 transition-all"
              title="Export questions to JSON"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>

            <label className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold uppercase text-zinc-300 hover:text-white flex items-center gap-1.5 cursor-pointer transition-all">
              <Upload className="w-3.5 h-3.5" /> Import
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>

            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold uppercase tracking-wider shadow-md transition-all"
            >
              Save Bank
            </button>

            <button
              onClick={() => {
                if (hasUnsavedChanges && !window.confirm('Discard unsaved changes to question bank?')) {
                  return;
                }
                onClose();
              }}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white transition-all ml-2"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* FEEDBACK BANNERS */}
        {errorMessage && (
          <div className="bg-red-950/90 border-b border-red-700/80 px-6 py-2.5 flex items-center justify-between text-xs text-red-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="bg-emerald-950/90 border-b border-emerald-700/80 px-6 py-2.5 flex items-center justify-between text-xs text-emerald-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* MAIN BODY: 2 PANELS */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-0">
          
          {/* LEFT COLUMN: LIST OF QUESTIONS (4 COLS) */}
          <div className="md:col-span-4 border-r border-zinc-800 bg-[#060a14] flex flex-col justify-between overflow-hidden">
            
            <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Questions ({bank.length})
              </span>
              <button
                onClick={handleCreateQuestion}
                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold flex items-center gap-1 transition-all"
              >
                <Plus className="w-3 h-3" /> Add Question
              </button>
            </div>

            {/* SCROLLABLE LIST */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {bank.map((q, idx) => {
                const isSelected = idx === selectedIdx;
                const isActiveInLiveGame = idx === activeQuestionIndex;

                return (
                  <div
                    key={q.id}
                    onClick={() => setSelectedIdx(idx)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-zinc-900 border-amber-400/90 text-white shadow-md ring-1 ring-amber-400/20'
                        : 'bg-black/60 border-zinc-800/80 hover:border-zinc-700 text-zinc-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-amber-300">
                          Q{idx + 1}
                        </span>
                        {isActiveInLiveGame && (
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                            Live
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-zinc-500 uppercase">
                          {q.roundTitle.split('•')[0]}
                        </span>
                      </div>

                      {/* Move up / down controls */}
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleMoveQuestion(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 rounded text-zinc-500 hover:text-white disabled:opacity-20"
                          title="Move question up"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleMoveQuestion(idx, 'down')}
                          disabled={idx === bank.length - 1}
                          className="p-1 rounded text-zinc-500 hover:text-white disabled:opacity-20"
                          title="Move question down"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs font-medium text-white line-clamp-2 leading-relaxed">
                      "{q.questionText}"
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-2 pt-1.5 border-t border-zinc-800/60">
                      <span>{q.answers.length} answers</span>
                      <span className="font-mono font-bold text-amber-400/80">
                        {q.multiplier}x Multiplier
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* RESET REVEALS FOOTER */}
            <div className="p-3 border-t border-zinc-800 bg-black/40 flex items-center justify-between gap-2">
              <button
                onClick={() => setResetConfirmType('current')}
                className="flex-1 py-1 px-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-[11px] font-bold uppercase transition-all"
                title="Reset revealed answers for current question"
              >
                Reset Q{selectedIdx + 1} Reveals
              </button>
              <button
                onClick={() => setResetConfirmType('all')}
                className="py-1 px-2 rounded-lg bg-zinc-900 hover:bg-red-950/60 text-zinc-400 hover:text-red-300 text-[11px] font-bold uppercase transition-all"
                title="Reset reveals for all questions"
              >
                Reset All
              </button>
            </div>

          </div>

          {/* RIGHT COLUMN: QUESTION DETAILS & ANSWER EDITOR (8 COLS) */}
          <div className="md:col-span-8 flex flex-col justify-between overflow-hidden bg-[#070b17]">
            {currentQ ? (
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                
                {/* TOOLBAR */}
                <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-amber-300">
                      Editing Question #{selectedIdx + 1}
                    </span>
                    <button
                      onClick={() => onSelectActiveQuestion(selectedIdx)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                        selectedIdx === activeQuestionIndex
                          ? 'bg-emerald-950 border border-emerald-600 text-emerald-300'
                          : 'bg-zinc-900 hover:bg-emerald-900/40 text-zinc-300 border border-zinc-700'
                      }`}
                      title="Make this question currently active on projector"
                    >
                      {selectedIdx === activeQuestionIndex ? '✓ Active on Screen' : 'Set as Active on Screen'}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewMode(!previewMode)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold text-zinc-300 hover:text-white flex items-center gap-1 transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" /> {previewMode ? 'Edit Mode' : 'Preview Board'}
                    </button>

                    <button
                      onClick={handleDuplicateQuestion}
                      className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold text-zinc-300 hover:text-white flex items-center gap-1 transition-all"
                      title="Duplicate this question"
                    >
                      <Copy className="w-3.5 h-3.5" /> Duplicate
                    </button>

                    <button
                      onClick={() => setDeleteConfirmIdx(selectedIdx)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-red-950/60 border border-zinc-800 hover:border-red-800 text-xs font-bold text-zinc-400 hover:text-red-400 flex items-center gap-1 transition-all"
                      title="Delete this question"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>

                {/* PREVIEW MODE */}
                {previewMode ? (
                  <div className="p-6 rounded-2xl bg-zinc-950 border border-amber-400/40 shadow-xl space-y-4">
                    <div className="text-center">
                      <span className="px-3 py-1 rounded-full bg-blue-900/60 border border-blue-400 text-xs font-bold uppercase text-blue-200">
                        {currentQ.roundTitle} • {currentQ.multiplier}X
                      </span>
                      <h3 className="text-2xl font-bold text-white uppercase mt-3">
                        "{currentQ.questionText}"
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                      {currentQ.answers.map((a, i) => (
                        <div
                          key={a.id}
                          className="p-3 rounded-xl bg-gradient-to-r from-blue-950 to-blue-900 border border-amber-400/50 flex items-center justify-between text-white"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-amber-400 text-black font-bold text-xs flex items-center justify-center font-mono">
                              {i + 1}
                            </span>
                            <span className="font-bold text-sm uppercase">{a.text}</span>
                          </div>
                          <span className="font-mono font-black text-xl text-amber-300 px-2 py-0.5 rounded bg-black/60 border border-amber-400/40">
                            {a.points}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* EDIT FORM */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                          Round Label / Category
                        </label>
                        <input
                          type="text"
                          value={currentQ.roundTitle}
                          onChange={(e) => handleUpdateCurrentQ({ roundTitle: e.target.value })}
                          className="w-full bg-black border border-zinc-800 focus:border-amber-400 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                          placeholder="e.g. ROUND 1 • SINGLE POINTS"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                          Point Multiplier
                        </label>
                        <select
                          value={currentQ.multiplier}
                          onChange={(e) => handleUpdateCurrentQ({ multiplier: Number(e.target.value) })}
                          className="w-full bg-black border border-zinc-800 focus:border-amber-400 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                        >
                          <option value={1}>1X (Single Points)</option>
                          <option value={2}>2X (Double Points)</option>
                          <option value={3}>3X (Triple Points)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                        Question Prompt (Auditorium Display)
                      </label>
                      <textarea
                        value={currentQ.questionText}
                        onChange={(e) => handleUpdateCurrentQ({ questionText: e.target.value })}
                        rows={2}
                        className="w-full bg-black border border-zinc-800 focus:border-amber-400 rounded-lg px-3 py-2 text-sm text-white font-medium outline-none resize-none"
                        placeholder="Enter question prompt..."
                      />
                    </div>

                    {/* DUPLICATE WARNING */}
                    {dupes.length > 0 && (
                      <div className="p-2.5 rounded-lg bg-amber-950/60 border border-amber-500/50 flex items-center gap-2 text-xs text-amber-200">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Warning: Duplicate answer detected: "{dupes.join(', ')}". Answers should be unique.</span>
                      </div>
                    )}

                    {/* ANSWERS LIST */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                            Answers & Points
                          </span>
                          <span className="text-[11px] text-zinc-500 ml-2">
                            (Total Points: <strong className="text-amber-400 font-mono">{totalPoints}</strong>)
                          </span>
                        </div>
                        <button
                          onClick={handleAddAnswer}
                          className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold flex items-center gap-1 transition-all"
                        >
                          <Plus className="w-3 h-3" /> Add Answer Slot
                        </button>
                      </div>

                      <div className="space-y-2">
                        {currentQ.answers.map((ans, aIdx) => (
                          <div
                            key={ans.id}
                            className="p-2.5 rounded-xl bg-black border border-zinc-800/90 flex items-center gap-2 hover:border-zinc-700 transition-colors"
                          >
                            <span className="font-mono text-xs font-bold text-amber-400 w-6 text-center">
                              #{aIdx + 1}
                            </span>

                            <input
                              type="text"
                              value={ans.text}
                              onChange={(e) => handleUpdateAnswer(aIdx, { text: e.target.value })}
                              className="flex-1 bg-zinc-950 border border-zinc-800 focus:border-amber-400 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                              placeholder={`Answer text #${aIdx + 1}`}
                            />

                            <div className="flex items-center gap-1 w-28">
                              <input
                                type="number"
                                min={0}
                                value={ans.points}
                                onChange={(e) =>
                                  handleUpdateAnswer(aIdx, {
                                    points: Math.max(0, parseInt(e.target.value || '0', 10)),
                                  })
                                }
                                className="w-16 bg-zinc-950 border border-zinc-800 focus:border-amber-400 rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-right text-amber-300 outline-none"
                              />
                              <span className="text-[10px] text-zinc-400 uppercase font-bold">pts</span>
                            </div>

                            {/* Move Answer up/down */}
                            <button
                              onClick={() => handleMoveAnswer(aIdx, 'up')}
                              disabled={aIdx === 0}
                              className="p-1 rounded text-zinc-500 hover:text-white disabled:opacity-20"
                              title="Move answer up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleMoveAnswer(aIdx, 'down')}
                              disabled={aIdx === currentQ.answers.length - 1}
                              className="p-1 rounded text-zinc-500 hover:text-white disabled:opacity-20"
                              title="Move answer down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleRemoveAnswer(aIdx)}
                              className="p-1 rounded text-zinc-500 hover:text-red-400"
                              title="Remove answer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
                No question selected.
              </div>
            )}
          </div>

        </div>

        {/* DELETE CONFIRMATION MODAL */}
        {deleteConfirmIdx !== null && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl bg-zinc-950 border border-zinc-800 p-5 text-center shadow-2xl">
              <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <h4 className="text-base font-bold text-white uppercase mb-1">
                Delete Question #{deleteConfirmIdx + 1}?
              </h4>
              <p className="text-xs text-zinc-400 mb-4">
                "{bank[deleteConfirmIdx]?.questionText}"
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setDeleteConfirmIdx(null)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteQuestion(deleteConfirmIdx)}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* RESET CONFIRMATION MODAL */}
        {resetConfirmType !== null && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl bg-zinc-950 border border-zinc-800 p-5 text-center shadow-2xl">
              <RotateCcw className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <h4 className="text-base font-bold text-white uppercase mb-1">
                Reset Revealed Answers?
              </h4>
              <p className="text-xs text-zinc-400 mb-4">
                {resetConfirmType === 'current'
                  ? `This will mark all answers in Question #${selectedIdx + 1} as hidden.`
                  : 'This will mark all answers across all questions as hidden for a fresh session.'}
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setResetConfirmType(null)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onResetRevealState(resetConfirmType === 'current' ? selectedIdx : undefined);
                    setResetConfirmType(null);
                    setSuccessMessage('Reveal status successfully reset!');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold uppercase"
                >
                  Confirm Reset
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
