import React, { useRef, useEffect, useState } from 'react';
import { X, Download, Copy, Sparkles, Check, Share2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useStatsStore } from '../../store/useStatsStore';
import { useTimerStore } from '../../store/useTimerStore';
import { ROOM_CONFIGS } from '../../engine/roomConfigs';
import { TRANSLATIONS } from '../../i18n/translations';

export const SessionShareModal: React.FC = () => {
  const { activeModal, setActiveModal, language, activeRoom, weather, showToast } = useAppStore();
  const { streakDays, getTotalFocusHours } = useStatsStore();
  const { lastCompletedMinutes, currentGoal } = useTimerStore();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);
  const isTr = language === 'tr';
  const t = TRANSLATIONS[language];

  const cfg = ROOM_CONFIGS[activeRoom] || ROOM_CONFIGS.bedroom;

  // Render 9:16 Story Canvas
  useEffect(() => {
    if (activeModal !== 'session_share' || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = 540;
    const h = 960;
    canvas.width = w;
    canvas.height = h;

    // 1. Dark Gradient Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0c0a09');
    bgGrad.addColorStop(0.4, '#1c1917');
    bgGrad.addColorStop(1, '#0c0a09');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Ambient room artwork preview (blurred / framed at top)
    const img = new Image();
    img.src = cfg.imageSrc;
    img.onload = () => {
      ctx.save();
      // Draw framed room image
      ctx.beginPath();
      ctx.roundRect(40, 110, w - 80, 260, 24);
      ctx.clip();
      ctx.drawImage(img, 40, 110, w - 80, 260);

      // Soft vignette on top of room image
      const imgVignette = ctx.createLinearGradient(0, 110, 0, 370);
      imgVignette.addColorStop(0, 'rgba(0,0,0,0.1)');
      imgVignette.addColorStop(1, 'rgba(12,10,9,0.7)');
      ctx.fillStyle = imgVignette;
      ctx.fillRect(40, 110, w - 80, 260);
      ctx.restore();

      // Border around room image
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(40, 110, w - 80, 260, 24);
      ctx.stroke();

      drawTextAndOverlays();
    };

    const drawTextAndOverlays = () => {
      // 3. Header Branding
      ctx.fillStyle = '#fef3c7';
      ctx.font = 'bold 13px sans-serif';
      ctx.letterSpacing = '3px';
      ctx.textAlign = 'center';
      ctx.fillText('✦ COZY FOCUS • STUDY SANCTUARY ✦', w / 2, 65);

      ctx.fillStyle = '#a8a29e';
      ctx.font = '11px monospace';
      ctx.letterSpacing = '1px';
      const nowStr = new Date().toLocaleDateString(isTr ? 'tr-TR' : 'en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });
      ctx.fillText(nowStr.toUpperCase(), w / 2, 85);

      // 4. Center Metrics Box
      const boxY = 405;
      ctx.fillStyle = 'rgba(28, 25, 23, 0.85)';
      ctx.beginPath();
      ctx.roundRect(40, boxY, w - 80, 390, 24);
      ctx.fill();

      ctx.strokeStyle = 'rgba(251, 191, 36, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Big Duration Number
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fde047';
      ctx.font = '900 68px monospace';
      ctx.fillText(`${lastCompletedMinutes || 25}`, w / 2, boxY + 80);

      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 16px sans-serif';
      ctx.letterSpacing = '2px';
      ctx.fillText(isTr ? 'DAKİKA DERİN ODAK' : 'MINUTES OF DEEP WORK', w / 2, boxY + 110);

      // Divider
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.moveTo(80, boxY + 140);
      ctx.lineTo(w - 80, boxY + 140);
      ctx.stroke();

      // North Star Goal / Tag
      if (currentGoal) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(isTr ? '🎯 TAMAMLANAN HEDEF' : '🎯 COMPLETED GOAL', w / 2, boxY + 175);

        ctx.fillStyle = '#f5f5f4';
        ctx.font = '15px sans-serif';
        const displayGoal = currentGoal.length > 32 ? currentGoal.slice(0, 30) + '…' : currentGoal;
        ctx.fillText(`"${displayGoal}"`, w / 2, boxY + 205);
      } else {
        ctx.fillStyle = '#a8a29e';
        ctx.font = 'italic 14px sans-serif';
        ctx.fillText(isTr ? '"Sessiz, kesintisiz çalışma ve dinginlik."' : '"Quiet, uninterrupted flow and peace."', w / 2, boxY + 190);
      }

      // 3 Stat Badges Grid
      const badgeY = boxY + 265;
      const bW = 135;
      const bH = 75;

      // Badge 1: Streak
      drawMetricBadge(60, badgeY, bW, bH, '🔥', `${streakDays} ${isTr ? 'Gün' : 'Days'}`, isTr ? 'Seri' : 'Streak');

      // Badge 2: All Time Hours
      drawMetricBadge(205, badgeY, bW, bH, '⏳', `${getTotalFocusHours()}h`, isTr ? 'Toplam' : 'Total');

      // Badge 3: Room
      drawMetricBadge(350, badgeY, bW, bH, '🌿', activeRoom, isTr ? 'Mekan' : 'Room');

      // 5. Footer Watermark
      ctx.fillStyle = '#78716c';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('cozy-room • study with me', w / 2, h - 55);
    };

    const drawMetricBadge = (x: number, y: number, bw: number, bh: number, icon: string, val: string, label: string) => {
      ctx.fillStyle = 'rgba(12, 10, 9, 0.7)';
      ctx.beginPath();
      ctx.roundRect(x, y, bw, bh, 16);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.stroke();

      ctx.fillStyle = '#f5f5f4';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${icon} ${val}`, x + bw / 2, y + 36);

      ctx.fillStyle = '#78716c';
      ctx.font = '11px sans-serif';
      ctx.fillText(label, x + bw / 2, y + 56);
    };

    if (img.complete) {
      img.onload?.(new Event('load'));
    }
  }, [activeModal, lastCompletedMinutes, currentGoal, streakDays, activeRoom, weather, isTr]);

  if (activeModal !== 'session_share') return null;

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `cozy_focus_story_${Date.now()}.png`;
    a.click();
    showToast(isTr ? '📥 Hikaye görseli indirildi!' : '📥 Story card downloaded!', 2500);
  };

  const handleCopyClipboard = async () => {
    if (!canvasRef.current) return;
    try {
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setCopied(true);
        showToast(isTr ? '📋 Panoya kopyalandı! (Instagram veya X\'e yapıştır)' : '📋 Copied to clipboard!', 3000);
        setTimeout(() => setCopied(false), 2500);
      });
    } catch {
      handleDownload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md pointer-events-auto">
      <div className="bg-stone-900/95 text-stone-100 border border-stone-800 rounded-3xl shadow-2xl p-6 w-full max-w-md max-h-[95vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">📸</span>
            <div>
              <h3 className="text-sm font-bold text-amber-200">
                {isTr ? 'Sosyal Hikaye Kartı (9:16)' : 'Social Story Card (9:16)'}
              </h3>
              <p className="text-[11px] text-stone-400">
                {isTr ? 'Instagram Story & X için estetik odak kartı' : 'Aesthetic card for Instagram Stories & X'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal('none')}
            className="p-1.5 text-stone-400 hover:text-stone-100 rounded-lg hover:bg-stone-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Story Card Canvas Preview */}
        <div className="flex-1 overflow-y-auto py-3 flex items-center justify-center">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-stone-800 max-h-[62vh] aspect-[9/16]">
            <canvas
              ref={canvasRef}
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-stone-800 flex items-center justify-between gap-2">
          <button
            onClick={handleCopyClipboard}
            className="flex-1 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors border border-stone-700"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? (isTr ? 'Kopyalandı!' : 'Copied!') : (isTr ? 'Panoya Kopyala' : 'Copy Image')}</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-md"
          >
            <Download className="w-4 h-4" />
            <span>{isTr ? 'PNG İndir' : 'Download PNG'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
