import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  Minus,
  Trash2,
  Pencil,
  X,
  Clock,
  Kanban,
  ListTodo,
  Sparkles,
  Target,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Check,
} from 'lucide-react';
import { useTaskStore, TaskPriority, TaskStatus, StudyTask } from '../../store/useTaskStore';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import { webAudioEngine } from '../../audio/WebAudioEngine';

export const TaskDrawer: React.FC = () => {
  const {
    tasks,
    addTask,
    editTask,
    updateTaskStatus,
    moveTask,
    reorderTasks,
    deleteTask,
    activeTaskId,
    setActiveTaskId,
    incrementTaskPomodoro,
    sessionIntent,
    setSessionIntent,
    isTaskDrawerOpen,
    setTaskDrawerOpen,
    clearCompletedTasks,
    clearAllTasks,
  } = useTaskStore();
  const { language, setActiveModal, showToast } = useAppStore();
  const { user } = useAuthStore();
  const { isPro } = useSubscriptionStore();

  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [listFilter, setListFilter] = useState<TaskStatus | 'all'>('all');
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [newCategory, setNewCategory] = useState('Genel');
  const [newPomoEstimate, setNewPomoEstimate] = useState(2);
  const [newStatus, setNewStatus] = useState<TaskStatus>('todo');
  const [intentInput, setIntentInput] = useState(sessionIntent);
  const [isEditingIntent, setIsEditingIntent] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  // Add / Edit Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalStatus, setModalStatus] = useState<TaskStatus>('todo');
  const [modalPriority, setModalPriority] = useState<TaskPriority>('medium');
  const [modalCategory, setModalCategory] = useState('Genel');
  const [modalPomodoros, setModalPomodoros] = useState(2);

  useEffect(() => {
    setIntentInput(sessionIntent);
  }, [sessionIntent]);

  useEffect(() => {
    if (!isAddModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setIsAddModalOpen(false);
        setEditingTaskId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isAddModalOpen]);

  const isTr = language === 'tr';

  const openAddModal = (status: TaskStatus = 'todo') => {
    if (!user && tasks.length >= 3) {
      showToast(
        isTr
          ? 'Misafir Öğrenci sınırı (3 Görev). Sınırsız görev ve bulut yedekleme için ücretsiz giriş yapın! 📋'
          : 'Guest limit reached (3 Tasks). Sign in for free for unlimited tasks and cloud sync! 📋',
        4000
      );
      setActiveModal('auth');
      return;
    }
    setEditingTaskId(null);
    setModalStatus(status);
    setModalTitle('');
    setModalPriority('medium');
    setModalCategory('Genel');
    setModalPomodoros(2);
    setIsAddModalOpen(true);
  };

  const openEditModal = (task: StudyTask) => {
    setEditingTaskId(task.id);
    setModalTitle(task.title);
    setModalStatus(task.status);
    setModalPriority(task.priority);
    setModalCategory(task.category);
    setModalPomodoros(task.pomodoroEstimate);
    setIsAddModalOpen(true);
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!modalTitle.trim()) return;

    if (editingTaskId) {
      editTask(editingTaskId, {
        title: modalTitle.trim(),
        priority: modalPriority,
        category: modalCategory.trim() || 'Genel',
        pomodoroEstimate: modalPomodoros,
        status: modalStatus,
      });
      webAudioEngine.init();
      webAudioEngine.playChime('wood_block');
      showToast(isTr ? 'Görev güncellendi ✨' : 'Task updated ✨', 2000);
      setIsAddModalOpen(false);
      setEditingTaskId(null);
      setModalTitle('');
      return;
    }

    if (!user && tasks.length >= 3) {
      showToast(
        isTr
          ? 'Misafir Öğrenci sınırı (3 Görev). Sınırsız görev ve bulut yedekleme için ücretsiz giriş yapın! 📋'
          : 'Guest limit reached (3 Tasks). Sign in for free for unlimited tasks and cloud sync! 📋',
        4000
      );
      setActiveModal('auth');
      setIsAddModalOpen(false);
      return;
    }
    addTask(modalTitle.trim(), modalPriority, modalCategory.trim() || 'Genel', modalPomodoros, modalStatus);
    webAudioEngine.init();
    if (modalStatus === 'done') {
      webAudioEngine.playZenChime('finish');
    } else {
      webAudioEngine.playChime('wood_block');
    }
    setIsAddModalOpen(false);
    setModalTitle('');
  };

  const handleDeleteTask = (e: React.MouseEvent, task: StudyTask) => {
    e.preventDefault();
    e.stopPropagation();
    deleteTask(task.id);
    webAudioEngine.init();
    webAudioEngine.playChime('wood_block');
    showToast(
      isTr ? `"${task.title.slice(0, 24)}" silindi 🗑️` : `"${task.title.slice(0, 24)}" deleted 🗑️`,
      2000
    );
  };

  // Drag & drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);
  const [mobileKanbanCol, setMobileKanbanCol] = useState<TaskStatus | 'all'>('all');

  const handleTouchStart = (taskId: string) => {
    setDraggedTaskId(taskId);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!draggedTaskId) return;
    const touch = e.touches[0];
    const elem = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!elem) return;

    const colElem = elem.closest('[data-column-id]');
    if (colElem) {
      const colId = colElem.getAttribute('data-column-id') as TaskStatus;
      if (colId && colId !== dragOverColumn) {
        setDragOverColumn(colId);
      }
    }

    const cardElem = elem.closest('[data-task-id]');
    if (cardElem) {
      const tId = cardElem.getAttribute('data-task-id');
      if (tId && tId !== draggedTaskId) {
        setDragOverTaskId(tId);
        const rect = cardElem.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        setDropPosition(touch.clientY < midY ? 'before' : 'after');
      }
    }
  };

  const handleTouchEnd = () => {
    if (!draggedTaskId) return;

    if (dragOverColumn) {
      webAudioEngine.init();
      if (dragOverColumn === 'done') {
        webAudioEngine.playZenChime('finish');
      } else {
        webAudioEngine.playChime('wood_block');
      }
      moveTask(draggedTaskId, dragOverColumn);
    } else if (dragOverTaskId && viewMode === 'list') {
      const fromIdx = tasks.findIndex((t) => t.id === draggedTaskId);
      const toIdx = tasks.findIndex((t) => t.id === dragOverTaskId);
      if (fromIdx !== -1 && toIdx !== -1) {
        const newTasks = [...tasks];
        const [moved] = newTasks.splice(fromIdx, 1);
        const insertIdx =
          dropPosition === 'after'
            ? toIdx > fromIdx
              ? toIdx
              : toIdx + 1
            : toIdx > fromIdx
              ? toIdx - 1
              : toIdx;
        newTasks.splice(Math.max(0, Math.min(newTasks.length, insertIdx)), 0, moved);
        reorderTasks(newTasks);
        webAudioEngine.init();
        webAudioEngine.playChime('wood_block');
      }
    }

    handleDragEnd();
  };

  const moveTaskInList = (taskOrIndex: string | number, direction: 'up' | 'down') => {
    const index =
      typeof taskOrIndex === 'number'
        ? taskOrIndex
        : tasks.findIndex((t) => t.id === taskOrIndex);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= tasks.length) return;
    const newTasks = [...tasks];
    const [moved] = newTasks.splice(index, 1);
    newTasks.splice(targetIndex, 0, moved);
    reorderTasks(newTasks);
    webAudioEngine.init();
    webAudioEngine.playChime('wood_block');
  };

  if (!isTaskDrawerOpen) return null;

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      openAddModal(newStatus);
      return;
    }
    if (!user && tasks.length >= 3) {
      showToast(
        isTr
          ? 'Misafir Öğrenci sınırı (3 Görev). Sınırsız görev ve bulut yedekleme için ücretsiz giriş yapın! 📋'
          : 'Guest limit reached (3 Tasks). Sign in for free for unlimited tasks and cloud sync! 📋',
        4000
      );
      setActiveModal('auth');
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
    const trimmed = intentInput.trim();
    setSessionIntent(trimmed);
    setIsEditingIntent(false);
    webAudioEngine.init();
    webAudioEngine.playChime('wood_block');
  };

  const handleClearIntent = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSessionIntent('');
    setIntentInput('');
    setIsEditingIntent(false);
    webAudioEngine.init();
    webAudioEngine.playChime('wood_block');
    showToast(isTr ? 'Seans hedefi temizlendi 🗑️' : 'Session intent cleared 🗑️', 1800);
  };

  const priorityColor = (p: TaskPriority) => {
    if (p === 'high') return 'text-red-300 bg-red-950/60 border-red-500/40';
    if (p === 'medium') return 'text-amber-300 bg-amber-950/60 border-amber-500/40';
    return 'text-emerald-300 bg-emerald-950/60 border-emerald-500/40';
  };

  const priorityLabel = (p: TaskPriority) => {
    if (p === 'high') return isTr ? 'YÜKSEK' : 'HIGH';
    if (p === 'medium') return isTr ? 'ORTA' : 'MED';
    return isTr ? 'DÜŞÜK' : 'LOW';
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
      const insertIdx =
        dropPosition === 'after'
          ? toIdx > fromIdx
            ? toIdx
            : toIdx + 1
          : toIdx > fromIdx
            ? toIdx - 1
            : toIdx;
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
      dotColor: 'bg-stone-400',
    },
    {
      id: 'in_progress',
      title: isTr ? 'Çalışılıyor' : 'In Progress',
      color: 'border-amber-500/40',
      accentBorder: 'border-amber-400 ring-2 ring-amber-500/40 shadow-lg shadow-amber-500/10',
      bgActive: 'bg-amber-950/25',
      dotColor: 'bg-amber-400',
    },
    {
      id: 'done',
      title: isTr ? 'Tamamlandı' : 'Completed',
      color: 'border-emerald-500/40',
      accentBorder: 'border-emerald-400 ring-2 ring-emerald-500/40 shadow-lg shadow-emerald-500/10',
      bgActive: 'bg-emerald-950/25',
      dotColor: 'bg-emerald-400',
    },
  ];

  const filteredListTasks =
    listFilter === 'all' ? tasks : tasks.filter((t) => t.status === listFilter);

  return (
    <div
      onClick={() => setTaskDrawerOpen(false)}
      className="fixed inset-0 z-50 flex justify-end bg-black/65 backdrop-blur-sm animate-fade-in pointer-events-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`task-drawer-panel relative w-full ${
          viewMode === 'kanban' ? 'max-w-xl sm:max-w-3xl lg:max-w-4xl' : 'max-w-xl sm:max-w-2xl'
        } h-full h-[100dvh] bg-stone-900/98 border-l border-stone-800 shadow-2xl flex flex-col text-stone-100 transition-all duration-200`}
        style={{
          paddingTop: 'var(--safe-top)',
          paddingBottom: 'var(--safe-bottom)',
        }}
      >
        {/* Drawer Header */}
        <div className="p-3 sm:p-4 border-b border-stone-800 flex items-center justify-between gap-2 bg-stone-950/60 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-400 shrink-0">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 truncate">
                <span className="truncate">{isTr ? 'Görevler & Mini Kanban' : 'Tasks & Mini Kanban'}</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 shrink-0 font-mono">
                  {tasks.filter((t) => t.status === 'done').length}/{tasks.length}
                </span>
              </h2>
              <p className="text-[11px] text-stone-400 truncate hidden xs:block">
                {isTr
                  ? 'Odaklanacağın görevleri ekle, düzenle veya tamamla'
                  : 'Add, edit, or complete your focus tasks'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Quick Add Button */}
            <button
              type="button"
              onClick={() => openAddModal(newStatus)}
              className="px-2.5 sm:px-3 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-md shadow-amber-500/20"
              title={isTr ? 'Yeni Çalışma Görevi Ekle' : 'Add New Task'}
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden xs:inline">{isTr ? 'Yeni Görev' : 'New Task'}</span>
            </button>

            {/* View switcher */}
            <div className="flex items-center p-1 rounded-xl bg-stone-800/90 border border-stone-700">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-2 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                    : 'text-stone-400 hover:text-white'
                }`}
                title={isTr ? 'Liste Görünümü' : 'List View'}
              >
                <ListTodo className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">{isTr ? 'Liste' : 'List'}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`px-2 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                  viewMode === 'kanban'
                    ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                    : 'text-stone-400 hover:text-white'
                }`}
                title={isTr ? 'Kanban Görünümü' : 'Kanban View'}
              >
                <Kanban className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Kanban</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setTaskDrawerOpen(false)}
              className="p-2 text-stone-400 hover:text-white rounded-xl hover:bg-stone-800 transition-colors cursor-pointer"
              title={isTr ? 'Kapat' : 'Close'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Guest Session Limitation Notice */}
        {!user && (
          <div className="mx-3 sm:mx-4 mt-2.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-2 text-xs shrink-0">
            <div className="flex items-center gap-2 text-amber-200 min-w-0">
              <span className="text-sm shrink-0">📋</span>
              <span className="truncate">
                {isTr
                  ? `Misafir Öğrenci: En fazla 3 görev (${tasks.length}/3)`
                  : `Guest Session: Up to 3 tasks (${tasks.length}/3)`}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveModal('auth')}
              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-[11px] whitespace-nowrap transition-colors cursor-pointer shrink-0"
            >
              {isTr ? 'Giriş Yap' : 'Sign In'}
            </button>
          </div>
        )}

        {/* Session Intent Banner (With Edit AND Delete Support!) */}
        <div className="task-drawer-intent px-3.5 py-2.5 sm:px-4 sm:py-3 bg-gradient-to-r from-amber-950/30 to-stone-900 border-b border-stone-800 shrink-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 shrink-0" />
              <span>{isTr ? 'Günün / Seansın Tek Net Hedefi' : 'Session Core Intent'}</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIntentInput(sessionIntent);
                  setIsEditingIntent(!isEditingIntent);
                }}
                className="px-2 py-0.5 rounded-md bg-stone-800/80 hover:bg-stone-700 text-[11px] text-amber-300 font-semibold transition-colors cursor-pointer flex items-center gap-1"
              >
                <Pencil className="w-3 h-3" />
                <span>{isEditingIntent ? (isTr ? 'Vazgeç' : 'Cancel') : (isTr ? 'Düzenle' : 'Edit')}</span>
              </button>
              {sessionIntent && !isEditingIntent && (
                <button
                  type="button"
                  onClick={handleClearIntent}
                  className="px-2 py-0.5 rounded-md bg-red-950/50 hover:bg-red-900/60 border border-red-500/30 text-[11px] text-red-300 font-semibold transition-colors cursor-pointer flex items-center gap-1"
                  title={isTr ? 'Seans hedefini sil' : 'Delete session intent'}
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{isTr ? 'Sil' : 'Clear'}</span>
                </button>
              )}
            </div>
          </div>

          {isEditingIntent ? (
            <div className="flex items-center gap-2 mt-1.5">
              <input
                type="text"
                value={intentInput}
                onChange={(e) => setIntentInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveIntent();
                  }
                }}
                placeholder={
                  isTr
                    ? 'Bu seansta sadece neye odaklanacaksın?'
                    : 'What single goal will you accomplish?'
                }
                className="flex-1 px-3 py-2 text-xs bg-stone-950 border border-amber-500/50 rounded-xl text-white focus:outline-none"
                autoFocus
              />
              {intentInput && (
                <button
                  type="button"
                  onClick={() => setIntentInput('')}
                  className="p-2 text-stone-400 hover:text-red-400 bg-stone-800 rounded-xl cursor-pointer"
                  title={isTr ? 'Metni Temizle' : 'Clear text'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={handleSaveIntent}
                className="px-3.5 py-2 text-xs bg-amber-500 text-stone-950 font-bold rounded-xl cursor-pointer hover:bg-amber-400 shrink-0"
              >
                {isTr ? 'Kaydet' : 'Save'}
              </button>
            </div>
          ) : sessionIntent ? (
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-stone-200 font-medium italic break-words">
                "{sessionIntent}"
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingIntent(true)}
              className="text-xs text-stone-400 italic hover:text-amber-300 transition-colors text-left w-full cursor-pointer flex items-center gap-1.5 py-0.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
              <span className="truncate">
                {isTr
                  ? 'Bu seans için net bir odak hedefi belirle (örn: 25 sayfa oku)...'
                  : 'Set a clear focus goal for this session...'}
              </span>
            </button>
          )}
        </div>

        {/* Task Creator Form (Responsive for Mobile & Tablet) */}
        <form
          onSubmit={handleCreateTask}
          className="task-drawer-creator p-3 sm:p-4 border-b border-stone-800 bg-stone-950/30 space-y-2.5 shrink-0"
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={
                isTr ? 'Yeni bir çalışma görevi yaz ve Ekle\'ye bas...' : 'Type a new study task and tap Add...'
              }
              className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm bg-stone-800/90 border border-stone-700 rounded-xl text-white placeholder-stone-400 focus:border-amber-500 focus:outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-bold text-xs sm:text-sm rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shrink-0 shadow-md shadow-amber-500/15"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{isTr ? 'Ekle' : 'Add'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 text-xs">
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
              className="px-2.5 py-1.5 bg-stone-800 border border-stone-700 rounded-lg text-stone-200 text-[11px] focus:outline-none cursor-pointer"
            >
              <option value="high">{isTr ? '🔴 Yüksek Öncelik' : '🔴 High Priority'}</option>
              <option value="medium">{isTr ? '🟡 Orta Öncelik' : '🟡 Medium Priority'}</option>
              <option value="low">{isTr ? '🟢 Düşük Öncelik' : '🟢 Low Priority'}</option>
            </select>

            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="px-2.5 py-1.5 bg-stone-800 border border-stone-700 rounded-lg text-stone-200 text-[11px] focus:outline-none cursor-pointer"
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
              className="px-2.5 py-1.5 bg-stone-800 border border-stone-700 rounded-lg text-stone-200 text-[11px] focus:outline-none cursor-pointer"
            >
              <option value="todo">📋 {isTr ? 'Yapılacak' : 'To Do'}</option>
              <option value="in_progress">⚡ {isTr ? 'Çalışılıyor' : 'In Progress'}</option>
              <option value="done">✅ {isTr ? 'Tamamlandı' : 'Done'}</option>
            </select>

            {/* Tactile Pomodoro Stepper (Much easier to tap on Mobile/Tablet than a tiny slider) */}
            <div className="flex items-center justify-between sm:justify-start gap-1.5 sm:ml-auto bg-stone-800/90 border border-stone-700 rounded-lg px-2 py-1 text-[11px] text-stone-200">
              <span className="flex items-center gap-1 font-semibold text-amber-300">
                <span>🍅</span>
                <span className="font-mono">{newPomoEstimate}</span>
                <span className="text-stone-400 font-normal hidden xs:inline">Pomo</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setNewPomoEstimate((v) => Math.max(1, v - 1))}
                  className="w-6 h-6 rounded bg-stone-900 hover:bg-stone-700 flex items-center justify-center text-stone-300 active:scale-95 cursor-pointer"
                  title={isTr ? 'Azalt' : 'Decrease'}
                >
                  <Minus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setNewPomoEstimate((v) => Math.min(12, v + 1))}
                  className="w-6 h-6 rounded bg-stone-900 hover:bg-stone-700 flex items-center justify-center text-stone-300 active:scale-95 cursor-pointer"
                  title={isTr ? 'Artır' : 'Increase'}
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Content: List or Kanban */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-4 custom-scrollbar">
          {viewMode === 'list' ? (
            <div className="space-y-2.5">
              {/* Filter Pills for Quick Mobile/Tablet Navigation */}
              {tasks.length > 0 && (
                <div className="flex items-center gap-1.5 pb-1 overflow-x-auto no-scrollbar">
                  {[
                    { id: 'all' as const, label: isTr ? 'Tümü' : 'All', count: tasks.length },
                    {
                      id: 'todo' as const,
                      label: isTr ? '📋 Yapılacak' : '📋 To Do',
                      count: tasks.filter((t) => t.status === 'todo').length,
                    },
                    {
                      id: 'in_progress' as const,
                      label: isTr ? '⚡ Çalışılıyor' : '⚡ Active',
                      count: tasks.filter((t) => t.status === 'in_progress').length,
                    },
                    {
                      id: 'done' as const,
                      label: isTr ? '✅ Bitti' : '✅ Done',
                      count: tasks.filter((t) => t.status === 'done').length,
                    },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setListFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                        listFilter === tab.id
                          ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                          : 'bg-stone-950/70 text-stone-400 hover:text-stone-200 border border-stone-800'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                          listFilter === tab.id ? 'bg-stone-950/20 text-stone-950 font-black' : 'bg-stone-800 text-stone-400'
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {tasks.length === 0 ? (
                <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-stone-800/80 bg-stone-950/30 flex flex-col items-center justify-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xl text-amber-400 shadow-inner">
                    📋
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-stone-200">
                      {isTr ? 'Henüz Bir Görev Eklenmedi' : 'No Tasks Added Yet'}
                    </h4>
                    <p className="text-[11px] text-stone-400 mt-1 max-w-xs mx-auto leading-relaxed">
                      {isTr
                        ? 'Bugün başarmak istediğin ilk adımı yukarıdan ekle veya aşağıdaki hazır şablonlardan birine dokun!'
                        : 'Add the first goal you want to achieve above or tap a quick starter template below!'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    {[
                      { label: isTr ? '📚 Ders / Sınav Tekrarı' : '📚 Study Session', cat: 'Çalışma' },
                      { label: isTr ? '💻 Kodlama / Proje' : '💻 Coding Module', cat: 'Yazılım' },
                      { label: isTr ? '📖 25 Sayfa Kitap Oku' : '📖 Read 25 Pages', cat: 'Okuma' },
                    ].map((starter, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          if (!user && tasks.length >= 3) {
                            setActiveModal('auth');
                            return;
                          }
                          addTask(starter.label, 'medium', starter.cat, 2, 'todo');
                          webAudioEngine.init();
                          webAudioEngine.playChime('wood_block');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-stone-800/90 hover:bg-stone-700 border border-white/10 hover:border-amber-500/40 text-xs text-stone-200 hover:text-amber-200 transition-all cursor-pointer active:scale-95"
                      >
                        + {starter.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : filteredListTasks.length === 0 ? (
                <div className="text-center py-8 px-4 rounded-2xl border border-dashed border-stone-800/70 bg-stone-950/20 text-xs text-stone-400">
                  {isTr ? 'Bu filtrede görev bulunmuyor.' : 'No tasks match this filter.'}
                </div>
              ) : (
                filteredListTasks.map((task) => {
                  const isDragging = draggedTaskId === task.id;
                  const isOverThisCard = dragOverTaskId === task.id;

                  return (
                    <React.Fragment key={task.id}>
                      {isOverThisCard && dropPosition === 'before' && (
                        <div className="h-1 -my-0.5 rounded-full bg-gradient-to-r from-amber-500 via-amber-300 to-amber-500 shadow-md shadow-amber-500/50 animate-pulse transition-all" />
                      )}

                      <div
                        data-task-id={task.id}
                        onDragOver={(e) => handleListCardDragOver(e, task)}
                        onDragLeave={() => {
                          if (dragOverTaskId === task.id) {
                            setDragOverTaskId(null);
                            setDropPosition(null);
                          }
                        }}
                        onDrop={(e) => handleListDrop(e, task)}
                        className={`group p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 flex flex-col gap-2.5 ${
                          isDragging
                            ? 'opacity-35 scale-95 border-dashed border-amber-500/60 bg-amber-950/20'
                            : task.id === activeTaskId
                              ? 'bg-amber-950/30 border-amber-500/60 shadow-md shadow-amber-950/40'
                              : 'bg-stone-950/60 border-stone-800/90 hover:border-stone-700'
                        }`}
                      >
                        {/* TOP ROW: Checkbox, Full Readable Title, Edit & Delete */}
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            {/* Grip handle for drag & drop */}
                            <div
                              draggable
                              onDragStart={(e) => handleDragStart(e, task)}
                              onDragEnd={handleDragEnd}
                              onTouchStart={() => handleTouchStart(task.id)}
                              onTouchMove={handleTouchMove}
                              onTouchEnd={handleTouchEnd}
                              className="mt-0.5 p-1 text-stone-500 hover:text-amber-400 active:text-amber-300 transition-colors shrink-0 touch-none cursor-grab active:cursor-grabbing rounded-lg hover:bg-stone-800/60"
                              title={isTr ? 'Sürükle ve Sırala' : 'Drag to Reorder'}
                            >
                              <GripVertical className="w-4 h-4" />
                            </div>

                            {/* Large 1-Tap Complete Checkbox */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const nextStatus = task.status === 'done' ? 'todo' : 'done';
                                updateTaskStatus(task.id, nextStatus);
                                webAudioEngine.init();
                                if (nextStatus === 'done') {
                                  webAudioEngine.playZenChime('finish');
                                } else {
                                  webAudioEngine.playChime('wood_block');
                                }
                              }}
                              className="mt-0.5 p-1 rounded-lg text-stone-400 hover:text-amber-400 active:scale-90 transition-all cursor-pointer shrink-0"
                              title={task.status === 'done' ? (isTr ? 'Yapılacak Olarak İşaretle' : 'Mark To Do') : (isTr ? 'Tamamlandı Olarak İşaretle' : 'Mark Completed')}
                            >
                              {task.status === 'done' ? (
                                <CheckSquare className="w-5 h-5 text-emerald-400" />
                              ) : (
                                <Square className="w-5 h-5" />
                              )}
                            </button>

                            {/* Task Title & Metadata Badges */}
                            <div className="flex-1 min-w-0 pt-0.5">
                              <div
                                className={`text-xs sm:text-sm font-semibold leading-snug break-words ${
                                  task.status === 'done' ? 'line-through text-stone-500' : 'text-stone-100'
                                }`}
                              >
                                {task.title}
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[10px]">
                                <span className={`px-1.5 py-0.5 rounded-md border font-bold ${priorityColor(task.priority)}`}>
                                  {priorityLabel(task.priority)}
                                </span>
                                <span className="px-1.5 py-0.5 rounded-md bg-stone-900 border border-stone-800 text-stone-300">
                                  #{task.category}
                                </span>
                                <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-950/30 border border-amber-500/20 text-amber-300 font-mono">
                                  <span>
                                    🍅 {task.pomodorosCompleted}/{task.pomodoroEstimate}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      incrementTaskPomodoro(task.id);
                                      webAudioEngine.init();
                                      webAudioEngine.playChime('wood_block');
                                    }}
                                    className="ml-0.5 px-1 rounded bg-amber-500/20 hover:bg-amber-500/40 text-amber-200 font-bold cursor-pointer active:scale-90"
                                    title={isTr ? '+1 Pomodoro Ekle' : '+1 Pomodoro'}
                                  >
                                    +1
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Always-Visible Edit & Delete Buttons (Works on Phone, Tablet & Desktop!) */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(task);
                              }}
                              className="w-8 h-8 rounded-xl bg-stone-900/90 hover:bg-stone-800 border border-stone-800 text-stone-300 hover:text-amber-300 flex items-center justify-center transition-all cursor-pointer active:scale-90"
                              title={isTr ? 'Görevi Düzenle' : 'Edit Task'}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleDeleteTask(e, task)}
                              className="w-8 h-8 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 hover:text-red-200 flex items-center justify-center transition-all cursor-pointer active:scale-90"
                              title={isTr ? 'Görevi Sil' : 'Delete Task'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* BOTTOM ROW: Status Switcher, Focus Toggle & Reorder Arrows */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-800/70 flex-wrap">
                          {/* 1-Tap Status Switcher */}
                          <div className="flex items-center gap-1 bg-stone-900/95 p-1 rounded-xl border border-stone-800">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateTaskStatus(task.id, 'todo');
                                webAudioEngine.init();
                                webAudioEngine.playChime('wood_block');
                              }}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                task.status === 'todo'
                                  ? 'bg-stone-700 text-stone-100 shadow-xs'
                                  : 'text-stone-400 hover:text-stone-200'
                              }`}
                            >
                              📋 {isTr ? 'Yapılacak' : 'Todo'}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateTaskStatus(task.id, 'in_progress');
                                webAudioEngine.init();
                                webAudioEngine.playChime('wood_block');
                              }}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                task.status === 'in_progress'
                                  ? 'bg-amber-500 text-stone-950 font-black shadow-xs'
                                  : 'text-stone-400 hover:text-stone-200'
                              }`}
                            >
                              ⚡ {isTr ? 'Çalışılıyor' : 'Active'}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateTaskStatus(task.id, 'done');
                                webAudioEngine.init();
                                webAudioEngine.playZenChime('finish');
                              }}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                task.status === 'done'
                                  ? 'bg-emerald-500 text-stone-950 font-black shadow-xs'
                                  : 'text-stone-400 hover:text-stone-200'
                              }`}
                            >
                              ✅ {isTr ? 'Bitti' : 'Done'}
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5 ml-auto">
                            {/* Reorder Up/Down Buttons */}
                            <div className="flex items-center gap-0.5 bg-stone-900/90 border border-stone-800 rounded-xl p-0.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveTaskInList(task.id, 'up');
                                }}
                                className="p-1 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 cursor-pointer active:scale-90"
                                title={isTr ? 'Yukarı Taşı' : 'Move Up'}
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveTaskInList(task.id, 'down');
                                }}
                                className="p-1 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 cursor-pointer active:scale-90"
                                title={isTr ? 'Aşağı Taşı' : 'Move Down'}
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Set Active Focus Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTaskId(task.id === activeTaskId ? null : task.id);
                                webAudioEngine.init();
                                webAudioEngine.playChime('wood_block');
                              }}
                              className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer active:scale-95 ${
                                task.id === activeTaskId
                                  ? 'bg-amber-500 text-stone-950 shadow-sm shadow-amber-500/30'
                                  : 'bg-stone-800 text-stone-300 hover:text-white border border-stone-700'
                              }`}
                            >
                              🎯 {task.id === activeTaskId ? (isTr ? 'Aktif Odak' : 'Active Focus') : (isTr ? 'Odaklan' : 'Focus')}
                            </button>
                          </div>
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
            /* Kanban Grid with Mobile/Tablet Column Selector & Touch-Friendly Cards */
            <div className="flex flex-col h-full min-h-[380px]">
              {/* Column Tabs for Phones & Portrait Tablets */}
              <div className="flex md:hidden items-center gap-1.5 mb-3 p-1 rounded-xl bg-stone-950/70 border border-stone-800 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setMobileKanbanCol('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    mobileKanbanCol === 'all'
                      ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                      : 'text-stone-400 hover:text-white'
                  }`}
                >
                  {isTr ? 'Tümü' : 'All'} ({tasks.length})
                </button>
                {kanbanColumns.map((c) => {
                  const count = tasks.filter((t) => t.status === c.id).length;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setMobileKanbanCol(c.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                        mobileKanbanCol === c.id
                          ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                          : 'text-stone-400 hover:text-white'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${c.dotColor}`} />
                      <span>{c.title}</span>
                      <span className="text-[10px] opacity-80 font-mono">({count})</span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1">
                {kanbanColumns
                  .filter((col) => mobileKanbanCol === 'all' || mobileKanbanCol === col.id)
                  .map((col) => {
                    const colTasks = tasks.filter((t) => t.status === col.id);
                    const isOverCol = dragOverColumn === col.id;

                    return (
                      <div
                        key={col.id}
                        data-column-id={col.id}
                        onDragOver={(e) => handleColumnDragOver(e, col.id)}
                        onDragLeave={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          if (
                            e.clientX < rect.left ||
                            e.clientX >= rect.right ||
                            e.clientY < rect.top ||
                            e.clientY >= rect.bottom
                          ) {
                            if (dragOverColumn === col.id) setDragOverColumn(null);
                          }
                        }}
                        onDrop={(e) => handleDropOnColumn(e, col.id)}
                        className={`flex flex-col rounded-2xl p-3 transition-all duration-200 border ${
                          isOverCol
                            ? `${col.accentBorder} ${col.bgActive}`
                            : 'bg-stone-950/45 border-stone-800/80'
                        }`}
                      >
                        {/* Column Header */}
                        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-stone-800 select-none">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full ${col.dotColor} ${
                                col.id === 'in_progress' ? 'animate-pulse' : ''
                              }`}
                            />
                            <span className="text-xs font-bold uppercase tracking-wider text-stone-200">
                              {col.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openAddModal(col.id)}
                              className="p-1.5 text-stone-400 hover:text-amber-400 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
                              title={isTr ? `${col.title} sütununa yeni görev ekle` : `Add task to ${col.title}`}
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-md transition-colors ${
                                isOverCol
                                  ? 'bg-amber-500/30 text-amber-200 font-bold'
                                  : 'bg-stone-800 text-stone-400'
                              }`}
                            >
                              {colTasks.length}
                            </span>
                          </div>
                        </div>

                        {/* Column Body / Cards Container */}
                        <div className="flex-1 overflow-y-auto space-y-2.5 custom-scrollbar flex flex-col">
                          {colTasks.length === 0 ? (
                            <div
                              onDragEnter={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setDragOverColumn(col.id);
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setDragOverColumn(col.id);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDropOnColumn(e, col.id);
                              }}
                              onClick={() => openAddModal(col.id)}
                              className={`flex-1 min-h-[120px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-3 text-center transition-all duration-200 cursor-pointer ${
                                isOverCol
                                  ? 'border-amber-400/80 bg-amber-500/10 text-amber-300 scale-[1.02]'
                                  : 'border-stone-800/70 text-stone-500 hover:border-amber-500/50 hover:text-stone-300 bg-stone-950/20'
                              }`}
                            >
                              <Sparkles
                                className={`w-4 h-4 mb-1.5 pointer-events-none ${
                                  isOverCol ? 'text-amber-400 animate-bounce' : 'opacity-40'
                                }`}
                              />
                              <span className="text-[11px] font-medium text-stone-300 pointer-events-none">
                                {isTr ? 'Buraya Sürükleyin veya Dokunun' : 'Drop Here or Tap to Add'}
                              </span>
                              <span className="text-[10px] text-stone-500 mt-0.5 pointer-events-none">
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
                                      data-task-id={t.id}
                                      onDragOver={(e) => handleCardDragOver(e, t)}
                                      onDragLeave={(e) => {
                                        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                                        if (dragOverTaskId === t.id) {
                                          setDragOverTaskId(null);
                                          setDropPosition(null);
                                        }
                                      }}
                                      onDrop={(e) => handleDropOnCard(e, t)}
                                      className={`group relative p-3 rounded-xl border transition-all duration-200 flex flex-col gap-2 ${
                                        isDragging
                                          ? 'opacity-35 scale-95 border-dashed border-amber-500/70 bg-amber-950/30'
                                          : t.id === activeTaskId
                                            ? 'bg-amber-950/30 border-amber-500/60 shadow-lg shadow-amber-950/30'
                                            : 'bg-stone-900/90 border-stone-800/90 hover:border-stone-700'
                                      }`}
                                    >
                                      {/* Top Row: Grip, Title, Edit & Delete */}
                                      <div className="flex items-start justify-between gap-1.5">
                                        <div className="flex items-start gap-1.5 flex-1 min-w-0">
                                          <div
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, t)}
                                            onDragEnd={handleDragEnd}
                                            onTouchStart={() => handleTouchStart(t.id)}
                                            onTouchMove={handleTouchMove}
                                            onTouchEnd={handleTouchEnd}
                                            className="pt-0.5 p-1 text-stone-500 hover:text-amber-400 active:text-amber-300 transition-colors shrink-0 touch-none cursor-grab active:cursor-grabbing"
                                            title={isTr ? 'Sürükle veya Taşı' : 'Drag or Move'}
                                          >
                                            <GripVertical className="w-3.5 h-3.5" />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div
                                              className={`text-xs font-semibold leading-snug break-words ${
                                                t.status === 'done'
                                                  ? 'line-through text-stone-500'
                                                  : 'text-stone-100'
                                              }`}
                                            >
                                              {t.title}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-1 mt-1.5 text-[10px]">
                                              <span
                                                className={`px-1.5 py-0.2 rounded border font-bold ${priorityColor(
                                                  t.priority
                                                )}`}
                                              >
                                                {priorityLabel(t.priority)}
                                              </span>
                                              <span className="text-stone-400">#{t.category}</span>
                                              <span className="text-amber-400/90 font-mono">
                                                🍅 {t.pomodorosCompleted}/{t.pomodoroEstimate}
                                              </span>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Always-visible Edit & Delete buttons */}
                                        <div className="flex items-center gap-1 shrink-0">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openEditModal(t);
                                            }}
                                            className="w-7 h-7 rounded-lg bg-stone-950/80 hover:bg-stone-800 border border-stone-800 text-stone-300 hover:text-amber-300 flex items-center justify-center transition-colors cursor-pointer active:scale-90"
                                            title={isTr ? 'Düzenle' : 'Edit'}
                                          >
                                            <Pencil className="w-3 h-3" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) => handleDeleteTask(e, t)}
                                            className="w-7 h-7 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 hover:text-red-200 flex items-center justify-center transition-colors cursor-pointer active:scale-90"
                                            title={isTr ? 'Sil' : 'Delete'}
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>

                                      {/* Bottom Action Bar */}
                                      <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-stone-800/60 flex-wrap">
                                        <div className="flex items-center gap-0.5 bg-stone-950/90 p-0.5 rounded-lg border border-stone-800">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              moveTask(t.id, 'todo');
                                              webAudioEngine.init();
                                              webAudioEngine.playChime('wood_block');
                                            }}
                                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${
                                              t.status === 'todo'
                                                ? 'bg-stone-700 text-stone-100 shadow-xs'
                                                : 'text-stone-400 hover:text-stone-200'
                                            }`}
                                          >
                                            📋 {isTr ? 'Yap' : 'Todo'}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              moveTask(t.id, 'in_progress');
                                              webAudioEngine.init();
                                              webAudioEngine.playChime('wood_block');
                                            }}
                                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${
                                              t.status === 'in_progress'
                                                ? 'bg-amber-500 text-stone-950 font-black shadow-xs'
                                                : 'text-stone-400 hover:text-stone-200'
                                            }`}
                                          >
                                            ⚡ {isTr ? 'Çalış' : 'Active'}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              moveTask(t.id, 'done');
                                              webAudioEngine.init();
                                              webAudioEngine.playZenChime('finish');
                                            }}
                                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${
                                              t.status === 'done'
                                                ? 'bg-emerald-500 text-stone-950 font-black shadow-xs'
                                                : 'text-stone-400 hover:text-stone-200'
                                            }`}
                                          >
                                            ✅ {isTr ? 'Bitti' : 'Done'}
                                          </button>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveTaskId(t.id === activeTaskId ? null : t.id);
                                          }}
                                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                            t.id === activeTaskId
                                              ? 'bg-amber-500 text-stone-950'
                                              : 'bg-stone-800 text-stone-300 hover:text-white'
                                          }`}
                                        >
                                          {t.id === activeTaskId ? (isTr ? 'Aktif' : 'Active') : (isTr ? 'Odak' : 'Focus')}
                                        </button>
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
                                onDragEnter={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setDragOverColumn(col.id);
                                }}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setDragOverColumn(col.id);
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDropOnColumn(e, col.id);
                                }}
                                className="flex-1 min-h-[24px] rounded-lg transition-colors"
                              />

                              <button
                                type="button"
                                onClick={() => openAddModal(col.id)}
                                className="py-2 px-2.5 rounded-xl border border-dashed border-stone-800/90 text-stone-400 hover:text-stone-200 hover:border-amber-500/40 hover:bg-stone-900/60 text-xs font-medium flex items-center justify-center gap-1 transition-all cursor-pointer"
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
            </div>
          )}
        </div>

        {/* Drawer Footer with CSV Export, Clear Completed & Clear All */}
        <div className="p-3 sm:px-4 border-t border-stone-800 bg-stone-950/70 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (!isPro) {
                setActiveModal('subscription');
                return;
              }
              const csvContent =
                'data:text/csv;charset=utf-8,' +
                'Baslik,Durum,Oncelik,Kategori,TahminPomo,BitenPomo\n' +
                tasks
                  .map(
                    (e) =>
                      `"${e.title.replace(/"/g, '""')}","${e.status}","${e.priority}","${e.category}",${e.pomodoroEstimate},${e.pomodorosCompleted}`
                  )
                  .join('\n');
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement('a');
              link.setAttribute('href', encodedUri);
              link.setAttribute('download', `cozy_study_tasks_${Date.now()}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="text-xs text-stone-400 hover:text-amber-300 transition-colors cursor-pointer flex items-center gap-1.5 py-1"
          >
            <span>📥 {isTr ? 'CSV İndir' : 'Export CSV'}</span>
            {!isPro && (
              <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.5 rounded font-bold">
                PRO
              </span>
            )}
          </button>

          <div className="flex items-center gap-2 ml-auto">
            {tasks.some((t) => t.status === 'done') && (
              <button
                type="button"
                onClick={() => {
                  clearCompletedTasks();
                  webAudioEngine.init();
                  webAudioEngine.playChime('wood_block');
                  showToast(
                    isTr ? 'Tamamlanan görevler temizlendi ✨' : 'Completed tasks cleared ✨',
                    2000
                  );
                }}
                className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs text-stone-300 hover:text-amber-300 transition-colors cursor-pointer"
              >
                {isTr ? 'Tamamlananları Sil' : 'Clear Completed'}
              </button>
            )}

            {tasks.length > 0 && (
              confirmClearAll ? (
                <div className="flex items-center gap-1 bg-red-950/60 border border-red-500/40 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      clearAllTasks();
                      setConfirmClearAll(false);
                      webAudioEngine.init();
                      webAudioEngine.playChime('wood_block');
                      showToast(isTr ? 'Tüm görevler silindi 🗑️' : 'All tasks deleted 🗑️', 2000);
                    }}
                    className="px-2.5 py-1 rounded-md bg-red-600 hover:bg-red-500 text-white font-bold text-xs cursor-pointer"
                  >
                    {isTr ? 'Evet, Tümünü Sil' : 'Yes, Delete All'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearAll(false)}
                    className="px-2 py-1 rounded-md text-stone-300 hover:text-white text-xs cursor-pointer"
                  >
                    {isTr ? 'İptal' : 'Cancel'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/50 border border-red-500/30 text-xs text-red-300 hover:text-red-200 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isTr ? 'Tümünü Sil' : 'Delete All'}</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit Task Modal Dialog */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in pointer-events-auto"
          onClick={(e) => {
            e.stopPropagation();
            if (e.target === e.currentTarget) {
              setIsAddModalOpen(false);
              setEditingTaskId(null);
            }
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-stone-900 border border-stone-700/80 rounded-2xl shadow-2xl w-full max-w-md max-h-[90dvh] overflow-y-auto p-5 sm:p-6 relative flex flex-col gap-4 text-stone-100 animate-scale-up"
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                  {editingTaskId ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-semibold text-base text-stone-100">
                    {editingTaskId
                      ? isTr
                        ? 'Çalışma Görevini Düzenle'
                        : 'Edit Study Task'
                      : isTr
                        ? 'Yeni Çalışma Görevi Ekle'
                        : 'Add New Study Task'}
                  </h3>
                  <p className="text-xs text-stone-400">
                    {isTr
                      ? 'Hedefine odaklan ve adım adım tamamla'
                      : 'Stay focused and conquer your goals step by step'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAddModalOpen(false);
                  setEditingTaskId(null);
                }}
                className="p-2 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-xl transition-colors cursor-pointer"
                title={isTr ? 'Kapat' : 'Close'}
              >
                <X className="w-5 h-5" />
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
                  placeholder={
                    isTr ? 'Örn: Matematik problem seti 3 çöz...' : 'e.g. Solve physics problem set 3...'
                  }
                  className="w-full bg-stone-950/80 border border-stone-700/80 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500/80 focus:ring-2 focus:ring-amber-500/20 transition-all"
                />
              </div>

              {/* Status Column Selector */}
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">
                  {isTr ? 'Sütun / Durum' : 'Status Column'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      id: 'todo' as TaskStatus,
                      label: isTr ? 'Yapılacak' : 'To Do',
                      color: 'border-stone-700 hover:border-stone-500 text-stone-300 bg-stone-950/40',
                    },
                    {
                      id: 'in_progress' as TaskStatus,
                      label: isTr ? 'Çalışılıyor' : 'In Progress',
                      color:
                        'border-amber-500/40 hover:border-amber-400 text-amber-300 bg-amber-950/30',
                    },
                    {
                      id: 'done' as TaskStatus,
                      label: isTr ? 'Tamamlandı' : 'Completed',
                      color:
                        'border-emerald-500/40 hover:border-emerald-400 text-emerald-300 bg-emerald-950/30',
                    },
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
                    className="w-full bg-stone-950/80 border border-stone-700/80 rounded-xl px-3 py-2.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500/80 cursor-pointer"
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
              <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-stone-800 mt-1">
                {editingTaskId ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const taskToDelete = tasks.find((t) => t.id === editingTaskId);
                      deleteTask(editingTaskId);
                      setIsAddModalOpen(false);
                      setEditingTaskId(null);
                      webAudioEngine.init();
                      webAudioEngine.playChime('wood_block');
                      if (taskToDelete) {
                        showToast(
                          isTr ? `"${taskToDelete.title.slice(0, 20)}" silindi 🗑️` : 'Task deleted 🗑️',
                          2000
                        );
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-red-300 hover:text-red-200 bg-red-950/50 hover:bg-red-900/60 border border-red-500/30 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isTr ? 'Görevi Sil' : 'Delete'}</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAddModalOpen(false);
                      setEditingTaskId(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 transition-colors cursor-pointer"
                  >
                    {isTr ? 'Vazgeç' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={!modalTitle.trim()}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    {editingTaskId ? (
                      <>
                        <Check className="w-4 h-4 stroke-[2.5]" />
                        <span>{isTr ? 'Kaydet' : 'Save'}</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 stroke-[2.5]" />
                        <span>{isTr ? 'Görevi Ekle' : 'Add Task'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
