import React, { useState, useEffect, useRef } from 'react';
import { X, ShieldAlert, Swords, Trophy, Sparkles, Flame, CheckCircle, RotateCcw, Zap, Globe, Users } from 'lucide-react';
import { useBossRaidStore, BossId } from '../../store/useBossRaidStore';
import { useAppStore } from '../../store/useAppStore';
import { useTimerStore } from '../../store/useTimerStore';
import { webAudioEngine } from '../../audio/WebAudioEngine';
import { BossPixelRenderer } from '../../engine/BossPixelRenderer';

export const BossRaidModal: React.FC = () => {
  const { activeModal, setActiveModal, language, showToast } = useAppStore();
  const {
    currentBossId,
    setCurrentBoss,
    bosses,
    attackCurrentBoss,
    quickPracticeStrike,
    simulateCommunityAttack,
    resetBoss,
    unlockedTrophies,
    totalBossDamageDealt,
    personalDamagePerBoss,
    globalRaidersCount,
    combatLogs,
    lastAttackResult,
  } = useBossRaidStore();
  const { currentGoal } = useTimerStore();

  const [activeTab, setActiveTab] = useState<'arena' | 'trophies' | 'logs'>('arena');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<BossPixelRenderer>(new BossPixelRenderer());
  const lastTimeRef = useRef<number>(performance.now());
  const lastProcessedAttackRef = useRef<number>(0);

  const isTr = language === 'tr';
  const boss = bosses[currentBossId] || bosses.horologium || Object.values(bosses)[0];

  // Fighting-Game Grade "Ghost Damage" trailing health bar
  const [ghostHp, setGhostHp] = useState<number>(boss ? boss.currentHp : 100000);
  const ghostTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!boss) return;
    if (boss.currentHp < ghostHp) {
      if (ghostTimerRef.current) clearTimeout(ghostTimerRef.current);
      ghostTimerRef.current = setTimeout(() => {
        setGhostHp(boss.currentHp);
      }, 400);
    } else {
      setGhostHp(boss.currentHp);
    }
    return () => {
      if (ghostTimerRef.current) clearTimeout(ghostTimerRef.current);
    };
  }, [boss?.currentHp, boss?.id]);

  const bossMaxHp = Math.max(1, boss?.maxHp || 100000);
  const hpPercent = Math.max(0, Math.min(100, Math.round(((boss?.currentHp || 0) / bossMaxHp) * 100)));
  const ghostPercent = Math.max(0, Math.min(100, Math.round((ghostHp / bossMaxHp) * 100)));

  // Periodic simulated live community attack tick while modal is active
  useEffect(() => {
    if (activeModal !== 'boss_raid') return;
    const interval = setInterval(() => {
      simulateCommunityAttack();
    }, 7500);
    return () => clearInterval(interval);
  }, [activeModal, simulateCommunityAttack]);

  // Listen for attack results to trigger canvas hit reactions & audio
  useEffect(() => {
    if (lastAttackResult && lastAttackResult.timestamp > lastProcessedAttackRef.current) {
      lastProcessedAttackRef.current = lastAttackResult.timestamp;
      rendererRef.current.triggerHit(
        lastAttackResult.damage,
        lastAttackResult.isCritical,
        boss.themeColor
      );
      if (lastAttackResult.defeated) {
        rendererRef.current.triggerDefeat(boss.themeColor);
      }
    }
  }, [lastAttackResult, boss.themeColor]);

  // Clear combat VFX when switching active boss
  useEffect(() => {
    rendererRef.current.clearCombatVFX();
  }, [currentBossId]);

  // Master 60FPS Boss Animation & Combat VFX Loop
  useEffect(() => {
    if (activeModal !== 'boss_raid' || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    lastTimeRef.current = performance.now();

    const loop = (time: number) => {
      const dt = Math.min(0.1, (time - lastTimeRef.current) / 1000);
      lastTimeRef.current = time;

      rendererRef.current.render(
        ctx,
        canvas.width,
        canvas.height,
        boss.id,
        boss.currentHp,
        boss.maxHp,
        boss.isDefeated,
        boss.themeColor,
        dt,
        time
      );

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [activeModal, currentBossId, boss.id, boss.currentHp, boss.maxHp, boss.isDefeated, boss.themeColor]);

  if (activeModal !== 'boss_raid') return null;

  // Manual & Test Attack Triggers
  const handleTestAttack = (isHeavyCrit = false) => {
    webAudioEngine.init();
    if (boss.isDefeated) {
      showToast(isTr ? 'Bu boss zaten alt edildi! Yeniden meydan oku.' : 'Boss already defeated! Rematch to fight again.', 3000);
      return;
    }

    if (isHeavyCrit) {
      // 50m Critical Attack (250 x 2 = 500 DMG)
      attackCurrentBoss(50, true);
    } else {
      // 25m Focus Attack (100 DMG or 200 with pledge)
      const hasGoal = !!currentGoal.trim();
      attackCurrentBoss(25, hasGoal);
    }
  };

  const handlePracticeClick = () => {
    webAudioEngine.init();
    if (boss.isDefeated) {
      showToast(isTr ? 'Bu boss zaten alt edildi! Yeniden meydan oku.' : 'Boss already defeated! Rematch to fight again.', 3000);
      return;
    }
    quickPracticeStrike();
  };

  const handleArenaClick = () => {
    if (boss.isDefeated) return;
    handlePracticeClick();
  };

  // Boss Phase Status calculation
  const getPhaseBadge = () => {
    if (boss.isDefeated) {
      return (
        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/40 flex items-center gap-1">
          <span>👑</span> {isTr ? 'FETHEDİLDİ' : 'SLAIN'}
        </span>
      );
    }
    if (hpPercent < 25) {
      return (
        <span className="text-[10px] bg-red-500/25 text-red-300 font-bold px-2 py-0.5 rounded-full border border-red-500/50 animate-pulse flex items-center gap-1">
          <span>🔥</span> {isTr ? 'ÖFKE MODU' : 'ENRAGED'}
        </span>
      );
    }
    if (hpPercent < 75) {
      return (
        <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
          <span>⚡</span> {isTr ? 'YARALI' : 'DAMAGED'}
        </span>
      );
    }
    return (
      <span className="text-[10px] bg-sky-500/20 text-sky-300 font-bold px-2 py-0.5 rounded-full border border-sky-500/30 flex items-center gap-1">
        <span>🛡️</span> {isTr ? 'DİRENÇLİ' : 'GUARDED'}
      </span>
    );
  };

  const myBossDmg = personalDamagePerBoss[boss.id] || 0;
  const myDmgPct = boss.maxHp > 0 ? ((myBossDmg / boss.maxHp) * 100).toFixed(1) : '0.0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 bg-black/85 backdrop-blur-md pointer-events-auto">
      <div className="bg-stone-900/98 text-stone-100 border border-stone-800 rounded-3xl shadow-2xl p-3.5 sm:p-4 w-full max-w-3xl max-h-[96vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header with Global Community Raid Indicator */}
        <div className="flex items-center justify-between pb-2 border-b border-stone-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-stone-800 border border-stone-700/70 flex items-center justify-center text-base shadow-sm">
              ⚔️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-stone-100">
                  {isTr ? 'Kronos Diyarı: Küresel Boss Akını' : 'Chronos Realm: Global Boss Raids'}
                </h3>
                <span className="text-[10px] bg-amber-500/15 text-amber-300 font-mono px-2 py-0.5 rounded-full font-bold border border-amber-500/30 flex items-center gap-1">
                  <Globe className="w-3 h-3 text-amber-400" />
                  <span>Global Raid</span>
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                {isTr 
                  ? 'Dünya genelindeki tüm öğrencilerle birlikte devasa can havuzuna sahip bosslara saldır!' 
                  : 'Attack massive world raid bosses collectively alongside focused studiers worldwide!'}
              </p>
            </div>
          </div>

          {/* Right side global raiders badge */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-stone-800/80 border border-white/5 text-[11px] text-stone-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono font-bold text-emerald-300">{globalRaidersCount.toLocaleString()}</span>
              <span className="text-stone-400">{isTr ? 'Akıncı' : 'Raiders'}</span>
            </div>

            <button
              onClick={() => setActiveModal('none')}
              className="p-1 text-stone-400 hover:text-stone-100 rounded-lg hover:bg-stone-800 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 pt-2 border-b border-stone-800/80 pb-1.5">
          <button
            onClick={() => setActiveTab('arena')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'arena'
                ? 'bg-amber-500 text-stone-950 shadow-sm font-bold'
                : 'bg-stone-800/60 text-stone-400 hover:text-stone-200'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>{isTr ? 'Savaş Arenası' : 'Battle Arena'}</span>
          </button>

          <button
            onClick={() => setActiveTab('trophies')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'trophies'
                ? 'bg-amber-500 text-stone-950 shadow-sm font-bold'
                : 'bg-stone-800/60 text-stone-400 hover:text-stone-200'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>{isTr ? 'Kazanılan Kupalar' : 'Trophies & Decor'}</span>
            <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded-full font-mono font-bold">
              {unlockedTrophies.length}/4
            </span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-amber-500 text-stone-950 shadow-sm font-bold'
                : 'bg-stone-800/60 text-stone-400 hover:text-stone-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>{isTr ? 'Küresel Savaş Günlüğü' : 'Global Combat Feed'}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
          {activeTab === 'arena' && (
            <>
              {/* 4 Masterpiece Boss Selector Tabs with Live Mini-HP Gauges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.values(bosses).map((b) => {
                  const isSelected = b.id === currentBossId;
                  const bHpPct = Math.max(0, Math.round((b.currentHp / b.maxHp) * 100));

                  return (
                    <button
                      key={b.id}
                      onClick={() => {
                        setCurrentBoss(b.id as BossId);
                        rendererRef.current.clearCombatVFX();
                      }}
                      style={{
                        borderColor: isSelected ? `${b.themeColor}80` : undefined,
                      }}
                      className={`p-1.5 sm:p-2 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                        isSelected
                          ? 'bg-stone-800/90 ring-1 ring-white/10 shadow-sm'
                          : 'bg-stone-950/40 border-white/5 hover:border-white/10 hover:bg-stone-900/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <img 
                          src={`/sprites/bosses/boss_${b.id}.png`} 
                          alt={b.name} 
                          className="w-6 h-6 sm:w-7 sm:h-7 object-contain" 
                        />
                        {b.isDefeated ? (
                          <span className="text-[8px] bg-emerald-500/15 text-emerald-300 font-semibold px-1 py-0.2 rounded border border-emerald-500/25">
                            {isTr ? 'FETH' : 'SLAIN'}
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono text-stone-400 font-bold">
                            {bHpPct}%
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-bold text-stone-200 mt-1 truncate">
                        {b.name}
                      </div>
                      <div className="text-[9px] text-stone-400 truncate">
                        {b.maxHp.toLocaleString()} HP
                      </div>

                      {/* Live Mini-HP Gauge Bar */}
                      <div className="w-full bg-stone-900 h-1.5 rounded-full overflow-hidden mt-1 border border-stone-800/80">
                        <div 
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${bHpPct}%`,
                            backgroundColor: b.isDefeated ? '#10b981' : b.themeColor,
                          }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Boss Arena Stage Card */}
              <div className="p-3 bg-stone-950/50 border border-stone-800/80 rounded-2xl relative overflow-hidden flex flex-col items-center">
                
                {/* Modern Sleek Arena Container */}
                <div className="relative w-full max-w-[520px] rounded-2xl border border-white/10 bg-stone-950 overflow-hidden shadow-2xl select-none">
                  {/* Boss Canvas Viewport */}
                  <div 
                    onClick={handleArenaClick}
                    className="relative w-full h-[200px] sm:h-[235px] cursor-crosshair group"
                    title={isTr ? "Saldırmak için tıkla!" : "Click to attack!"}
                  >
                    <canvas
                      ref={canvasRef}
                      width={480}
                      height={270}
                      style={{ imageRendering: 'pixelated' }}
                      className="w-full h-full object-cover"
                    />

                    {/* Click To Strike Hint Badge */}
                    {!boss.isDefeated && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-stone-900/90 backdrop-blur-xs border border-white/15 text-stone-300 text-[10px] font-medium px-2 py-0.5 rounded-md flex items-center gap-1 shadow-md z-20">
                        <span>⚔️</span> {isTr ? 'Vurmak İçin Tıkla' : 'Click to Strike'}
                      </div>
                    )}

                    {/* Defeated Overlay Ribbon */}
                    {boss.isDefeated && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center pointer-events-none z-20 animate-in fade-in zoom-in-95">
                        <div className="px-4 py-2.5 bg-stone-900/95 border border-emerald-500/40 rounded-xl shadow-2xl text-center">
                          <span className="text-xl">👑</span>
                          <div className="text-xs font-bold text-emerald-300 tracking-wider mt-0.5">
                            {isTr ? 'KÜRESEL ZAFER!' : 'GLOBAL BOSS SLAIN'}
                          </div>
                          <div className="text-[10px] text-stone-400 mt-0.5">
                            {isTr ? 'Ganimet profil vitrinine eklendi' : 'Trophy added to showcase'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Boss Details & Health Bar */}
                <div className="text-center w-full mt-2.5">
                  <div className="flex items-center justify-center gap-2">
                    <h4 className="text-base font-bold text-stone-100 tracking-tight">
                      {boss.name}
                    </h4>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700/60">
                      {isTr ? boss.titleTr : boss.titleEn}
                    </span>
                    {getPhaseBadge()}
                  </div>

                  <p className="text-[11px] text-stone-400 mt-1 max-w-lg mx-auto leading-relaxed">
                    {isTr ? boss.descriptionTr : boss.descriptionEn}
                  </p>

                  {/* Clean Modern Health Bar with Smooth Ghost Trail */}
                  <div className="mt-2.5 max-w-md mx-auto">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-semibold text-stone-300 flex items-center gap-1.5">
                        <ShieldAlert className={`w-3.5 h-3.5 ${hpPercent < 25 ? 'text-red-400 animate-pulse' : 'text-stone-400'}`} />
                        <span>{isTr ? 'Küresel Can Havuzu' : 'Global Health Pool'}</span>
                      </span>
                      <span className="font-mono text-stone-300 font-semibold flex items-center gap-1.5">
                        <span className="text-stone-400 text-[10px]">{boss.currentHp.toLocaleString()} / {boss.maxHp.toLocaleString()} HP</span>
                        <span className={`px-1.5 py-0.2 rounded font-mono font-bold text-[10px] ${
                          hpPercent < 25 ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-stone-800 text-stone-200'
                        }`}>
                          {hpPercent}%
                        </span>
                      </span>
                    </div>

                    {/* Minimalist Health Bar Housing */}
                    <div className={`relative w-full bg-stone-950 h-3.5 rounded-full overflow-hidden border transition-all duration-300 ${
                      hpPercent < 25 
                        ? 'border-red-500/60 shadow-[0_0_12px_rgba(239,68,68,0.2)]' 
                        : 'border-white/10'
                    }`}>
                      {/* Ghost Damage Bar */}
                      <div
                        className="absolute inset-y-0 left-0 bg-amber-400/40 transition-all duration-500 ease-out z-0"
                        style={{ width: `${ghostPercent}%` }}
                      />

                      {/* Main Active Health Bar */}
                      <div
                        className="h-full transition-all duration-150 ease-out relative z-10 rounded-full"
                        style={{
                          width: `${hpPercent}%`,
                          backgroundColor: boss.themeColor,
                        }}
                      />
                    </div>

                    {/* Player Personal Contribution Bar */}
                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-stone-400 font-mono">
                      <span>{isTr ? 'Senin Katkın:' : 'Your Contribution:'} <strong className="text-amber-300">{myBossDmg.toLocaleString()} DMG ({myDmgPct}%)</strong></span>
                      <span className="text-stone-500">🏆 {myBossDmg > 2000 ? (isTr ? 'Elit Akıncı' : 'Elite Vanguard') : (isTr ? 'Akın Katılımcısı' : 'Raid Contributor')}</span>
                    </div>
                  </div>

                  {/* Goal Pledge Banner */}
                  <div className="mt-2.5 p-2 bg-stone-900/50 border border-white/5 rounded-xl max-w-md mx-auto text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2 text-left min-w-0">
                      <span className="text-sm">🎯</span>
                      <div className="min-w-0">
                        <div className="font-semibold text-stone-300 text-[11px]">
                          {isTr ? "Kuzey Yıldızı Hedefi:" : 'North Star Goal Pledge:'}
                        </div>
                        <div className="text-[10px] text-stone-400 truncate max-w-[220px]">
                          {currentGoal ? `"${currentGoal}"` : (isTr ? 'Hedef belirlenmedi (Masadaki nota tıkla)' : 'No goal set (click desk note)')}
                        </div>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold shrink-0 ${
                      currentGoal 
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' 
                        : 'bg-stone-800 text-stone-500'
                    }`}>
                      ⚡ {isTr ? '2x Kritik Vuruş' : '2x Critical'}
                    </span>
                  </div>

                  {/* Refined Modern Action Buttons */}
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                    <button
                      onClick={handlePracticeClick}
                      disabled={boss.isDefeated}
                      className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700/80 border border-white/10 text-stone-200 hover:text-white text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer active:scale-95 disabled:opacity-40"
                    >
                      <Zap className="w-3.5 h-3.5 text-sky-400" />
                      <span>{isTr ? 'Hızlı Vuruş (-80)' : 'Quick Strike (-80)'}</span>
                    </button>

                    <button
                      onClick={() => handleTestAttack(false)}
                      disabled={boss.isDefeated}
                      className="px-3.5 py-1.5 sm:py-2 rounded-xl bg-stone-800 hover:bg-stone-700/80 border border-white/10 text-stone-200 hover:text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-40"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isTr ? '25 Dk Odak Vuruşu (-100)' : '25m Focus Strike (-100)'}</span>
                    </button>

                    <button
                      onClick={() => handleTestAttack(true)}
                      disabled={boss.isDefeated}
                      className="px-3.5 py-1.5 sm:py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm hover:shadow-amber-500/20 disabled:opacity-40"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-stone-950" />
                      <span>{isTr ? '⚡ 50 Dk Kritik (-500)' : '⚡ 50m Critical (-500)'}</span>
                    </button>

                    {boss.isDefeated && (
                      <button
                        onClick={() => {
                          resetBoss(boss.id);
                          showToast(isTr ? `🔄 ${boss.name} yeniden canlandı!` : `🔄 ${boss.name} revived!`, 3000);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-200 text-xs font-semibold active:scale-95 flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <RotateCcw className="w-3 h-3 text-amber-400" />
                        <span>{isTr ? 'Yeniden Meydan Oku' : 'Rematch Boss'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'trophies' && (
            <div className="space-y-3">
              <p className="text-xs text-stone-400">
                {isTr 
                  ? 'Devasa bossları dize getirerek kazandığın kadim ganimetler ve unvanlar. Profilinde başkalarına gururla sergilenir:' 
                  : 'Ancient relics and prestigious titles earned from conquering global bosses, proudly displayed on your public profile:'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {Object.values(bosses).map((b) => {
                  const unlocked = unlockedTrophies.includes(b.trophyId);

                  return (
                    <div
                      key={b.trophyId}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        unlocked
                          ? 'bg-amber-950/20 border-amber-500/50 shadow-md'
                          : 'bg-stone-950/40 border-stone-800/80 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-2xl">{b.avatar}</span>
                        {unlocked ? (
                          <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            {isTr ? 'Kazanıldı & Profilde' : 'Earned & Showcased'}
                          </span>
                        ) : (
                          <span className="text-[10px] text-stone-500 font-mono">
                            {isTr ? 'KİLİTLİ' : 'LOCKED'}
                          </span>
                        )}
                      </div>

                      <div className="text-sm font-bold text-amber-200 mt-2">
                        {isTr ? b.trophyNameTr : b.trophyNameEn}
                      </div>
                      <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                        {isTr ? b.trophyDescTr : b.trophyDescEn}
                      </p>

                      <div className="mt-3 pt-2.5 border-t border-stone-800 flex items-center justify-between text-xs">
                        <span className="text-stone-400">{isTr ? 'Unvan:' : 'Title:'}</span>
                        <span className="font-bold text-amber-300">
                          👑 {isTr ? b.playerTitleTr : b.playerTitleEn}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-stone-400 px-1">
                <span className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isTr ? 'Dünya Çapında Canlı Odak Akışı' : 'Live Global Community Activity'}</span>
                </span>
                <span className="font-bold font-mono text-amber-300 text-sm">
                  {isTr ? `Toplam Hasar: ${totalBossDamageDealt.toLocaleString()} DMG` : `Total DMG: ${totalBossDamageDealt.toLocaleString()}`}
                </span>
              </div>

              {combatLogs.length === 0 ? (
                <div className="p-8 text-center text-stone-500 text-xs border border-dashed border-stone-800 rounded-2xl">
                  {isTr ? 'Henüz kaydedilmiş savaş hamlesi yok. Bir Pomodoro tamamla!' : 'No combat logs yet. Complete a Pomodoro!'}
                </div>
              ) : (
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {combatLogs.map((log) => {
                    const d = new Date(log.timestamp);
                    const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

                    return (
                      <div
                        key={log.id}
                        className="p-2.5 bg-stone-950/60 border border-stone-800 rounded-xl flex items-center justify-between text-xs font-mono"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-stone-500">{timeStr}</span>
                          {log.isCommunity && log.userName ? (
                            <span className="px-1.5 py-0.2 rounded bg-stone-800 text-sky-300 text-[10px] font-bold">
                              📍 {log.location || 'Global'} • {log.userName}
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                              ★ SEN
                            </span>
                          )}
                          <span className="font-bold text-stone-200 capitalize">{log.bossId}</span>
                          <span className="text-stone-400 text-[11px]">({log.minutes}m)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {log.isCritical && (
                            <span className="text-[10px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded font-bold">
                              KRİTİK!
                            </span>
                          )}
                          <span className="font-bold text-amber-300">
                            +{log.damage} DMG
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2.5 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
          <span>
            {isTr ? '⚔️ 25 dk = 100 DMG • Hedef Tamamlama = 2x Kritik • Canlı Global Akın' : '⚔️ 25m = 100 DMG • Goal Pledge = 2x Critical • Live Global Raid'}
          </span>
          <button
            onClick={() => setActiveModal('none')}
            className="px-4 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold cursor-pointer transition-colors"
          >
            {isTr ? 'Kapat' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
