import React, { useState } from 'react';
import { 
  CheckSquare, 
  Square, 
  Plus, 
  Trash2, 
  X, 
  Clock, 
  Kanban, 
  ListTodo, 
  Sparkles, 
  Target,
  ArrowRight,
  ArrowLeft,
  GripVertical,
  Flame
} from 'lucide-react';
import { useTaskStore, TaskPriority, TaskStatus, StudyTask } from '../../store/useTaskStore';
import { useAppStore } from '../../store/useAppStore';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import { webAudioEngine } from '../../audio/WebAudioEngine';

export const TaskDrawer: React.FC = () => {
  const { 
    tasks, 
    addTask, 
    updateTaskStatus, 
    moveTask,
    reorderTasks,
    deleteTask, 
    activeTaskId, 
    setActiveTaskId, 
    sessionIntent, 
    setSessionIntent, 
    isTaskDrawerOpen, 
    setTaskDrawerOpen,
    clearCompletedTasks
  } = useTaskStore();
  const { language, setActiveModal } = useAppStore();
  const { isPro } = useSubscriptionStore();

  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [newCategory, setNewCategory] = useState('Genel');
  const [newPomoEstimate, setNewPomoEstimate] = useState(2);
  const [newStatus, setNewStatus] = useState<TaskStatus>('todo');
  const [intentInput, setIntentInput] = useState(sessionIntent);
  const [isEditingIntent, setIsEditingIntent] = useState(false);

  // Add Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalStatus, setModalStatus] = useState<TaskStatus>('todo');
  const [modalPriority, setModalPriority] = useState<TaskPriority>('medium');
  const [modalCategory, setModalCategory] = useState('Genel');
  const [modalPomodoros, setModalPomodoros] = useState(2);

  const openAddModal = (status: TaskStatus = 'todo') => {
    setModalStatus(status);
    setModalTitle('');
    setIsAddModalOpen(true);
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTitle.trim()) return;
    addTask(modalTitle.trim(), modalPriority, modalCategory, modalPomodoros, modalStatus);
    webAudioEngine.init();
    if (modalStatus === 'done') {
      webAudioEngine.playZenChime('finish');
    } else {
      webAudioEngine.playChime('wood_block');
    }
    setIsAddModalOpen(false);
    setModalTitle('');
  };

  // Drag & drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);

  if (!isTaskDrawerOpen) return null;

  const isTr = language === 'tr';

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      openAddModal(newStatus);
      return;
    }
    addTask(newTitle.trim(), newPriority, newCategory, newPomoEstimate, newStatus);
    webAudioEngine.init();
    if (newStatus === 'done') {
      webAudioEngine.playZenChime('finish');
    } else {
      webAudioEngine.playChime('wood_block');
    }
    setNewTitle('');
  };

  const handleSaveIntent = () => {
    if (intentInput.trim()) {
      setSessionIntent(intentInput.trim());
    }
    setIsEditingIntent(false);
  };

  const priorityColor = (p: TaskPriority) => {
    if (p === 'high') return 'text-red-400 bg-red-950/40 border-red-500/30';
    if (p === 'medium') return 'text-amber-400 bg-amber-950/40 border-amber-500/30';
    return 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30';
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, task: StudyTask) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(task.id);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverColumn(null);
    setDragOverTaskId(null);
    setDropPosition(null);
  };

  const handleColumnDragEnter = (e: React.DragEvent, colId: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== colId) {
      setDragOverColumn(colId);
    }
  };

  const handleColumnDragOver = (e: React.DragEvent, colId: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== colId) {
      setDragOverColumn(colId);
    }
  };

  const handleCardDragOver = (e: React.DragEvent, targetTask: StudyTask) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (targetTask.id === draggedTaskId) return;

    setDragOverColumn(targetTask.status);
    setDragOverTaskId(targetTask.id);

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    setDropPosition(e.clientY < midY ? 'before' : 'after');
  };

  const handleDropOnColumn = (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    e.stopPropagation();
    const taskId = draggedTaskId || e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    webAudioEngine.init();
    if (targetStatus === 'done') {
      webAudioEngine.playZenChime('finish');
    } else {
      webAudioEngine.playChime('wood_block');
    }

    moveTask(taskId, targetStatus);
    handleDragEnd();
  };

  const handleDropOnCard = (e: React.DragEvent, targetTask: StudyTask) => {
    e.preventDefault();
    e.stopPropagation();
    const taskId = draggedTaskId || e.dataTransfer.getData('text/plain');
    if (!taskId || taskId === targetTask.id) {
      handleDragEnd();
      return;
    }

    webAudioEngine.init();
    if (targetTask.status === 'done') {
      webAudioEngine.playZenChime('finish');
    } else {
      webAudioEngine.playChime('wood_block');
    }

    const colTasks = tasks.filter((t) => t.status === targetTask.status);
    const cardIdx = colTasks.findIndex((t) => t.id === targetTask.id);
    const finalIdx = dropPosition === 'after' ? cardIdx + 1 : cardIdx;

    moveTask(taskId, targetTask.status, finalIdx);
    handleDragEnd();
  };

  const handleListCardDragOver = (e: React.DragEvent, targetTask: StudyTask) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (targetTask.id === draggedTaskId) return;

    setDragOverTaskId(targetTask.id);
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    setDropPosition(e.clientY < midY ? 'before' : 'after');
  };

  const handleListDrop = (e: React.DragEvent, targetTask: StudyTask) => {
    e.preventDefault();
    e.stopPropagation();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId || taskId === targetTask.id) {
      handleDragEnd();
      return;
    }

    webAudioEngine.init();
    webAudioEngine.playChime('wood_block');

    const fromIdx = tasks.findIndex((t) => t.id === taskId);
    const toIdx = tasks.findIndex((t) => t.id === targetTask.id);
    if (fromIdx !== -1 && toIdx !== -1) {
      const newTasks = [...tasks];
      const [moved] = newTasks.splice(fromIdx, 1);
      const insertIdx = dropPosition === 'after' 
        ? (toIdx > fromIdx ? toIdx : toIdx + 1)
        : (toIdx > fromIdx ? toIdx - 1 : toIdx);
      newTasks.splice(Math.max(0, Math.min(newTasks.length, insertIdx)), 0, moved);
      reorderTasks(newTasks);
    }
    handleDragEnd();
  };

  const kanbanColumns: { 
    id: TaskStatus; 
    title: string; 
    color: string; 
    accentBorder: string; 
    bgActive: string;
    dotColor: string;
  }[] = [
    { 
      id: 'todo', 
      title: isTr ? 'Yapılacak' : 'To Do', 
      color: 'border-stone-800', 
      accentBorder: 'border-stone-500 ring-2 ring-stone-500/30', 
      bgActive: 'bg-stone-900/60',
      dotColor: 'bg-stone-400'
    },
    { 
      id: 'in_progress', 
      title: isTr ? 'Çalışılıyor' : 'In Progress', 
      color: 'border-amber-500/40', 
      accentBorder: 'border-amber-400 ring-2 ring-amber-500/40 shadow-lg shadow-amber-500/10', 
      bgActive: 'bg-amber-950/25',
      dotColor: 'bg-amber-400'
    },
    { 
      id: 'done', 
      title: isTr ? 'Tamamlandı' : 'Completed', 
      color: 'border-emerald-500/40', 
      accentBorder: 'border-emerald-400 ring-2 ring-emerald-500/40 shadow-lg shadow-emerald-500/10', 
      bgActive: 'bg-emerald-950/25',
      dotColor: 'bg-emerald-400'
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl h-full bg-stone-900/98 border-l border-stone-800 shadow-2xl flex flex-col text-stone-100">
        {/* Drawer Header */}
        <div className="p-5 border-b border-stone-800 flex items-center justify-between bg-stone-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/15 border border-amber-500/30 rounded-lg text-amber-400">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                {isTr ? 'Çalışma Görevleri & Mini Kanban' : 'Tasks & Mini Kanban'}
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                  {tasks.filter(t => t.status === 'done').length}/{tasks.length}
                </span>
              </h2>
              <p className="text-xs text-stone-400">
                {isTr ? 'Odaklanacağın görevleri organize et ve ilerlemeni takip et' : 'Organize study tasks and track your focus velocity'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Quick Add Button */}
            <button
              onClick={() => openAddModal(newStatus)}
              className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-all shadow-md shadow-amber-500/20"
              title={isTr ? 'Yeni Çalışma Görevi Ekle' : 'Add New Task'}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isTr ? 'Yeni Görev' : 'New Task'}</span>
            </button>

            {/* View switcher */}
            <div className="flex items-center p-1 rounded-lg bg-stone-800 border border-stone-700">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
                  viewMode === 'list' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-400 hover:text-white'
                }`}
                title="Liste Görünümü"
              >
                <ListTodo className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  if (!isPro) {
                    setActiveModal('subscription');
                    return;
                  }
                  setViewMode('kanban');
                }}
                className={`p-1.5 rounded text-xs transition-colors cursor-pointer relative ${
                  viewMode === 'kanban' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-400 hover:text-white'
                }`}
                title={isPro ? 'Kanban Görünümü' : 'PRO: Kanban Görünümü'}
              >
                <Kanban className="w-3.5 h-3.5" />
                {!isPro && (
                  <span className="absolute -top-1 -right-1 text-[8px] bg-amber-500 text-stone-950 rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">👑</span>
                )}
              </button>
            </div>

            <button
              onClick={() => setTaskDrawerOpen(false)}
              className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Session Intent Banner */}
        <div className="p-4 bg-gradient-to-r from-amber-950/30 to-stone-900 border-b border-stone-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" />
              {isTr ? 'Günün / Seansın Tek Net Hedefi' : 'Session Core Intent'}
            </span>
            <button
              onClick={() => setIsEditingIntent(!isEditingIntent)}
              className="text-[10px] text-amber-400/80 hover:text-amber-300 underline cursor-pointer"
            >
              {isEditingIntent ? (isTr ? 'Vazgeç' : 'Cancel') : (isTr ? 'Düzenle' : 'Edit')}
            </button>
          </div>
          {isEditingIntent ? (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={intentInput}
                onChange={(e) => setIntentInput(e.target.value)}
                placeholder={isTr ? 'Bu seansta sadece neye odaklanacaksın?' : 'What single goal will you accomplish?'}
                className="flex-1 px-3 py-1.5 text-xs bg-stone-950 border border-amber-500/50 rounded-lg text-white focus:outline-none"
              />
              <button
                onClick={handleSaveIntent}
                className="px-3 py-1.5 text-xs bg-amber-500 text-stone-950 font-bold rounded-lg cursor-pointer hover:bg-amber-400"
              >
                {isTr ? 'Kaydet' : 'Save'}
              </button>
            </div>
          ) : (
            <p className="text-xs text-stone-200 font-medium italic">
              "{sessionIntent}"
            </p>
          )}
        </div>

        {/* Task Creator Form */}
        <form onSubmit={handleCreateTask} className="p-4 border-b border-stone-800 bg-stone-950/30 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={isTr ? 'Yeni bir çalışma görevi ekle...' : 'Add a new study task...'}
              className="flex-1 px-3 py-2 text-xs bg-stone-800/80 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:border-amber-500 focus:outline-none"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{isTr ? 'Ekle' : 'Add'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
              className="px-2.5 py-1 bg-stone-800 border border-stone-700 rounded text-stone-300 text-[11px] focus:outline-none"
            >
              <option value="high">{isTr ? '🔴 Yüksek Öncelik' : '🔴 High Priority'}</option>
              <option value="medium">{isTr ? '🟡 Orta Öncelik' : '🟡 Medium Priority'}</option>
              <option value="low">{isTr ? '🟢 Düşük Öncelik' : '🟢 Low Priority'}</option>
            </select>

            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="px-2.5 py-1 bg-stone-800 border border-stone-700 rounded text-stone-300 text-[11px] focus:outline-none"
            >
              <option value="Yazılım">💻 Yazılım</option>
              <option value="Çalışma">📚 Çalışma</option>
              <option value="Okuma">📖 Okuma</option>
              <option value="Tasarım">🎨 Tasarım</option>
              <option value="Genel">✨ Genel</option>
            </select>

            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as TaskStatus)}
              className="px-2.5 py-1 bg-stone-800 border border-stone-700 rounded text-stone-300 text-[11px] focus:outline-none"
            >
              <option value="todo">📋 {isTr ? 'Yapılacak' : 'To Do'}</option>
              <option value="in_progress">⚡ {isTr ? 'Çalışılıyor' : 'In Progress'}</option>
              <option value="done">✅ {isTr ? 'Tamamlandı' : 'Done'}</option>
            </select>

            <div className="flex items-center gap-1 ml-auto text-[11px] text-stone-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{newPomoEstimate} Pomodoro</span>
              <input 
                type="range" 
                min="1" 
                max="8" 
                value={newPomoEstimate} 
                onChange={(e) => setNewPomoEstimate(Number(e.target.value))}
                className="w-16 h-1 accent-amber-500 bg-stone-700 rounded cursor-pointer" 
              />
            </div>
          </div>
        </form>

        {/* Content: List or Kanban */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {viewMode === 'list' ? (
            <div className="space-y-2">
              {tasks.length === 0 ? (
                <div className="text-center py-12 text-stone-500 text-xs">
                  {isTr ? 'Henüz görev eklenmedi. Yukarıdan bir tane ekleyerek başla!' : 'No tasks added yet. Add one above to get started!'}
                </div>
              ) : (
                tasks.map((task) => {
                  const isDragging = draggedTaskId === task.id;
                  const isOverThisCard = dragOverTaskId === task.id;

                  return (
                    <React.Fragment key={task.id}>
                      {isOverThisCard && dropPosition === 'before' && (
                        <div className="h-1 -my-0.5 rounded-full bg-gradient-to-r from-amber-500 via-amber-300 to-amber-500 shadow-md shadow-amber-500/50 animate-pulse transition-all" />
                      )}

                      <div
                        draggable
                        onDragStart={(e) => handleDragStart(e, task)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleListCardDragOver(e, task)}
                        onDragLeave={() => {
                          if (dragOverTaskId === task.id) {
                            setDragOverTaskId(null);
                            setDropPosition(null);
                          }
                        }}
                        onDrop={(e) => handleListDrop(e, task)}
                        className={`group p-3 rounded-xl border transition-all duration-200 flex items-center justify-between gap-3 cursor-grab active:cursor-grabbing select-none ${
                          isDragging
                            ? 'opacity-35 scale-95 border-dashed border-amber-500/60 bg-amber-950/20'
                            : task.id === activeTaskId
                              ? 'bg-amber-950/25 border-amber-500/60 shadow-md shadow-amber-950/40'
                              : 'bg-stone-950/50 border-stone-800 hover:border-stone-700 hover:bg-stone-900 hover:-translate-y-0.5'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <div className="text-stone-600 group-hover:text-amber-400 transition-colors flex-shrink-0">
                            <GripVertical className="w-3.5 h-3.5" />
                          </div>

                          <button
                            onClick={() => updateTaskStatus(task.id, task.status === 'done' ? 'todo' : 'done')}
                            className="text-stone-400 hover:text-amber-400 transition-colors cursor-pointer flex-shrink-0"
                          >
                            {task.status === 'done' ? (
                              <CheckSquare className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className={`text-xs font-semibold truncate ${task.status === 'done' ? 'line-through text-stone-500' : 'text-stone-200'}`}>
                              {task.title}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[10px]">
                              <span className={`px-1.5 py-0.2 rounded border ${priorityColor(task.priority)} font-bold`}>
                                {task.priority.toUpperCase()}
                              </span>
                              <span className="text-stone-400">#{task.category}</span>
                              <span className="text-amber-400/80 font-mono">
                                🍅 {task.pomodorosCompleted}/{task.pomodoroEstimate}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setActiveTaskId(task.id === activeTaskId ? null : task.id)}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                              task.id === activeTaskId
                                ? 'bg-amber-500 text-stone-950'
                                : 'bg-stone-800 text-stone-400 hover:text-stone-200'
                            }`}
                          >
                            {task.id === activeTaskId ? (isTr ? 'Aktif Odak' : 'Active') : (isTr ? 'Odaklan' : 'Focus')}
                          </button>

                          <button
                            onClick={() => deleteTask(task.id)}
                            className="p-1 text-stone-500 hover:text-red-400 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                            title={isTr ? 'Sil' : 'Delete'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {isOverThisCard && dropPosition === 'after' && (
                        <div className="h-1 -my-0.5 rounded-full bg-gradient-to-r from-amber-500 via-amber-300 to-amber-500 shadow-md shadow-amber-500/50 animate-pulse transition-all" />
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </div>
          ) : (
            /* Kanban Grid with Animated Drag & Drop */
            <div className="grid grid-cols-3 gap-3 h-full min-h-[420px]">
              {kanbanColumns.map((col) => {
                const colTasks = tasks.filter((t) => t.status === col.id);
                const isOverCol = dragOverColumn === col.id;

                return (
                  <div 
                    key={col.id} 
                    onDragOver={(e) => handleColumnDragOver(e, col.id)}
                    onDragLeave={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      if (e.clientX < rect.left || e.clientX >= rect.right || e.clientY < rect.top || e.clientY >= rect.bottom) {
                        if (dragOverColumn === col.id) setDragOverColumn(null);
                      }
                    }}
                    onDrop={(e) => handleDropOnColumn(e, col.id)}
                    className={`flex flex-col rounded-xl p-3 transition-all duration-200 border ${
                      isOverCol 
                        ? `${col.accentBorder} ${col.bgActive}` 
                        : `bg-stone-950/40 border-stone-800/80`
                    }`}
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-stone-800 select-none">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${col.dotColor} ${col.id === 'in_progress' ? 'animate-pulse' : ''}`} />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-200">
                          {col.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openAddModal(col.id)}
                          className="p-1 text-stone-400 hover:text-amber-400 hover:bg-stone-800 rounded transition-colors cursor-pointer"
                          title={isTr ? `${col.title} sütununa yeni görev ekle` : `Add task to ${col.title}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded transition-colors ${
                          isOverCol ? 'bg-amber-500/30 text-amber-200 font-bold' : 'bg-stone-800 text-stone-400'
                        }`}>
                          {colTasks.length}
                        </span>
                      </div>
                    </div>

                    {/* Column Body / Cards Container */}
                    <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar flex flex-col">
                      {colTasks.length === 0 ? (
                        <div 
                          onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverColumn(col.id); }}
                          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverColumn(col.id); }}
                          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleDropOnColumn(e, col.id); }}
                          onClick={() => openAddModal(col.id)}
                          className={`flex-1 min-h-[140px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-3 text-center transition-all duration-200 cursor-pointer ${
                            isOverCol
                              ? 'border-amber-400/80 bg-amber-500/10 text-amber-300 scale-[1.02]'
                              : 'border-stone-800/70 text-stone-500 hover:border-amber-500/50 hover:text-stone-300 bg-stone-950/20'
                          }`}
                        >
                          <Sparkles className={`w-4 h-4 mb-1.5 pointer-events-none ${isOverCol ? 'text-amber-400 animate-bounce' : 'opacity-40'}`} />
                          <span className="text-[11px] font-medium text-stone-300 pointer-events-none">
                            {isTr ? 'Buraya Sürükleyin veya Tıklayın' : 'Drop Here or Click to Add'}
                          </span>
                          <span className="text-[9px] text-stone-500 mt-0.5 pointer-events-none">
                            + {isTr ? `${col.title} Kartı Ekle` : `Add ${col.title} Card`}
                          </span>
                        </div>
                      ) : (
                        <>
                          {colTasks.map((t) => {
                            const isDragging = draggedTaskId === t.id;
                            const isOverThisCard = dragOverTaskId === t.id;

                            return (
                              <React.Fragment key={t.id}>
                                {isOverThisCard && dropPosition === 'before' && (
                                  <div className="h-1 -my-0.5 rounded-full bg-gradient-to-r from-amber-500 via-amber-300 to-amber-500 shadow-md shadow-amber-500/50 animate-pulse transition-all" />
                                )}

                                <div
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, t)}
                                  onDragEnd={handleDragEnd}
                                  onDragOver={(e) => handleCardDragOver(e, t)}
                                  onDragLeave={(e) => {
                                    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                                    if (dragOverTaskId === t.id) {
                                      setDragOverTaskId(null);
                                      setDropPosition(null);
                                    }
                                  }}
                                  onDrop={(e) => handleDropOnCard(e, t)}
                                  className={`group relative p-2.5 rounded-xl border transition-all duration-200 select-none cursor-grab active:cursor-grabbing ${
                                    isDragging
                                      ? 'opacity-35 scale-95 border-dashed border-amber-500/70 bg-amber-950/30'
                                      : t.id === activeTaskId
                                        ? 'bg-amber-950/30 border-amber-500/60 shadow-lg shadow-amber-950/30'
                                        : 'bg-stone-900/90 border-stone-800/80 hover:border-stone-650 hover:bg-stone-850 hover:shadow-md hover:shadow-black/40 hover:-translate-y-0.5'
                                  }`}
                                >
                                  {/* Grip Handle & Task Title */}
                                  <div className="flex items-start gap-1.5 pointer-events-none">
                                    <div className="pt-0.5 text-stone-600 group-hover:text-amber-400 transition-colors flex-shrink-0">
                                      <GripVertical className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className={`text-xs font-semibold leading-snug break-words ${
                                        t.status === 'done' ? 'line-through text-stone-500' : 'text-stone-100'
                                      }`}>
                                        {t.title}
                                      </div>
                                      <div className="flex flex-wrap items-center gap-1 mt-1.5 text-[10px]">
                                        <span className={`px-1.5 py-0.2 rounded border font-bold ${priorityColor(t.priority)}`}>
                                          {t.priority.toUpperCase()}
                                        </span>
                                        <span className="text-stone-400">#{t.category}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Bottom info & actions */}
                                  <div className="flex items-center justify-between text-[10px] text-stone-400 pt-2 mt-2 border-t border-stone-800/60">
                                    <span className="text-amber-400/90 font-mono text-[10px]">
                                      🍅 {t.pomodorosCompleted}/{t.pomodoroEstimate}
                                    </span>
                                    
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => setActiveTaskId(t.id === activeTaskId ? null : t.id)}
                                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${
                                          t.id === activeTaskId
                                            ? 'bg-amber-500 text-stone-950'
                                            : 'bg-stone-800 text-stone-400 hover:text-stone-200'
                                        }`}
                                      >
                                        {t.id === activeTaskId ? (isTr ? 'Aktif' : 'Active') : (isTr ? 'Odak' : 'Focus')}
                                      </button>

                                      {col.id !== 'todo' && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const prevStatus: TaskStatus = col.id === 'done' ? 'in_progress' : 'todo';
                                            updateTaskStatus(t.id, prevStatus);
                                            webAudioEngine.init();
                                            webAudioEngine.playChime('wood_block');
                                          }}
                                          className="p-1 text-stone-400 hover:text-white hover:bg-stone-800 rounded cursor-pointer transition-colors"
                                          title={isTr ? 'Geri Al' : 'Step Back'}
                                        >
                                          <ArrowLeft className="w-3 h-3" />
                                        </button>
                                      )}

                                      {col.id !== 'done' && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const nextStatus: TaskStatus = col.id === 'todo' ? 'in_progress' : 'done';
                                            updateTaskStatus(t.id, nextStatus);
                                            webAudioEngine.init();
                                            if (nextStatus === 'done') {
                                              webAudioEngine.playZenChime('finish');
                                            } else {
                                              webAudioEngine.playChime('wood_block');
                                            }
                                          }}
                                          className="p-1 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded cursor-pointer transition-colors"
                                          title={isTr ? 'İlerlet' : 'Advance'}
                                        >
                                          <ArrowRight className="w-3 h-3" />
                                        </button>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => deleteTask(t.id)}
                                        className="p-1 text-stone-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                                        title={isTr ? 'Sil' : 'Delete'}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {isOverThisCard && dropPosition === 'after' && (
                                  <div className="h-1 -my-0.5 rounded-full bg-gradient-to-r from-amber-500 via-amber-300 to-amber-500 shadow-md shadow-amber-500/50 animate-pulse transition-all" />
                                )}
                              </React.Fragment>
                            );
                          })}

                          {/* Bottom drop spacer and Quick Add button */}
                          <div 
                            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverColumn(col.id); }}
                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverColumn(col.id); }}
                            onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleDropOnColumn(e, col.id); }}
                            className="flex-1 min-h-[30px] rounded-lg transition-colors"
                          />

                          <button
                            type="button"
                            onClick={() => openAddModal(col.id)}
                            className="py-1.5 px-2 rounded-lg border border-dashed border-stone-800/90 text-stone-400 hover:text-stone-200 hover:border-amber-500/40 hover:bg-stone-900/60 text-[11px] font-medium flex items-center justify-center gap-1 transition-all cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 text-amber-400/80" />
                            <span>{isTr ? `${col.title} Kartı Ekle` : `Add ${col.title} Card`}</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Drawer Footer with CSV Export */}
        <div className="p-3 border-t border-stone-800 bg-stone-950/50 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (!isPro) {
                setActiveModal('subscription');
                return;
              }
              const csvContent = "data:text/csv;charset=utf-8," 
                + "Baslik,Durum,Oncelik,Kategori,TahminPomo,BitenPomo\n"
                + tasks.map(e => `"${e.title}","${e.status}","${e.priority}","${e.category}",${e.pomodoroEstimate},${e.pomodorosCompleted}`).join("\n");
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement("a");
              link.setAttribute("href", encodedUri);
              link.setAttribute("download", `cozy_study_tasks_${Date.now()}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="text-[11px] text-stone-400 hover:text-amber-300 transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>📥 {isTr ? 'CSV Olarak Dışa Aktar' : 'Export CSV'}</span>
            {!isPro && <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.5 rounded font-bold">PRO</span>}
          </button>

          {tasks.some(t => t.status === 'done') && (
            <button
              onClick={clearCompletedTasks}
              className="text-[11px] text-stone-400 hover:text-amber-400 transition-colors cursor-pointer"
            >
              {isTr ? 'Tamamlananları Temizle' : 'Clear Completed'}
            </button>
          )}
        </div>
      </div>

      {/* Add Task Modal Dialog */}
      {isAddModalOpen && (
        <div 
          className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddModalOpen(false);
          }}
        >
          <div 
            className="bg-stone-900 border border-stone-700/80 rounded-2xl shadow-2xl w-full max-w-md p-6 relative flex flex-col gap-4 text-stone-100 animate-scale-up"
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-stone-100">
                    {isTr ? 'Yeni Çalışma Görevi Ekle' : 'Add New Study Task'}
                  </h3>
                  <p className="text-xs text-stone-400">
                    {isTr ? 'Hedefine odaklan ve adım adım tamamla' : 'Stay focused and conquer your goals step by step'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleModalSubmit} className="flex flex-col gap-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">
                  {isTr ? 'Görev Başlığı *' : 'Task Title *'}
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  placeholder={isTr ? 'Örn: Matematik problem seti 3 çöz...' : 'e.g. Solve physics problem set 3...'}
                  className="w-full bg-stone-950/80 border border-stone-700/80 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500/80 focus:ring-2 focus:ring-amber-500/20 transition-all"
                />
              </div>

              {/* Status Column Selector */}
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">
                  {isTr ? 'Başlangıç Sütunu / Durum' : 'Initial Status Column'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'todo' as TaskStatus, label: isTr ? 'Yapılacak' : 'To Do', color: 'border-stone-700 hover:border-stone-500 text-stone-300 bg-stone-950/40' },
                    { id: 'in_progress' as TaskStatus, label: isTr ? 'Çalışılıyor' : 'In Progress', color: 'border-amber-500/40 hover:border-amber-400 text-amber-300 bg-amber-950/30' },
                    { id: 'done' as TaskStatus, label: isTr ? 'Tamamlandı' : 'Completed', color: 'border-emerald-500/40 hover:border-emerald-400 text-emerald-300 bg-emerald-950/30' },
                  ].map((colOption) => {
                    const isSelected = modalStatus === colOption.id;
                    return (
                      <button
                        key={colOption.id}
                        type="button"
                        onClick={() => setModalStatus(colOption.id)}
                        className={`py-2 px-2 rounded-xl border text-xs font-medium transition-all text-center cursor-pointer ${
                          isSelected 
                            ? 'border-amber-400 bg-amber-500/20 text-amber-300 ring-2 ring-amber-500/30 font-semibold' 
                            : `${colOption.color} opacity-70 hover:opacity-100`
                        }`}
                      >
                        {colOption.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Priority & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1.5">
                    {isTr ? 'Öncelik' : 'Priority'}
                  </label>
                  <select
                    value={modalPriority}
                    onChange={(e) => setModalPriority(e.target.value as TaskPriority)}
                    className="w-full bg-stone-950/80 border border-stone-700/80 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500/80 cursor-pointer"
                  >
                    <option value="low">{isTr ? '🟢 Düşük' : '🟢 Low'}</option>
                    <option value="medium">{isTr ? '🟡 Normal' : '🟡 Medium'}</option>
                    <option value="high">{isTr ? '🔴 Yüksek' : '🔴 High'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1.5">
                    {isTr ? 'Kategori' : 'Category'}
                  </label>
                  <input
                    type="text"
                    value={modalCategory}
                    onChange={(e) => setModalCategory(e.target.value)}
                    placeholder={isTr ? 'Genel, Ders, vb.' : 'General, Work, etc.'}
                    className="w-full bg-stone-950/80 border border-stone-700/80 rounded-xl px-3 py-2 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500/80"
                  />
                </div>
              </div>

              {/* Pomodoro Estimate */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-stone-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isTr ? 'Tahmini Pomodoro' : 'Estimated Pomodoros'}</span>
                  </label>
                  <span className="text-xs font-bold text-amber-400">
                    {modalPomodoros} 🍅 ({modalPomodoros * 25} {isTr ? 'dk' : 'min'})
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={8}
                  value={modalPomodoros}
                  onChange={(e) => setModalPomodoros(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-stone-500 mt-0.5">
                  <span>1 (25m)</span>
                  <span>4 (100m)</span>
                  <span>8 (200m)</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-800 mt-1">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors cursor-pointer"
                >
                  {isTr ? 'Vazgeç' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={!modalTitle.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-stone-950 transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>{isTr ? 'Görevi Ekle' : 'Add Task'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
