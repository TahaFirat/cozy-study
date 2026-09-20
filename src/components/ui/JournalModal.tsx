import React, { useState } from 'react';
import { X, BookOpen, Clock, Trash2, Plus, Calendar, Download } from 'lucide-react';
import { useStatsStore } from '../../store/useStatsStore';
import { useAppStore } from '../../store/useAppStore';
import { ROOMS } from '../../audio/soundPresets';
import { TRANSLATIONS, getRoomTranslation } from '../../i18n/translations';

export const JournalModal: React.FC = () => {
  const { activeModal, setActiveModal, activeRoom, showToast, language } = useAppStore();
  const { sessions, deleteSession, recordSession } = useStatsStore();

  const [newNote, setNewNote] = useState('');
  const [newMins, setNewMins] = useState(25);
  const [isAddingManual, setIsAddingManual] = useState(false);

  if (activeModal !== 'journal') return null;

  const t = TRANSLATIONS[language];

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    recordSession(newMins, activeRoom, newNote.trim());
    setNewNote('');
    setIsAddingManual(false);
    showToast(t.toasts.journalSaved, 2500);
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Export Journal to Markdown file (Optimization #10)
  const handleExportMarkdown = () => {
    if (sessions.length === 0) return;
    let md = `# ${t.journalModal.title} - ${new Date().toLocaleDateString()}\n\n`;
    sessions.forEach((s) => {
      const room = ROOMS.find((r) => r.id === s.roomId)?.name || s.roomId;
      const dateStr = new Date(s.timestamp).toLocaleString();
      md += `### ${dateStr} - ${s.durationMinutes} min (${room})\n`;
      md += s.note ? `> ${s.note}\n\n` : `_Sessiz odaklanma seansı._\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `study_journal_${new Date().toISOString().slice(0, 10)}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(language === 'tr' ? 'Günlük Markdown olarak indirildi 📄' : 'Journal exported to Markdown 📄', 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm pointer-events-auto">
      <div className="bg-stone-900/95 text-stone-100 border border-stone-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-base font-bold text-amber-200">{t.journalModal.title}</h3>
              <p className="text-xs text-stone-400">{t.journalModal.subtitle}</p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal('none')}
            className="p-1.5 text-stone-400 hover:text-stone-100 rounded-lg hover:bg-stone-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action button to add reflection & export */}
        <div className="py-3 flex items-center justify-between border-b border-stone-800">
          <span className="text-xs font-semibold text-stone-300">
            {t.journalModal.recordedCount(sessions.length)}
          </span>
          <div className="flex items-center gap-2">
            {sessions.length > 0 && (
              <button
                onClick={handleExportMarkdown}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-stone-100 text-xs font-medium border border-stone-700 cursor-pointer transition-colors"
                title={t.journalModal.export}
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.journalModal.export}</span>
              </button>
            )}
            <button
              onClick={() => setIsAddingManual(!isAddingManual)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold border border-amber-500/40 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{t.journalModal.addReflection}</span>
            </button>
          </div>
        </div>

        {/* Add Note Manual Drawer */}
        {isAddingManual && (
          <form onSubmit={handleManualAdd} className="py-3.5 px-4 bg-stone-950/60 border border-stone-800 rounded-xl my-2.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-amber-200">{t.journalModal.newEntry}</span>
              <div className="flex items-center gap-2 text-xs text-stone-300">
                <span>{t.journalModal.duration}</span>
                <select
                  value={newMins}
                  onChange={(e) => setNewMins(Number(e.target.value))}
                  className="bg-stone-800 text-stone-200 text-xs px-2.5 py-1 rounded-md border border-stone-700"
                >
                  <option value={15}>15 dk</option>
                  <option value={25}>25 dk</option>
                  <option value={50}>50 dk</option>
                  <option value={90}>90 dk</option>
                  <option value={120}>120 dk</option>
                </select>
              </div>
            </div>

            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder={t.journalModal.placeholder}
              rows={3}
              className="w-full bg-stone-900 border border-stone-700/80 rounded-lg p-3 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 resize-none font-sans"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddingManual(false)}
                className="px-3.5 py-1.5 rounded-lg bg-stone-800 text-stone-400 text-xs font-medium cursor-pointer"
              >
                {t.timer.cancel}
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-amber-500 text-stone-950 font-semibold text-xs hover:bg-amber-400 cursor-pointer shadow"
              >
                {t.journalModal.save}
              </button>
            </div>
          </form>
        )}

        {/* Sessions Journal List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
          {sessions.length === 0 ? (
            <div className="text-center py-12 text-stone-400 text-sm">
              <p>{t.journalModal.empty}</p>
              <p className="text-xs mt-1 text-stone-500">{t.journalModal.emptySub}</p>
            </div>
          ) : (
            sessions.map((session) => {
              const room = ROOMS.find((r) => r.id === session.roomId) || ROOMS[0];
              const localizedRoomName = getRoomTranslation(language, session.roomId)?.name || room.name;
              return (
                <div
                  key={session.id}
                  className="p-3.5 bg-stone-950/40 border border-stone-800/80 rounded-xl hover:border-stone-700 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-300 flex items-center gap-1 font-mono">
                        <Clock className="w-3.5 h-3.5" />
                        +{session.durationMinutes} {language === 'tr' ? 'dk' : 'min'}
                      </span>
                      <span className="text-stone-600">•</span>
                      <span className="text-xs text-stone-300 font-medium">
                        {localizedRoomName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-400 flex items-center gap-1 font-mono">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(session.timestamp)}
                      </span>
                      <button
                        onClick={() => deleteSession(session.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-stone-500 hover:text-red-400 transition-opacity cursor-pointer"
                        title="Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {session.note ? (
                    <p className="text-sm text-stone-200 mt-2.5 leading-relaxed bg-stone-900/50 p-2.5 rounded-lg border border-stone-800/50 italic">
                      “{session.note}”
                    </p>
                  ) : (
                    <p className="text-xs text-stone-400 mt-1.5 italic">
                      {language === 'tr' ? 'Sessiz derin odaklanma seansı.' : 'Silent focus session.'}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3.5 border-t border-stone-800 flex justify-end">
          <button
            onClick={() => setActiveModal('none')}
            className="px-5 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold cursor-pointer transition-colors"
          >
            {t.stats.close}
          </button>
        </div>
      </div>
    </div>
  );
};
