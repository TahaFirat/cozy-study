import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface StudyTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  category: string;
  pomodoroEstimate: number;
  pomodorosCompleted: number;
  createdAt: string;
  completedAt?: string;
}

interface TaskState {
  tasks: StudyTask[];
  activeTaskId: string | null;
  sessionIntent: string;
  isTaskDrawerOpen: boolean;

  // Actions
  addTask: (title: string, priority?: TaskPriority, category?: string, pomodoroEstimate?: number, status?: TaskStatus) => void;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
  moveTask: (id: string, targetStatus: TaskStatus, targetIndex?: number) => void;
  reorderTasks: (tasks: StudyTask[]) => void;
  deleteTask: (id: string) => void;
  setActiveTaskId: (id: string | null) => void;
  incrementTaskPomodoro: (id: string) => void;
  setSessionIntent: (intent: string) => void;
  toggleTaskDrawer: () => void;
  setTaskDrawerOpen: (open: boolean) => void;
  clearCompletedTasks: () => void;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [
        {
          id: 'task-1',
          title: 'React state yönetimi mimarisini incele',
          status: 'in_progress',
          priority: 'high',
          category: 'Yazılım',
          pomodoroEstimate: 2,
          pomodorosCompleted: 1,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'task-2',
          title: 'İngilizce makale okuması (30 sayfa)',
          status: 'todo',
          priority: 'medium',
          category: 'Çalışma',
          pomodoroEstimate: 3,
          pomodorosCompleted: 0,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'task-3',
          title: 'Günün ders notlarını düzenle',
          status: 'done',
          priority: 'low',
          category: 'Notlar',
          pomodoroEstimate: 1,
          pomodorosCompleted: 1,
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        }
      ],
      activeTaskId: 'task-1',
      sessionIntent: 'Derin odaklanmayla bugünkü kodlama modülünü tamamla ✨',
      isTaskDrawerOpen: false,

      addTask: (title, priority = 'medium', category = 'Genel', pomodoroEstimate = 1, status = 'todo') => {
        const newTask: StudyTask = {
          id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          title,
          status,
          priority,
          category,
          pomodoroEstimate,
          pomodorosCompleted: 0,
          createdAt: new Date().toISOString(),
          completedAt: status === 'done' ? new Date().toISOString() : undefined,
        };
        set((state) => ({ tasks: [newTask, ...state.tasks] }));
      },

      updateTaskStatus: (id, status) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  status,
                  completedAt: status === 'done' ? new Date().toISOString() : undefined,
                }
              : t
          ),
        }));
      },

      moveTask: (id, targetStatus, targetIndex) => {
        set((state) => {
          const taskIndex = state.tasks.findIndex((t) => t.id === id);
          if (taskIndex === -1) return state;

          const task = state.tasks[taskIndex];
          const isNowDone = targetStatus === 'done';

          const updatedTask: StudyTask = {
            ...task,
            status: targetStatus,
            completedAt: isNowDone ? (task.completedAt || new Date().toISOString()) : undefined,
          };

          const newTasks = state.tasks.filter((t) => t.id !== id);

          if (typeof targetIndex === 'number' && targetIndex >= 0) {
            const targetColTasks = newTasks.filter((t) => t.status === targetStatus);
            if (targetIndex < targetColTasks.length) {
              const refTask = targetColTasks[targetIndex];
              const insertIdx = newTasks.indexOf(refTask);
              newTasks.splice(insertIdx, 0, updatedTask);
            } else {
              const lastTaskInCol = targetColTasks[targetColTasks.length - 1];
              if (lastTaskInCol) {
                const insertIdx = newTasks.indexOf(lastTaskInCol) + 1;
                newTasks.splice(insertIdx, 0, updatedTask);
              } else {
                newTasks.push(updatedTask);
              }
            }
          } else {
            const lastTaskInCol = [...newTasks].reverse().find((t) => t.status === targetStatus);
            if (lastTaskInCol) {
              const insertIdx = newTasks.indexOf(lastTaskInCol) + 1;
              newTasks.splice(insertIdx, 0, updatedTask);
            } else {
              newTasks.push(updatedTask);
            }
          }

          return { tasks: newTasks };
        });
      },

      reorderTasks: (tasks) => set({ tasks }),

      deleteTask: (id) => {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
          activeTaskId: state.activeTaskId === id ? null : state.activeTaskId,
        }));
      },

      setActiveTaskId: (activeTaskId) => set({ activeTaskId }),

      incrementTaskPomodoro: (id) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, pomodorosCompleted: t.pomodorosCompleted + 1 } : t
          ),
        }));
      },

      setSessionIntent: (sessionIntent) => set({ sessionIntent }),
      toggleTaskDrawer: () => set((state) => ({ isTaskDrawerOpen: !state.isTaskDrawerOpen })),
      setTaskDrawerOpen: (isTaskDrawerOpen) => set({ isTaskDrawerOpen }),
      clearCompletedTasks: () => {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.status !== 'done'),
        }));
      },
    }),
    {
      name: 'cozy_room_tasks',
    }
  )
);
