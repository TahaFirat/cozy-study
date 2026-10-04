import React, { useState, useEffect, useRef } from 'react';
import { X, ShieldAlert, Swords, Trophy, Sparkles, Flame, CheckCircle, RotateCcw, Zap, Globe, Users, Lock, Award, Gift, Timer, Clock } from 'lucide-react';
import { useBossRaidStore, BossId, isFrenzyHour, getFrenzyRemainingMinutes, MILESTONE_REWARDS } from '../../store/useBossRaidStore';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useTimerStore } from '../../store/useTimerStore';
import { useGamificationStore } from '../../store/useGamificationStore';
import { useCommunityStore } from '../../store/useCommunityStore';
import { webAudioEngine } from '../../audio/WebAudioEngine';
import { BossPixelRenderer } from '../../engine/BossPixelRenderer';
import { subscribeToBossHp, subscribeToBossLeaderboard } from '../../firebase/bossRaidSync';

export const BossRaidModal: React.FC = () => {
  const { activeModal, setActiveModal, language, showToast } = useAppStore();
  const { user } = useAuthStore();
  const {
    currentBossId,
    setCurrentBoss,
    bosses,
    strikeCharges,
    executeStrike,
    attackCurrentBoss,
    quickPracticeStrike,
    resetBoss,
    unlockedTrophies,
    totalBossDamageDealt,
    personalDamagePerBoss,
    globalRaidersCount,
    combatLogs,
    lastAttackResult,
    getLeaderboard,
    seasonExpiresAt,
    sessionCombo,
    hasWellRestedBuff,
    claimedMilestones,
    activeLootReward,
    claimMilestoneChest,
    dismissLootReward,
    checkSeasonReset,
    getComboMultiplier,
    hasCatMoraleBuff,
  } = useBossRaidStore();
  const { currentGoal } = useTimerStore();
  const playerLevel = useGamificationStore((s) => s.getLevel());
  const onlineCount = useCommunityStore((s) => s.onlineCount);
  const liveRaidersCount = Math.max(1, onlineCount || globalRaidersCount || 1);

  const [activeTab, setActiveTab] = useState<'arena' | 'leaderboard' | 'trophies' | 'logs'>('arena');
  const [leaderboardMode, setLeaderboardMode] = useState<'boss_damage' | 'study_hours'>('boss_damage');
  const [nowTime, setNowTime] = useState(Date.now());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<BossPixelRenderer>(new BossPixelRenderer());
  const lastTimeRef = useRef<number>(performance.now());
  const lastProcessedAttackRef = useRef<number>(0);

  // Real-time Firestore sync for boss health & leaderboard across devices
  useEffect(() => {
    if (activeModal !== 'boss_raid') return;

    const unsubHp = subscribeToBossHp(currentBossId, (data) => {
      useBossRaidStore.setState((state) => {
        const cur = state.bosses[currentBossId];
        if (!cur) return state;
        return {
          bosses: {
            ...state.bosses,
            [currentBossId]: {
              ...cur,
              currentHp: data.currentHp,
              isDefeated: data.isDefeated,
            },
          },
        };
      });
    });

    const unsubLb = subscribeToBossLeaderboard(currentBossId, (liveEntries) => {
      if (liveEntries && liveEntries.length > 0) {
        useBossRaidStore.setState((state) => ({
          leaderboards: {
            ...state.leaderboards,
            [currentBossId]: liveEntries,
          },
        }));
      }
    });

    return () => {
      if (unsubHp) unsubHp();
      if (unsubLb) unsubLb();
    };
  }, [activeModal, currentBossId]);

  useEffect(() => {
    checkSeasonReset();
    const interval = setInterval(() => setNowTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const isTr = language === 'tr';
  const boss = bosses[currentBossId] || bosses.horologium || Object.values(bosses)[0];

  const remainingSeasonMs = Math.max(0, (seasonExpiresAt || 0) - nowTime);
  const seasonDays = Math.floor(remainingSeasonMs / (24 * 3600 * 1000));
  const seasonHours = Math.floor((remainingSeasonMs % (24 * 3600 * 1000)) / (3600 * 1000));
  const seasonMinutes = Math.floor((remainingSeasonMs % (3600 * 1000)) / (60 * 1000));
  const seasonSeconds = Math.floor((remainingSeasonMs % (60 * 1000)) / 1000);

  const frenzyActive = isFrenzyHour();
  const frenzyMinsRemaining = getFrenzyRemainingMinutes();
  const comboMult = typeof getComboMultiplier === 'function' ? getComboMultiplier() : 1.0;

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

  // Ensure player never lands on a boss whose level requirement they haven't met
  useEffect(() => {
    if (activeModal === 'boss_raid' && bosses[currentBossId]) {
      const activeBoss = bosses[currentBossId];
      if (playerLevel < (activeBoss.unlockLevel || 1)) {
        const unlocked = Object.values(bosses)
          .filter((b) => playerLevel >= (b.unlockLevel || 1))
          .sort((a, b) => b.unlockLevel - a.unlockLevel);
        if (unlocked.length > 0) {
          setCurrentBoss(unlocked[0].id);
        } else {
          setCurrentBoss('horologium');
        }
      }
    }
  }, [activeModal, currentBossId, playerLevel, bosses, setCurrentBoss]);

  const bossMaxHp = Math.max(1, boss?.maxHp || 100000);
  const hpPercent = Math.max(0, Math.min(100, Math.round(((boss?.currentHp || 0) / bossMaxHp) * 100)));
  const ghostPercent = Math.max(0, Math.min(100, Math.round((ghostHp / bossMaxHp) * 100)));

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
    let lastRenderTime = 0;
    const batterySaver = useAppStore.getState().batterySaverMode;
    const targetFps = batterySaver ? 14 : 30;
    const frameInterval = 1000 / targetFps;

    const loop = (time: number) => {
      // Completely pause GPU render when app/tab is backgrounded to eliminate battery drain & heat
      if (typeof document !== 'undefined' && document.hidden) {
        animId = requestAnimationFrame(loop);
        return;
      }

      const elapsed = time - lastRenderTime;
      if (elapsed < frameInterval) {
        animId = requestAnimationFrame(loop);
        return;
      }
      lastRenderTime = time - (elapsed % frameInterval);

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

  // Strike Attack Triggers (Consumes focus charges earned from studying)
  const handleChargeAttack = (chargeCost: number, isHeavyCrit = false) => {
    webAudioEngine.init();
    if (!user) {
      showToast(
        isTr 
          ? 'Global Boss Akınında hasar vurmak ve sıralamaya girmek için ücretsiz giriş yapın! ⚔️' 
          : 'Sign in for free to deal real raid damage and climb the leaderboard! ⚔️',
        4000
      );
      setActiveModal('auth');
      return;
    }
    if (boss.isDefeated) {
      showToast(isTr ? 'Bu boss zaten alt edildi! Yeniden meydan oku.' : 'Boss already defeated! Rematch to fight again.', 3000);
      return;
    }
    executeStrike(chargeCost, isHeavyCrit);
  };

  const handlePracticeClick = () => {
    webAudioEngine.init();
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
  const hasCatBuff = typeof hasCatMoraleBuff === 'function' ? hasCatMoraleBuff() : false;

  return (
    <div 
      onClick={() => setActiveModal('none')}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md pointer-events-auto"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-stone-900/98 text-stone-100 border border-stone-800 rounded-3xl shadow-2xl p-3.5 sm:p-5 w-full max-w-5xl max-h-[96vh] flex flex-col animate-in fade-in zoom-in-95 duration-200"
      >
        
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
              {/* Season Countdown & Frenzy Hours Header Badges */}
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <span className="text-[10px] bg-stone-800/80 text-stone-300 font-mono px-2 py-0.5 rounded-full border border-white/5 flex items-center gap-1">
                  <Timer className="w-3 h-3 text-amber-400" />
                  <span>{isTr ? 'Sezon Sonu:' : 'Season Ends:'}</span>
                  <strong className="text-amber-300">{seasonDays}g {seasonHours}s {seasonMinutes}dk {seasonSeconds}s</strong>
                </span>
                {frenzyActive && (
                  <span className="text-[10px] bg-gradient-to-r from-amber-500/20 to-amber-400/10 text-amber-200 font-mono px-2 py-0.5 rounded-full font-bold border border-amber-500/40 flex items-center gap-1 animate-pulse">
                    <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span>{isTr ? `Altın Saat (2x Yük & 1.5x Hasar • Kalan ${frenzyMinsRemaining} dk)` : `Frenzy (2x Chg & 1.5x DMG • ${frenzyMinsRemaining}m)`}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right side global raiders badge */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-stone-800/80 border border-white/5 text-[11px] text-stone-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono font-bold text-emerald-300">{liveRaidersCount.toLocaleString()}</span>
              <span className="text-stone-400">{isTr ? 'Çevrimiçi' : 'Online'}</span>
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
        {/* Navigation Tabs */}
        <div className="flex gap-2 pt-2 border-b border-stone-800/80 pb-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('arena')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'arena'
                ? 'bg-amber-500 text-stone-950 shadow-sm font-bold'
                : 'bg-stone-800/60 text-stone-400 hover:text-stone-200'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>{isTr ? 'Savaş Arenası' : 'Battle Arena'}</span>
          </button>

          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'leaderboard'
                ? 'bg-amber-500 text-stone-950 shadow-sm font-bold'
                : 'bg-stone-800/60 text-stone-400 hover:text-stone-200'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-300" />
            <span>{isTr ? 'Liderlik Tablosu' : 'Leaderboard'}</span>
          </button>

          <button
            onClick={() => setActiveTab('trophies')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'trophies'
                ? 'bg-amber-500 text-stone-950 shadow-sm font-bold'
                : 'bg-stone-800/60 text-stone-400 hover:text-stone-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>{isTr ? 'Kazanılan Kupalar' : 'Trophies & Decor'}</span>
            <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded-full font-mono font-bold">
              {Object.values(bosses).filter((b) => unlockedTrophies.includes(b.trophyId) || (Boolean(b.isDefeated) && (personalDamagePerBoss[b.id] || 0) > 0)).length}/4
            </span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'logs'
                ? 'bg-amber-500 text-stone-950 shadow-sm font-bold'
                : 'bg-stone-800/60 text-stone-400 hover:text-stone-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>{isTr ? 'Küresel Günlük' : 'Combat Feed'}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-1.5 sm:py-2 space-y-1.5 sm:space-y-2 pr-1 pb-2">
          {activeTab === 'arena' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 lg:gap-4.5 items-start mt-1">
              
              {/* LEFT COLUMN: Grand Imposing Vertical Battle Stage (lg:col-span-5) */}
              <div className="lg:col-span-5 flex flex-col space-y-2">
                <div 
                  onClick={handleArenaClick}
                  className="relative w-full h-[340px] sm:h-[420px] lg:h-[480px] rounded-2xl overflow-hidden border border-amber-500/25 bg-stone-950/80 shadow-[0_0_35px_rgba(0,0,0,0.8)] group cursor-crosshair select-none"
                  title={isTr ? "Saldırmak için tıkla!" : "Click arena to strike!"}
                >
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={500}
                    className="w-full h-full object-cover select-none pointer-events-none"
                  />

                  {/* Floating click hint overlay */}
                  <div className="absolute top-2.5 right-3 px-2 py-0.5 rounded-full bg-black/65 backdrop-blur-sm border border-white/10 text-[9px] font-mono text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isTr ? '🎯 Arenaya tıkla' : '🎯 Click arena'}
                  </div>

                  {/* Boss Health Mini Tag on Canvas */}
                  <div className="absolute top-2.5 left-3 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-[9.5px] font-mono font-bold text-amber-300">
                    {boss.name} • {hpPercent}%
                  </div>

                  {/* Defeat Golden Banner Overlay */}
                  {boss.isDefeated && (
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-3 animate-in fade-in zoom-in-95 duration-300">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-2xl shadow-[0_0_25px_rgba(245,158,11,0.5)] animate-bounce">
                        👑
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-amber-300 mt-2 font-mono tracking-wide text-center">
                        {isTr ? 'KADİM BOSS ALT EDİLDİ!' : 'TITAN DEFEATED!'}
                      </h3>
                      <p className="text-xs text-stone-300 text-center mt-1 max-w-xs">
                        {isTr 
                          ? `Tebrikler! "${boss.trophyNameTr}" vitrinine eklendi.` 
                          : `Congratulations! "${boss.trophyNameEn}" placed in showcase.`}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          resetBoss(boss.id);
                          setGhostHp(boss.maxHp);
                          showToast(isTr ? `🔄 ${boss.name} yeniden canlandı!` : `🔄 ${boss.name} revived!`, 3000);
                        }}
                        className="mt-3 px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{isTr ? 'Yeniden Meydan Oku' : 'Rematch Boss'}</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-stone-400 text-center font-mono">
                  {isTr ? '💡 Arenaya doğrudan tıklayarak da saldırabilirsin' : '💡 You can also click the arena stage to attack'}
                </div>
              </div>

              {/* RIGHT COLUMN: Tactical Command HUD & Attack Controls (lg:col-span-7) */}
              <div className="lg:col-span-7 flex flex-col space-y-2.5">
                {/* 4 Masterpiece Boss Selector Tabs with Live Mini-HP Gauges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {Object.values(bosses).map((b) => {
                    const isSelected = b.id === currentBossId;
                    const isLocked = playerLevel < (b.unlockLevel || 1);
                    const bHpPct = b.maxHp > 0 ? Math.max(0, Math.round((b.currentHp / b.maxHp) * 100)) : 0;

                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          if (isLocked) {
                            webAudioEngine.init();
                            webAudioEngine.playChime('wood_block');
                            showToast(
                              isTr
                                ? `🔒 Bu kadim boss henüz keşfedilmedi! Meydan okumak için Seviye ${b.unlockLevel} gereklidir.`
                                : `🔒 Undiscovered titan! Reach Level ${b.unlockLevel} to challenge this boss.`,
                              3000
                            );
                            return;
                          }
                          setCurrentBoss(b.id as BossId);
                          rendererRef.current.clearCombatVFX();
                        }}
                        style={{
                          borderColor: isSelected ? `${b.themeColor}80` : undefined,
                        }}
                        className={`p-1.5 rounded-xl border text-left transition-all relative overflow-hidden ${
                          isSelected
                            ? 'bg-stone-800/90 ring-1 ring-white/10 shadow-sm cursor-pointer'
                            : isLocked
                              ? 'bg-stone-950/60 border-dashed border-stone-800/80 opacity-60 hover:opacity-80 cursor-not-allowed'
                              : 'bg-stone-950/40 border-white/5 hover:border-white/10 hover:bg-stone-900/40 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          {isLocked ? (
                            <div className="w-6 h-6 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center text-xs text-stone-500 shadow-inner">
                              <span>❓</span>
                            </div>
                          ) : (
                            <img 
                              src={`/sprites/bosses/boss_${b.id}.png`} 
                              alt={b.name} 
                              className="w-6 h-6 object-contain" 
                            />
                          )}
                          {isLocked ? (
                            <span className="text-[8px] bg-amber-500/15 text-amber-300 font-semibold px-1 py-0.2 rounded border border-amber-500/25 flex items-center gap-0.5">
                              <Lock className="w-2.5 h-2.5" /> Lv.{b.unlockLevel}
                            </span>
                          ) : b.isDefeated ? (
                            <span className="text-[8px] bg-emerald-500/15 text-emerald-300 font-semibold px-1 py-0.2 rounded border border-emerald-500/25">
                              {isTr ? 'FETH' : 'SLAIN'}
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono text-stone-400 font-bold">
                              {bHpPct}%
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-bold text-stone-200 mt-0.5 truncate flex items-center gap-1">
                          <span>{isLocked ? (isTr ? '🔒 ??? (Mühürlü Boss)' : '🔒 ??? (Sealed Boss)') : b.name}</span>
                        </div>
                        <div className="text-[9px] text-stone-400 truncate">
                          {isLocked ? (isTr ? `Seviye ${b.unlockLevel} Gerekli` : `Requires Lv.${b.unlockLevel}`) : `${b.maxHp.toLocaleString()} HP`}
                        </div>

                        {/* Live Mini-HP Gauge Bar */}
                        <div className="w-full bg-stone-900 h-1 rounded-full overflow-hidden mt-0.5 border border-stone-800/80">
                          <div 
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: isLocked ? '0%' : `${bHpPct}%`,
                              backgroundColor: isLocked ? '#44403c' : (b.isDefeated ? '#10b981' : b.themeColor),
                            }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Boss Title, Phase & Description */}
                <div className="bg-stone-950/60 border border-stone-800/80 rounded-2xl p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm sm:text-base font-bold text-stone-100 flex items-center gap-1.5">
                        <span>{boss.name}</span>
                      </h4>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700/60">
                        {isTr ? boss.titleTr : boss.titleEn}
                      </span>
                    </div>
                    {getPhaseBadge()}
                  </div>

                  <p className="text-[11px] text-stone-400 leading-snug">
                    {isTr ? boss.descriptionTr : boss.descriptionEn}
                  </p>

                  {/* Clean Modern Health Bar with Smooth Ghost Trail */}
                  <div className="pt-1">
                    <div className="flex items-center justify-between text-[10.5px] mb-1">
                      <span className="font-semibold text-stone-300 flex items-center gap-1.5">
                        <ShieldAlert className={`w-3.5 h-3.5 ${hpPercent < 25 ? 'text-red-400 animate-pulse' : 'text-stone-400'}`} />
                        <span>{isTr ? 'Küresel Can Havuzu' : 'Global Health'}</span>
                      </span>
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="text-stone-400 text-[10px]">{boss.currentHp.toLocaleString()} / {boss.maxHp.toLocaleString()}</span>
                        <span className={`px-1.5 py-0.2 rounded font-mono font-bold text-[10px] ${
                          hpPercent < 25 ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-stone-800 text-stone-200'
                        }`}>
                          {hpPercent}%
                        </span>
                      </div>
                    </div>

                    {/* Minimalist Health Bar Housing */}
                    <div className={`relative w-full bg-stone-950 h-3 rounded-full overflow-hidden border transition-all duration-300 ${
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
                    <div className="mt-1 flex items-center justify-between text-[10px] text-stone-400 font-mono">
                      <span>{isTr ? 'Senin Katkın:' : 'Your Contribution:'} <strong className="text-amber-300">{myBossDmg.toLocaleString()} DMG ({myDmgPct}%)</strong></span>
                      <span className="text-stone-400">🏆 {myBossDmg > 2000 ? (isTr ? 'Elit Akıncı' : 'Elite Vanguard') : (isTr ? 'Akın Katılımcısı' : 'Raid Contributor')}</span>
                    </div>
                  </div>
                </div>

                {/* Interactive Milestone Loot Chests Row */}
                <div className="p-2 bg-stone-950/40 border border-stone-800/80 rounded-2xl space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-stone-400">
                    <span className="flex items-center gap-1.5 font-semibold text-stone-300">
                      <Gift className="w-3 h-3 text-amber-400" />
                      <span>{isTr ? 'Dönüm Noktası Ganimet Sandıkları' : 'Milestone Loot Chests'}</span>
                    </span>
                    <span className="text-[9.5px] text-stone-500 font-mono">
                      {isTr ? 'Can azaldıkça açılır' : 'Unlocks as HP drops'}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    {[75, 50, 25, 0].map((m) => {
                      const isReached = m === 0 ? boss.isDefeated : hpPercent <= m;
                      const isClaimed = (claimedMilestones[boss.id] || []).includes(m);
                      const isClaimable = isReached && !isClaimed;
                      const reward = MILESTONE_REWARDS[m];

                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            if (!user) {
                              showToast(
                                isTr 
                                  ? 'Ganimet sandıklarını açmak ve ödülleri hesabına kaydetmek için ücretsiz giriş yapın! 🎁' 
                                  : 'Sign in for free to unlock loot chests and claim rewards! 🎁',
                                4000
                              );
                              setActiveModal('auth');
                              return;
                            }
                            if (isClaimable) {
                              claimMilestoneChest(boss.id, m);
                            } else if (isClaimed) {
                              showToast(isTr ? `✓ %${m} Sandığı zaten alındı.` : `✓ %${m} Chest already claimed.`, 2500);
                            } else {
                              showToast(isTr ? `🔒 %${m} Sandığı: Boss canı %${m} altına indiğinde açılır!` : `🔒 %${m} Chest: Unlocks below %${m} HP!`, 3000);
                            }
                          }}
                          className={`flex flex-col items-center justify-center p-1.5 rounded-xl border text-center transition-all cursor-pointer ${
                            isClaimable
                              ? 'bg-gradient-to-b from-amber-500/25 to-amber-500/10 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.4)] animate-bounce'
                              : isClaimed
                                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300 opacity-80'
                                : 'bg-stone-950/60 border-stone-800 text-stone-500 opacity-65 hover:opacity-85'
                          }`}
                          title={isTr ? `%${m} Ganimeti: +${reward.xp} XP, +${reward.charges} Yük` : `%${m} Loot: +${reward.xp} XP, +${reward.charges} Charges`}
                        >
                          <span className="text-sm leading-none">
                            {isClaimed ? '📦' : (m === 0 ? '👑' : '🎁')}
                          </span>
                          <span className="text-[9px] font-mono font-bold mt-0.5">
                            {m === 0 ? (isTr ? 'Zafer' : 'Defeat') : `%${m}`}
                          </span>
                          <span className="text-[8px] font-mono text-stone-400 leading-tight">
                            {isClaimed ? (isTr ? 'Alındı' : 'Claimed') : isClaimable ? (isTr ? 'AÇ!' : 'CLAIM!') : `+${reward.charges} Yük`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Active Buffs & Goals Row */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* North Star goal badge */}
                  <div className="px-2.5 py-1 bg-stone-900/80 border border-white/5 rounded-xl text-xs flex items-center gap-1.5 flex-1 min-w-[140px]">
                    <span className="text-xs">🎯</span>
                    <span className="font-semibold text-stone-300 text-[10px] truncate">
                      {currentGoal ? `"${currentGoal}"` : (isTr ? 'Serbest Odak' : 'Free Focus')}
                    </span>
                    <span className="text-[9.5px] text-amber-300 ml-auto font-semibold shrink-0">2x Crit</span>
                  </div>

                  {/* Cat Morale Buff */}
                  {hasCatBuff && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-200 font-bold px-2 py-1 rounded-xl border border-amber-500/35 flex items-center gap-1 shadow-sm">
                      <span>🐾</span>
                      <span>{isTr ? 'Huzur Desteği (+%10)' : 'Morale (+10%)'}</span>
                    </span>
                  )}

                  {/* Well Rested Buff */}
                  {hasWellRestedBuff && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-1 rounded-xl border border-emerald-500/40 flex items-center gap-1 animate-pulse">
                      <span>☕</span>
                      <span>{isTr ? 'Mola: Garanti Kritik!' : 'Well Rested: Crit!'}</span>
                    </span>
                  )}

                  {/* Frenzy badge */}
                  {frenzyActive && (
                    <span className="text-[10px] bg-amber-500/25 text-amber-200 font-bold px-2 py-1 rounded-xl border border-amber-500/40 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span>1.5x DMG</span>
                    </span>
                  )}

                  {/* Combo badge */}
                  {(sessionCombo || 1) > 1 && (
                    <span className="text-[10px] bg-gradient-to-r from-orange-500/25 to-amber-500/25 text-orange-200 font-bold px-2 py-1 rounded-xl border border-orange-500/40 flex items-center gap-1 animate-pulse">
                      <Flame className="w-3 h-3 text-orange-400 fill-orange-400" />
                      <span>{sessionCombo}x {isTr ? 'Kombo' : 'Combo'}</span>
                    </span>
                  )}
                </div>

                {/* Refined Action Buttons or Level Lock Banner */}
                {playerLevel < (boss.unlockLevel || 1) ? (
                  <div className="p-3 bg-amber-950/30 border border-amber-500/40 rounded-2xl text-center shadow-sm">
                    <div className="flex items-center justify-center gap-1.5 text-amber-300 font-bold text-xs">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        {isTr
                          ? `Bu Boss Seviye ${boss.unlockLevel} Gerektirir!`
                          : `This Boss Requires Level ${boss.unlockLevel}!`}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-stone-300 mt-1 leading-relaxed">
                      {isTr
                        ? `Şu an Seviye ${playerLevel} durumundasın. Odaklanarak XP kazan ve bu kadim devin kilidini aç!`
                        : `You are currently Level ${playerLevel}. Complete focus sessions to earn XP and unlock this titan!`}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Odak Vuruş Yükü (Strike Charges) Status Banner */}
                    <div className="px-3 py-2 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-400/5 to-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-2 shadow-inner">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                          <Zap className="w-4 h-4 fill-amber-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11.5px] font-bold text-amber-200">
                              {isTr ? 'Odak Vuruş Yükün:' : 'Strike Charges:'}
                            </span>
                            <span className="font-mono font-black text-amber-400 text-sm">
                              {strikeCharges ?? 0} {isTr ? 'Yük' : 'Charges'}
                            </span>
                            {/* Glowing energy pips */}
                            <div className="flex items-center gap-1 ml-1">
                              {Array.from({ length: Math.min(5, strikeCharges ?? 0) }).map((_, i) => (
                                <span key={i} className="w-2 h-3.5 rounded-sm bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] inline-block animate-pulse" />
                              ))}
                              {(strikeCharges ?? 0) > 5 && (
                                <span className="text-[10px] font-bold text-amber-400 font-mono">+{((strikeCharges ?? 0) - 5)}</span>
                              )}
                            </div>
                          </div>
                          <p className="text-[10px] text-stone-400 leading-tight">
                            {isTr 
                              ? 'Her 25 dk odaklanma 1 vuruş yükü kazandırır.' 
                              : 'Every 25m session grants 1 strike charge.'}
                          </p>
                        </div>
                      </div>

                      {(strikeCharges ?? 0) === 0 && (
                        <span className="text-[10px] font-semibold text-amber-300/80 bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-500/30">
                          {isTr ? '⏳ Seansla yük kazan' : '⏳ Complete sessions to charge'}
                        </span>
                      )}
                    </div>

                    {/* Action Strike Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
                      {/* Practice Dummy: Free 0-cost Test Strike */}
                      <button
                        onClick={handlePracticeClick}
                        className="w-full px-2.5 py-2.5 rounded-xl bg-stone-800/90 hover:bg-stone-700 border border-white/10 text-stone-300 hover:text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
                        title={isTr ? 'Can eksilmez, yük harcanmaz' : 'No DMG, no charge cost'}
                      >
                        <Zap className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span className="truncate">{isTr ? 'Hedef Tahtası (0 Yük)' : 'Dummy Test (0 Chg)'}</span>
                      </button>

                      {/* 1 Charge Attack: 250 DMG */}
                      <button
                        onClick={() => handleChargeAttack(1, false)}
                        disabled={boss.isDefeated || (strikeCharges ?? 0) < 1}
                        className={`w-full px-2.5 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-sm ${
                          (strikeCharges ?? 0) >= 1 && !boss.isDefeated
                            ? 'bg-stone-800 hover:bg-stone-700 border-amber-500/40 text-amber-200'
                            : 'bg-stone-900 border-white/5 text-stone-500 cursor-not-allowed opacity-50'
                        }`}
                        title={(strikeCharges ?? 0) < 1 ? (isTr ? 'Yetersiz yük! 25 dk odaklan.' : 'Needs 1 charge. Study 25m.') : ''}
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                        <span className="truncate">{isTr ? '⚡ 1 Yük (250 DMG)' : '⚡ 1 Chg (250 DMG)'}</span>
                      </button>

                      {/* 2 Charges Attack: 650 DMG Critical */}
                      <button
                        onClick={() => handleChargeAttack(2, true)}
                        disabled={boss.isDefeated || (strikeCharges ?? 0) < 2}
                        className={`w-full px-2.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-md ${
                          (strikeCharges ?? 0) >= 2 && !boss.isDefeated
                            ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-stone-950 shadow-amber-500/25 hover:brightness-110'
                            : 'bg-stone-900 border border-white/5 text-stone-500 cursor-not-allowed opacity-50'
                        }`}
                        title={(strikeCharges ?? 0) < 2 ? (isTr ? 'Yetersiz yük! 2 yük gerekir.' : 'Needs 2 charges.') : ''}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-stone-950 shrink-0" />
                        <span className="truncate">{isTr ? '💥 2 Yük Kritik (650 DMG)' : '💥 2 Chg Crit (650 DMG)'}</span>
                      </button>
                    </div>

                    {boss.isDefeated && (
                      <div className="flex justify-center mt-2">
                        <button
                          onClick={() => {
                            resetBoss(boss.id);
                            showToast(isTr ? `🔄 ${boss.name} yeniden canlandı!` : `🔄 ${boss.name} revived!`, 3000);
                          }}
                          className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-200 text-xs font-semibold active:scale-95 flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                          <span>{isTr ? 'Yeniden Meydan Oku' : 'Rematch Boss'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'leaderboard' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="text-sm font-bold text-stone-100 flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span>
                      {leaderboardMode === 'boss_damage'
                        ? (isTr ? `${boss.name} — Boss Hasar Sıralaması` : `${boss.name} — Boss Damage Leaderboard`)
                        : (isTr ? 'Küresel Çalışma Süresi Sıralaması' : 'Global Focus Hours Leaderboard')}
                    </span>
                  </h4>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    {leaderboardMode === 'boss_damage'
                      ? (isTr 
                          ? 'Bu bossa dünya genelinde en çok hasar veren ve vuruş yapan öğrenciler:' 
                          : 'Top students worldwide who dealt the most damage to this boss:')
                      : (isTr
                          ? 'Dünya genelinde en çok odaklanan ve ders çalışan öğrenciler:'
                          : 'Top studiers worldwide ranked by total verified focus hours:')}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 p-0.5 bg-stone-950/80 rounded-xl border border-stone-800">
                    <button
                      onClick={() => setLeaderboardMode('boss_damage')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        leaderboardMode === 'boss_damage'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                          : 'text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      <Swords className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isTr ? 'Boss Hasarı' : 'Boss Damage'}</span>
                    </button>

                    <button
                      onClick={() => setLeaderboardMode('study_hours')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        leaderboardMode === 'study_hours'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                          : 'text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{isTr ? 'Çalışma Süresi' : 'Study Time'}</span>
                    </button>
                  </div>

                  <span className="text-[11px] font-mono font-bold text-amber-300 hidden sm:inline">
                    {liveRaidersCount.toLocaleString()} {isTr ? 'Çevrimiçi Oyuncu' : 'Online Players'}
                  </span>
                </div>
              </div>

              {/* Leaderboard Table or Inspiring Empty State */}
              {(() => {
                const rawEntries = getLeaderboard(boss.id);
                const displayedEntries = leaderboardMode === 'study_hours'
                  ? [...rawEntries].sort((a, b) => (b.focusHours || 0) - (a.focusHours || 0)).map((e, i) => ({ ...e, rank: i + 1 }))
                  : rawEntries;

                if (displayedEntries.length === 0) {
                  return (
                    <div className="p-8 text-center text-stone-400 text-xs border border-dashed border-stone-800 rounded-2xl bg-stone-950/30">
                      <div className="text-2xl mb-2">⚔️</div>
                      <div className="font-bold text-stone-200 mb-1">
                        {isTr ? 'Henüz Sıralama Verisi Yok' : 'No Leaderboard Data Yet'}
                      </div>
                      <p className="text-[11px] text-stone-400 max-w-sm mx-auto leading-relaxed">
                        {isTr
                          ? 'Bu kadim boss yeni uyandı! 25 dk odaklanarak ilk saldırıyı yap ve 1. sıraya adını yazdır!'
                          : 'This ancient titan has awakened! Earn strike charges, make the first hit, and claim the #1 rank!'}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="bg-stone-950/60 border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5">
                    {displayedEntries.slice(0, 15).map((entry) => {
                      const isPodium = entry.rank <= 3;
                      const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`;

                      return (
                        <div
                          key={entry.id}
                          className={`p-2.5 sm:p-3 flex items-center justify-between transition-all ${
                            entry.isSelf
                              ? 'bg-amber-500/15 border-l-4 border-l-amber-400 ring-1 ring-amber-500/30'
                              : 'hover:bg-stone-900/40'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={`font-mono font-bold text-xs sm:text-sm w-7 text-center ${
                              isPodium ? 'text-base' : 'text-stone-400'
                            }`}>
                              {medal}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs">{entry.flag}</span>
                                <span className={`text-xs font-bold truncate ${
                                  entry.isSelf ? 'text-amber-200' : 'text-stone-200'
                                }`}>
                                  {entry.name} {entry.isSelf && <span className="text-[10px] text-amber-400 font-mono font-normal">({isTr ? 'SEN' : 'YOU'})</span>}
                                </span>
                                <span className="text-[10px] text-stone-500 truncate hidden sm:inline">• {entry.city}</span>
                              </div>
                              <div className="text-[10px] text-stone-400 mt-0.5 flex items-center gap-2">
                                <span className="text-amber-400/90 font-medium">{entry.badge}</span>
                                <span>•</span>
                                <span className="font-mono text-emerald-400 font-semibold">{entry.focusHours}h {isTr ? 'odak' : 'focus'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right flex-shrink-0">
                            {leaderboardMode === 'boss_damage' ? (
                              <>
                                <div className="text-xs font-mono font-bold text-amber-300">
                                  {entry.damage.toLocaleString()} DMG
                                </div>
                                <div className="text-[10px] font-mono text-stone-400">
                                  %{entry.contributionPct} {isTr ? 'katkı' : 'share'}
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="text-xs font-mono font-bold text-emerald-300">
                                  {entry.focusHours} Saat
                                </div>
                                <div className="text-[10px] font-mono text-stone-400">
                                  {entry.damage.toLocaleString()} DMG
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Sticky Personal Standing Card */}
              {(() => {
                const lb = getLeaderboard(boss.id);
                const selfRank = lb.find((e) => e.isSelf)?.rank || (myBossDmg > 0 ? 1 : '-');
                return (
                  <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-950/40 via-stone-900/70 to-stone-950/80 border border-amber-500/30 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-base">⭐</span>
                      <div>
                        <span className="font-bold text-amber-200">
                          {isTr ? 'Senin Sıralaman:' : 'Your Standing:'}
                        </span>
                        <span className="ml-1 font-mono text-stone-300">
                          #{selfRank} / {liveRaidersCount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="font-mono text-stone-300">
                      <strong className="text-amber-300">{myBossDmg.toLocaleString()} DMG</strong> ({myDmgPct}%) • Lv.{playerLevel}
                    </div>
                  </div>
                );
              })()}
            </div>
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
                  const isLevelLocked = playerLevel < (b.unlockLevel || 1);
                  const unlocked = !isLevelLocked && (unlockedTrophies.includes(b.trophyId) || (Boolean(b.isDefeated) && (personalDamagePerBoss[b.id] || 0) > 0));

                  return (
                    <div
                      key={b.trophyId}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        unlocked
                          ? 'bg-amber-950/20 border-amber-500/50 shadow-md'
                          : isLevelLocked
                            ? 'bg-stone-950/40 border-stone-900 border-dashed opacity-50'
                            : 'bg-stone-950/40 border-stone-800/80 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-2xl">{isLevelLocked ? '🔒' : b.avatar}</span>
                        {unlocked ? (
                          <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            {isTr ? 'Kazanıldı & Profilde' : 'Earned & Showcased'}
                          </span>
                        ) : isLevelLocked ? (
                          <span className="text-[10px] text-amber-400/80 font-mono font-bold flex items-center gap-0.5">
                            <Lock className="w-3 h-3" /> Lv.{b.unlockLevel} {isTr ? 'Gerekli' : 'Required'}
                          </span>
                        ) : (
                          <span className="text-[10px] text-stone-500 font-mono">
                            {isTr ? 'KİLİTLİ' : 'LOCKED'}
                          </span>
                        )}
                      </div>

                      <div className="text-sm font-bold text-amber-200 mt-2">
                        {isLevelLocked 
                          ? (isTr ? '🔒 ??? (Gizemli Kadim Ganimet)' : '🔒 ??? (Mysterious Ancient Relic)')
                          : (isTr ? b.trophyNameTr : b.trophyNameEn)}
                      </div>
                      <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                        {isLevelLocked 
                          ? (isTr 
                              ? `Bu kadim ganimetin kilidini açmak için Seviye ${b.unlockLevel}'e ulaş ve bossu dize getir.` 
                              : `Reach Level ${b.unlockLevel} and vanquish this titan to discover this ancient relic.`)
                          : (isTr ? b.trophyDescTr : b.trophyDescEn)}
                      </p>

                      <div className="mt-3 pt-2.5 border-t border-stone-800 flex items-center justify-between text-xs">
                        <span className="text-stone-400">{isTr ? 'Unvan:' : 'Title:'}</span>
                        <span className="font-bold text-amber-300">
                          {isLevelLocked ? '🔒 ???' : `👑 ${isTr ? b.playerTitleTr : b.playerTitleEn}`}
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
            {isTr ? '⚡ 1 Yük (25 dk) = 250 DMG • 2 Yük (50 dk) = 650 Kritik DMG • Canlı Akın' : '⚡ 1 Charge (25m) = 250 DMG • 2 Charges (50m) = 650 Crit DMG • Live Raid'}
          </span>
          <button
            onClick={() => setActiveModal('none')}
            className="px-4 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold cursor-pointer transition-colors"
          >
            {isTr ? 'Kapat' : 'Close'}
          </button>
        </div>

        {/* Loot Chest Celebration Modal */}
        {activeLootReward && (
          <div 
            onClick={dismissLootReward}
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200 pointer-events-auto"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-b from-stone-900 via-amber-950/40 to-stone-900 border-2 border-amber-400/60 rounded-3xl p-6 max-w-sm w-full text-center shadow-[0_0_50px_rgba(245,158,11,0.4)] relative overflow-hidden"
            >
              <div className="text-6xl mb-2 animate-bounce">
                {activeLootReward.milestone === 0 ? '👑' : '🎁'}
              </div>
              <h3 className="text-lg font-black text-amber-300 font-mono tracking-wide">
                {isTr ? 'GANİMET SANDIĞI AÇILDI!' : 'LOOT CHEST UNLOCKED!'}
              </h3>
              <p className="text-xs text-stone-300 mt-1">
                {isTr
                  ? `${boss.name} üzerinde %${activeLootReward.milestone} dönüm noktasına ulaşıldı!`
                  : `Reached %${activeLootReward.milestone} milestone on ${boss.name}!`}
              </p>

              <div className="my-4 p-3 bg-stone-950/80 rounded-2xl border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-amber-200">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span>{isTr ? 'Kazanılan Odak Yükü:' : 'Earned Strike Charges:'}</span>
                  </span>
                  <span className="text-amber-400 font-mono font-black text-sm">+{activeLootReward.charges}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-sky-200">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                    <span>{isTr ? 'Kazanılan XP:' : 'Earned XP:'}</span>
                  </span>
                  <span className="text-sky-400 font-mono font-black text-sm">+{activeLootReward.xp} XP</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-emerald-200">
                  <span className="flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isTr ? 'Kazanılan Unvan:' : 'Earned Title:'}</span>
                  </span>
                  <span className="text-emerald-400 font-bold">{isTr ? activeLootReward.titleTr : activeLootReward.titleEn}</span>
                </div>
              </div>

              <button
                onClick={dismissLootReward}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 text-stone-950 font-black text-xs rounded-xl shadow-lg hover:brightness-110 cursor-pointer active:scale-95 transition-all"
              >
                {isTr ? 'Ganimetleri Kuşan / Harika!' : 'Claim Rewards / Awesome!'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
