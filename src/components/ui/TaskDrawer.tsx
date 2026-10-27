import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Pencil,
  X,
  Kanban,
  ListTodo,
  Sparkles,
  Target,
  Check,
} from 'lucide-react';
import { useTaskStore, TaskPriority, TaskStatus, StudyTask } from '../../store/useTaskStore';
import { useAppStore } from '../../store/useAppStore';
import { webAudioEngine } from '../../audio/WebAudioEngine';

export const TaskDrawer: React.FC = () => {
  const {
    tasks,
    addTask,
    editTask,
    updateTaskStatus,
    moveTask,
    deleteTask,
    activeTaskId,
    setActiveTaskId,
    isTaskDrawerOpen,
    setTaskDrawerOpen,
    clearCompletedTasks,
    clearAllTasks,
  } = useTaskStore();
  const { language, showToast } = useAppStore();

  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [listFilter, setListFilter] = useState<'all' | 'todo' | 'done'>('all');
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  // Edit Modal state
  const [editingTask, setEditingTask] = useState<StudyTask | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalStatus, setModalStatus] = useState<TaskStatus>('todo');
  const [modalPriority, setModalPriority] = useState<TaskPriority>('medium');

  useEffect(() => {
    if (!editingTask) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setEditingTask(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [editingTask]);

  if (!isTaskDrawerOpen) return null;

  const isTr = language === 'tr';

  const openEditModal = (task: StudyTask) => {
    setEditingTask(task);
    setModalTitle(task.title);
    setModalStatus(task.status);
    setModalPriority(task.priority);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editingTask || !modalTitle.trim()) return;

    editTask(editingTask.id, {
      title: modalTitle.trim(),
      priority: modalPriority,
      status: modalStatus,
    });
    webAudioEngine.init();
    webAudioEngine.playChime('wood_block');
    showToast(isTr ? 'Görev güncellendi ✨' : 'Task updated ✨', 1800);
    setEditingTask(null);
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    addTask(trimmed, newPriority, 'Genel', 1, 'todo');
    webAudioEngine.init();
    webAudioEngine.playChime('wood_block');
    setNewTitle('');
  };

  const handleDeleteTask = (e: React.MouseEvent, task: StudyTask) => {
    e.preventDefault();
    e.stopPropagation();
    deleteTask(task.id);
    webAudioEngine.init();
    webAudioEngine.playChime('wood_block');
    showToast(
      isTr ? `"${task.title.slice(0, 22)}" silindi 🗑️` : `"${task.title.slice(0, 22)}" deleted 🗑️`,
      1800
    );
  };

  const priorityBadge = (p: TaskPriority) => {
    if (p === 'high') {
      return {
        cls: 'text-red-300 bg-red-950/60 border-red-500/40',
        dot: 'bg-red-400',
        label: isTr ? 'Önemli' : 'High',
      };
    }
    if (p === 'medium') {
      return {
        cls: 'text-amber-300 bg-amber-950/60 border-amber-500/40',
        dot: 'bg-amber-400',
        label: isTr ? 'Normal' : 'Med',
      };
    }
    return {
      cls: 'text-emerald-300 bg-emerald-950/60 border-emerald-500/40',
      dot: 'bg-emerald-400',
      label: isTr ? 'Düşük' : 'Low',
    };
  };

  const completedCount = tasks.filter((t) => t.status === 'done').length;
  const pendingCount = tasks.length - completedCount;

  const filteredTasks = tasks.filter((t) => {
    if (listFilter === 'todo') return t.status !== 'done';
    if (listFilter === 'done') return t.status === 'done';
    return true;
  });

  const kanbanColumns: {
    id: TaskStatus;
    title: string;
    dotColor: string;
  }[] = [
    { id: 'todo', title: isTr ? 'Yapılacak' : 'To Do', dotColor: 'bg-stone-400' },
    { id: 'in_progress', title: isTr ? 'Çalışılıyor' : 'Active', dotColor: 'bg-amber-400' },
    { id: 'done', title: isTr ? 'Tamamlandı' : 'Done', dotColor: 'bg-emerald-400' },
  ];

  return (
    <div
      onClick={() => setTaskDrawerOpen(false)}
      className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-fade-in pointer-events-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`task-drawer-panel relative w-full ${
          viewMode === 'kanban' ? 'max-w-xl sm:max-w-3xl' : 'max-w-md sm:max-w-lg'
        } h-full h-[100dvh] bg-stone-950/98 border-l border-stone-800/90 shadow-2xl flex flex-col text-stone-100 transition-all duration-200`}
        style={{
          paddingTop: 'max(0.5rem, var(--safe-top))',
          paddingBottom: 'max(0.75rem, var(--safe-bottom))',
        }}
      >
        {/* 1. Sleek Top Header */}
        <div className="px-4 py-3 border-b border-stone-800/90 flex items-center justify-between gap-2 bg-stone-950 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white truncate">
                  {isTr ? 'Yapılacaklar (To-Do)' : 'Study Tasks'}
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono shrink-0">
                  {completedCount}/{tasks.length}
                </span>
              </div>
              <p className="text-[11px] text-stone-400 truncate">
                {pendingCount > 0
                  ? isTr
                    ? `${pendingCount} aktif görev bekliyor`
                    : `${pendingCount} active tasks remaining`
                  : isTr
                    ? 'Tüm görevler tamamlandı ✨'
                    : 'All tasks completed ✨'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* List / Kanban Switcher */}
            <div className="flex items-center p-0.5 rounded-xl bg-stone-900 border border-stone-800">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-amber-500 text-stone-950 font-bold'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <ListTodo className="w-3.5 h-3.5" />
                <span className="text-[11px]">{isTr ? 'Liste' : 'List'}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                  viewMode === 'kanban'
                    ? 'bg-amber-500 text-stone-950 font-bold'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <Kanban className="w-3.5 h-3.5" />
                <span className="text-[11px]">Kanban</span>
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

        {/* 2. Clean 1-Line Quick Add Form + Priority Chips */}
        <form
          onSubmit={handleCreateTask}
          className="px-4 py-3 border-b border-stone-800/80 bg-stone-900/50 space-y-2 shrink-0"
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={isTr ? 'Yeni görev yazın...' : 'Add a new task...'}
              className="flex-1 px-3.5 py-2.5 text-sm bg-stone-950 border border-stone-700/90 rounded-xl text-white placeholder-stone-500 focus:border-amber-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!newTitle.trim()}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 active:scale-95 text-stone-950 font-bold text-xs sm:text-sm rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shrink-0 shadow-md shadow-amber-500/15"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{isTr ? 'Ekle' : 'Add'}</span>
            </button>
          </div>

          {/* Compact Priority Chips */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-stone-400 mr-0.5">
                {isTr ? 'Öncelik:' : 'Priority:'}
              </span>
              {(['high', 'medium', 'low'] as TaskPriority[]).map((p) => {
                const info = priorityBadge(p);
                const active = newPriority === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setNewPriority(p)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      active
                        ? info.cls + ' ring-1 ring-white/15'
                        : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${info.dot}`} />
                    <span>{info.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </form>

        {/* 3. TOP Filter & Bulk Delete Bar (Never buried at the bottom of the screen!) */}
        {tasks.length > 0 && (
          <div className="px-4 py-2.5 border-b border-stone-800/80 bg-stone-950/90 flex items-center justify-between gap-2 flex-wrap shrink-0">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1">
              {[
                { id: 'all' as const, label: isTr ? 'Tümü' : 'All', count: tasks.length },
                { id: 'todo' as const, label: isTr ? 'Aktif' : 'Active', count: pendingCount },
                { id: 'done' as const, label: isTr ? 'Biten' : 'Done', count: completedCount },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setListFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                    listFilter === tab.id
                      ? 'bg-amber-500 text-stone-950 font-bold'
                      : 'bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className="text-[10px] font-mono opacity-80">({tab.count})</span>
                </button>
              ))}
            </div>

            {/* Instant Top-Level Delete Actions */}
            <div className="flex items-center gap-1.5 ml-auto">
              {completedCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    clearCompletedTasks();
                    webAudioEngine.init();
                    webAudioEngine.playChime('wood_block');
                    showToast(
                      isTr ? 'Tamamlanan görevler silindi ✨' : 'Completed tasks cleared ✨',
                      1800
                    );
                  }}
                  className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-[11px] font-semibold text-stone-300 hover:text-amber-300 transition-colors cursor-pointer"
                >
                  {isTr ? 'Bitenleri Sil' : 'Clear Done'}
                </button>
              )}

              {confirmClearAll ? (
                <div className="flex items-center gap-1 bg-red-950/80 border border-red-500/50 rounded-lg px-1.5 py-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      clearAllTasks();
                      setConfirmClearAll(false);
                      webAudioEngine.init();
                      webAudioEngine.playChime('wood_block');
                      showToast(isTr ? 'Tüm görevler silindi 🗑️' : 'All tasks deleted 🗑️', 1800);
                    }}
                    className="px-2 py-0.5 rounded bg-red-600 hover:bg-red-500 text-white font-bold text-[11px] cursor-pointer"
                  >
                    {isTr ? 'Onayla' : 'Confirm'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearAll(false)}
                    className="px-1.5 py-0.5 text-stone-300 hover:text-white text-[11px] cursor-pointer"
                  >
                    {isTr ? 'İptal' : 'Cancel'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(true)}
                  className="px-2.5 py-1 rounded-lg bg-red-950/50 hover:bg-red-900/60 border border-red-500/35 text-[11px] font-semibold text-red-300 hover:text-red-200 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{isTr ? 'Tümünü Sil' : 'Delete All'}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* 4. Scrollable Task List / Kanban Area (Generous bottom padding so nothing is ever cut off) */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pt-3 pb-14 custom-scrollbar">
          {tasks.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-stone-800 bg-stone-900/30 flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xl text-amber-400">
                📋
              </div>
              <div>
                <h4 className="text-sm font-bold text-stone-200">
                  {isTr ? 'Görev Listeniz Boş' : 'Your Task List is Empty'}
                </h4>
                <p className="text-xs text-stone-400 mt-1 max-w-xs mx-auto leading-relaxed">
                  {isTr
                    ? 'Yukarıdan yeni bir görev yazıp ekleyin veya hızlı başlangıç şablonlarından birini seçin:'
                    : 'Type a new task above or tap a quick starter below:'}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                {[
                  isTr ? '📚 40 Soru Çözümü & Konu Tekrarı' : '📚 Solve 40 Practice Questions',
                  isTr ? '💻 Proje & Algoritma Çalışması' : '💻 Coding & Algorithm Practice',
                  isTr ? '📖 25 Sayfa Kitap / Makale Oku' : '📖 Read 25 Pages',
                ].map((label, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      addTask(label, 'medium', 'Genel', 1, 'todo');
                      webAudioEngine.init();
                      webAudioEngine.playChime('wood_block');
                    }}
                    className="px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700/80 hover:border-amber-500/40 text-xs text-stone-200 hover:text-amber-200 transition-all cursor-pointer active:scale-95"
                  >
                    + {label}
                  </button>
                ))}
              </div>
            </div>
          ) : viewMode === 'list' ? (
            <div className="space-y-2.5">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-8 px-4 rounded-2xl border border-dashed border-stone-800 text-xs text-stone-400">
                  {isTr ? 'Bu filtrede görev bulunmuyor.' : 'No tasks in this filter.'}
                </div>
              ) : (
                filteredTasks.map((task) => {
                  const isDone = task.status === 'done';
                  const isFocused = task.id === activeTaskId;
                  const pInfo = priorityBadge(task.priority);

                  return (
                    <div
                      key={task.id}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isFocused
                          ? 'bg-amber-950/25 border-amber-500/60 shadow-md shadow-amber-950/30'
                          : isDone
                            ? 'bg-stone-900/40 border-stone-800/60 opacity-75'
                            : 'bg-stone-900/85 border-stone-800 hover:border-stone-700'
                      }`}
                    >
                      {/* Left: 1-Tap Checkbox + Task Content */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => {
                            const nextStatus = isDone ? 'todo' : 'done';
                            updateTaskStatus(task.id, nextStatus);
                            webAudioEngine.init();
                            if (nextStatus === 'done') {
                              webAudioEngine.playZenChime('finish');
                            } else {
                              webAudioEngine.playChime('wood_block');
                            }
                          }}
                          className="mt-0.5 p-1 -ml-1 rounded-xl text-stone-400 hover:text-amber-400 active:scale-90 transition-all cursor-pointer shrink-0"
                          title={isDone ? (isTr ? 'Geri Al' : 'Mark Undone') : (isTr ? 'Tamamla' : 'Complete')}
                        >
                          {isDone ? (
                            <CheckSquare className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div
                            onClick={() => {
                              const nextStatus = isDone ? 'todo' : 'done';
                              updateTaskStatus(task.id, nextStatus);
                            }}
                            className={`text-sm font-semibold leading-snug break-words cursor-pointer ${
                              isDone ? 'line-through text-stone-500' : 'text-stone-100'
                            }`}
                          >
                            {task.title}
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${pInfo.cls}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${pInfo.dot}`} />
                              <span>{pInfo.label}</span>
                            </span>

                            <button
                              type="button"
                              onClick={() => {
                                setActiveTaskId(isFocused ? null : task.id);
                                webAudioEngine.init();
                                webAudioEngine.playChime('wood_block');
                              }}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-colors cursor-pointer flex items-center gap-1 ${
                                isFocused
                                  ? 'bg-amber-500 text-stone-950 border-amber-400'
                                  : 'bg-stone-950/80 text-stone-400 hover:text-stone-200 border-stone-800'
                              }`}
                            >
                              <Target className="w-3 h-3" />
                              <span>{isFocused ? (isTr ? 'Aktif Odak' : 'Active') : (isTr ? 'Odaklan' : 'Focus')}</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Right: Unmistakable Edit & Delete Buttons (Never hidden or clipped!) */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditModal(task)}
                          className="w-9 h-9 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 text-stone-300 hover:text-amber-300 flex items-center justify-center transition-all cursor-pointer active:scale-90"
                          title={isTr ? 'Düzenle' : 'Edit'}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteTask(e, task)}
                          className="px-2.5 h-9 rounded-xl bg-red-950/60 hover:bg-red-900/80 border border-red-500/40 text-red-300 hover:text-white flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-90 shadow-sm"
                          title={isTr ? 'Görevi Sil' : 'Delete Task'}
                        >
                          <Trash2 className="w-4 h-4 shrink-0" />
                          <span className="text-xs font-bold">{isTr ? 'Sil' : 'Del'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* Clean Kanban Board */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {kanbanColumns.map((col) => {
                const colTasks = tasks.filter((t) => t.status === col.id);
                return (
                  <div
                    key={col.id}
                    className="rounded-2xl p-3 bg-stone-900/60 border border-stone-800/90 flex flex-col gap-2.5"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-stone-800">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                        <span className="text-xs font-bold uppercase tracking-wider text-stone-200">
                          {col.title}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-stone-950 text-stone-400">
                        {colTasks.length}
                      </span>
                    </div>

                    {colTasks.length === 0 ? (
                      <div className="py-6 text-center text-xs text-stone-500 flex flex-col items-center gap-1">
                        <Sparkles className="w-4 h-4 opacity-40" />
                        <span>{isTr ? 'Bu sütunda görev yok' : 'No tasks here'}</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {colTasks.map((t) => {
                          const pInfo = priorityBadge(t.priority);
                          return (
                            <div
                              key={t.id}
                              className="p-3 rounded-xl bg-stone-950/90 border border-stone-800 flex flex-col gap-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span
                                  className={`text-xs font-semibold break-words flex-1 ${
                                    t.status === 'done' ? 'line-through text-stone-500' : 'text-stone-100'
                                  }`}
                                >
                                  {t.title}
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => openEditModal(t)}
                                    className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-amber-300 cursor-pointer"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteTask(e, t)}
                                    className="px-2 py-1 rounded-lg bg-red-950/60 hover:bg-red-900/80 border border-red-500/40 text-red-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>{isTr ? 'Sil' : 'Del'}</span>
                                  </button>
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-1 pt-1 border-t border-stone-900">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${pInfo.cls}`}>
                                  {pInfo.label}
                                </span>
                                <div className="flex items-center gap-1">
                                  {(['todo', 'in_progress', 'done'] as TaskStatus[]).map((st) => (
                                    <button
                                      key={st}
                                      type="button"
                                      onClick={() => moveTask(t.id, st)}
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                                        t.status === st
                                          ? 'bg-amber-500 text-stone-950'
                                          : 'bg-stone-900 text-stone-400 hover:text-white'
                                      }`}
                                    >
                                      {st === 'todo'
                                        ? isTr
                                          ? 'Yapılacak'
                                          : 'Todo'
                                        : st === 'in_progress'
                                          ? isTr
                                            ? 'Aktif'
                                            : 'Active'
                                          : isTr
                                            ? 'Bitti'
                                            : 'Done'}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit Task Modal */}
      {editingTask && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in pointer-events-auto"
          onClick={(e) => {
            e.stopPropagation();
            if (e.target === e.currentTarget) setEditingTask(null);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl w-full max-w-md p-5 flex flex-col gap-4 text-stone-100"
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <h3 className="font-bold text-base text-white">
                {isTr ? 'Görevi Düzenle' : 'Edit Task'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">
                  {isTr ? 'Görev Başlığı' : 'Task Title'}
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1.5">
                    {isTr ? 'Durum' : 'Status'}
                  </label>
                  <select
                    value={modalStatus}
                    onChange={(e) => setModalStatus(e.target.value as TaskStatus)}
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2.5 text-xs text-stone-200 focus:outline-none"
                  >
                    <option value="todo">{isTr ? '📋 Yapılacak' : '📋 To Do'}</option>
                    <option value="in_progress">{isTr ? '⚡ Çalışılıyor' : '⚡ Active'}</option>
                    <option value="done">{isTr ? '✅ Tamamlandı' : '✅ Done'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1.5">
                    {isTr ? 'Öncelik' : 'Priority'}
                  </label>
                  <select
                    value={modalPriority}
                    onChange={(e) => setModalPriority(e.target.value as TaskPriority)}
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2.5 text-xs text-stone-200 focus:outline-none"
                  >
                    <option value="high">{isTr ? '🔴 Önemli' : '🔴 High'}</option>
                    <option value="medium">{isTr ? '🟡 Normal' : '🟡 Medium'}</option>
                    <option value="low">{isTr ? '🟢 Düşük' : '🟢 Low'}</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={(e) => {
                    handleDeleteTask(e, editingTask);
                    setEditingTask(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/80 border border-red-500/40 text-red-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isTr ? 'Görevi Sil' : 'Delete'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingTask(null)}
                    className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold cursor-pointer"
                  >
                    {isTr ? 'Vazgeç' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>{isTr ? 'Kaydet' : 'Save'}</span>
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
