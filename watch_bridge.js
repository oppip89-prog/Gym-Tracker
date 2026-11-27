/* Gym Tracker 9.8.1 - Wear OS native Data Layer companion.
 * The phone app remains authoritative for sets, Smart Load and history.
 * Command IDs are persisted to make replay idempotent.
 */
(function () {
  'use strict';
  const android = () => window.AndroidBridge || null;
  let lastPublished = '';
  let publishPending = false;
  let processing = false;

  const number = (v, fallback = 0) => {
    const n = typeof v === 'string' && v.trim() === '' ? NaN : Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  const string = v => String(v == null ? '' : v);

  function makeSnapshot() {
    const session = state.currentSession;
    const payload = {
      protocol: 1, updatedAt: Date.now(),
      sessionId: session ? string(session.id) : '',
      workout: session ? string(session.workout) : '',
      startedAt: session ? string(session.startedAt) : '',
      gymName: session ? string(session.gymName) : '',
      preferredExercise: number(state.ui.openExercise, 0),
      timerEnd: number(state.timer && state.timer.end, 0),
      timerTotal: number(state.timer && state.timer.total, 0),
      autoTimer: state.settings.autoTimer !== false,
      autoOpenWatch: state.settings.autoOpenWatch !== false,
      autoWatchHealth: state.settings.autoWatchHealth !== false,
      maxHeartRate: Math.max(0, Math.min(240, number(state.settings.maxHeartRate, 0))),
      timerLabel: state.timer ? string(state.timer.label) : '',
      exercises: []
    };
    if (!session) return payload;
    payload.exercises = (session.exercises || []).map((ex, exi) => ({
      index: exi,
      name: string(ex.name),
      equipment: string(ex.equipment),
      stepKg: Math.max(0.1, number(loadStepFor(ex), 2.5)),
      restSec: Math.max(0, number(ex.restSec, 0)),
      done: !!ex.done,
      warmupDescription: string(ex.reps),
      warmupNote: string(ex.note),
      warmupSets: (ex.warmupSets || []).map((s, si) => ({
        index: si, label: string(s.label || `W${si + 1}`),
        kg: s.kg === '' || s.kg == null ? null : number(s.kg),
        reps: s.reps === '' || s.reps == null ? null : number(s.reps),
        done: !!s.done, restSec: Math.max(0, number(s.restSec, 0))
      })),
      sets: (ex.sets || []).map((s, si) => ({
        index: si,
        label: string(s.label || (si + 1)),
        kg: s.kg === '' || s.kg == null ? null : number(s.kg, 0),
        reps: s.reps === '' || s.reps == null ? null : number(s.reps, 0),
        done: !!s.done,
        restSec: Math.max(0, number(s.restSec || ex.restSec, 0))
      }))
    }));
    return payload;
  }

  function publish(force) {
    if (!android() || typeof android().publishWatchState !== 'function') return;
    try {
      const data = makeSnapshot();
      const comparable = JSON.stringify({ ...data, updatedAt: 0 });
      if (!force && comparable === lastPublished) return;
      lastPublished = comparable;
      android().publishWatchState(JSON.stringify(data));
    } catch (error) {
      console.warn('Gym Watch publish error', error);
    }
  }
  function schedulePublish() {
    if (publishPending) return;
    publishPending = true;
    setTimeout(() => { publishPending = false; publish(false); }, 80);
  }
  const originalSaveState = saveState;
  saveState = function () {
    const result = originalSaveState.apply(this, arguments);
    schedulePublish();
    return result;
  };

  function success(id) {
    android()?.ackWatchCommand?.(id, 'applied', '');
  }
  function reject(id, reason) {
    android()?.ackWatchCommand?.(id, 'rejected', string(reason).slice(0, 160));
  }
  function applyCommand(command) {
    const id = string(command.id).slice(0, 120);
    if (!id || !/^[a-zA-Z0-9-]{8,120}$/.test(id)) return;
    const processed = Array.isArray(state.watchProcessedIds) ? state.watchProcessedIds : [];
    if (processed.includes(id)) { success(id); return; }
    if (command.kind === "health_batch") {
      try {
        if (!window.GymHealth) throw new Error("Aggiorna GymTracker sul telefono");
        window.GymHealth.applyWatchBatch(command);
        state.watchProcessedIds = [...processed, id].slice(-300);
        saveState(); window.GymHealth.scheduleNative?.(command.sessionId); success(id);
      } catch (e) { reject(id, e.message || "Dati salute non validi"); }
      return;
    }
    const ss = state.currentSession;
    if (!ss || ss.id !== command.sessionId) {
      reject(id, 'Sessione differente o terminata. Controlla Gym Tracker sul telefono.');
      return;
    }
    try {
      const kind = string(command.kind);
      if (kind === 'confirm') {
        const exi = Number(command.exi), si = Number(command.si);
        if (!Number.isInteger(exi) || !Number.isInteger(si)) throw new Error('Indice serie non valido');
        const ex = ss.exercises?.[exi], set = ex?.sets?.[si];
        if (!set) throw new Error('Serie non trovata');
        if (set.done) throw new Error('Serie gia completata; controlla il telefono');
        const kg = Number(command.kg), reps = Number(command.reps);
        if (!Number.isFinite(kg) || kg < 0 || kg > 1000 || !Number.isInteger(reps) || reps < 1 || reps > 100)
          throw new Error('Carico o ripetizioni non validi');
        updateSetField(exi, si, 'kg', kg);
        updateSetField(exi, si, 'reps', reps);
        state.ui.openExercise = exi;
        completeSet(exi, si);
        if (!set.done) throw new Error('Completamento non riuscito');
        const t = Date.parse(command.at);
        if (Number.isFinite(t) && t >= Date.parse(ss.startedAt) && t <= Date.now() + 60 * 1000) {
          set.completedAt = new Date(t).toISOString();
          const restSeconds = number(set.restSec || ex.restSec, 0);
          if (restSeconds > 0) {
            const expiry = t + restSeconds * 1000;
            if (expiry > Date.now()) {
              if (!state.timer || !state.settings.autoTimer) startTimer(restSeconds, ex.name);
              state.timer.end = expiry;
              state.timer.total = restSeconds;
              state.timer.label = ex.name;
            } else if (state.timer && state.timer.label === ex.name) {
              state.timer = null;
            }
          }
        } else if (!state.timer) {
          const restSeconds = number(set.restSec || ex.restSec, 0);
          if (restSeconds > 0) startTimer(restSeconds, ex.name);
        }
      } else if (kind === 'warmup_general') {
        const exi = Number(command.exi), ex = ss.exercises?.[exi];
        if (!Number.isInteger(exi) || !ex || ex.sets?.length) throw new Error('Riscaldamento non trovato');
        if (!ex.done) { state.ui.openExercise = exi; completeWarmup(exi); }
      } else if (kind === 'warmup_set') {
        const exi = Number(command.exi), si = Number(command.si), ex = ss.exercises?.[exi];
        const set = ex?.warmupSets?.[si];
        if (!Number.isInteger(exi) || !Number.isInteger(si) || !set) throw new Error('Warm-up non trovato');
        const kg = Number(command.kg), reps = Number(command.reps);
        if (!Number.isFinite(kg) || kg < 0 || kg > 1000 || !Number.isInteger(reps) || reps < 1 || reps > 100) throw new Error('Carico o ripetizioni non validi');
        if (!set.done) {
          updateWarmupField(exi, si, 'kg', kg); updateWarmupField(exi, si, 'reps', reps);
          state.ui.openExercise = exi; completeWarmupSet(exi, si);
          const t = Date.parse(command.at), rest = number(set.restSec, 0);
          if (Number.isFinite(t) && t >= Date.parse(ss.startedAt) && t <= Date.now()+60000 && rest > 0 && state.settings.autoTimer) {
            set.completedAt = new Date(t).toISOString();
            state.timer = t + rest*1000 > Date.now() ? {end:t+rest*1000,total:rest,label:ex.name+' · warm-up'} : null;
          }
        }
      } else if (kind === 'finish') {
        const progress = sessionProgress();
        if (progress.pct < 100 && command.allowIncomplete !== true) throw new Error('Seduta incompleta: verifica le serie');
        // Persist ID in the same save as the history entry. No phone dialog.
        state.watchProcessedIds = [...processed, id].slice(-300);
        finishWorkout(true,command.at);
        if (state.currentSession) { state.watchProcessedIds = processed; throw new Error('Chiusura non riuscita'); }
        success(id); publish(true); return;
      } else if (kind === 'discard') {
        state.watchProcessedIds = [...processed, id].slice(-300);
        discardWorkout(true);
        if (state.currentSession) { state.watchProcessedIds = processed; throw new Error('Scarto non riuscito'); }
        success(id); publish(true); return;
      } else if (kind === 'timer_add') {
        if (!state.timer) throw new Error('Nessun timer attivo');
        addTimer(30);
      } else if (kind === 'timer_skip') {
        skipTimer();
      } else {
        throw new Error('Comando non supportato');
      }
      state.watchProcessedIds = [...processed, id].slice(-300);
      saveState();
      success(id);
      publish(true);
    } catch (error) {
      reject(id, error?.message || 'Errore durante la conferma');
      publish(true);
    }
  }

  window.GymWatchBridge = {
    snapshot: makeSnapshot,
    toggle: key => { if(!['autoOpenWatch','autoWatchHealth'].includes(key))return; state.settings[key]=state.settings[key]===false;saveState();publish(true);render(); },
    publish: () => publish(true),
    consumePending: function (json) {
      if (processing) return;
      processing = true;
      try {
        const commands = typeof json === 'string' ? JSON.parse(json) : json;
        if (Array.isArray(commands)) commands.forEach(applyCommand);
      } catch (error) {
        console.warn('Gym Watch command queue invalid', error);
      } finally {
        processing = false;
      }
    }
  };
  // A small integration panel, without changing the existing training UI.
  const originalRenderSettings = renderSettings;
  renderSettings = function () {
    const html = originalRenderSettings.apply(this, arguments);
    if (!android() || typeof android().publishWatchState !== 'function') return html;
    let pending = 0, remote = '';
    try { const s=JSON.parse(android().getWatchStatus?.() || '{}');pending = Number(s.pending) || 0;remote=String(s.remote||''); }
    catch (error) { pending = 0; }
    const panel = `<section class="card"><h2>Smartwatch Wear OS</h2>
      <p class="subtle">Gestisci riscaldamento, kg, ripetizioni, recupero e salvataggio dal polso. Il telefono resta responsabile dello storico e di Smart Load.</p>
      <div class="setting-row"><div><b>Comandi in attesa</b><p>${pending} conferme da registrare nell'app</p></div><span class="badge ${pending ? '' : 'green'}">${pending ? 'IN CODA' : 'PRONTO'}</span></div>
      <div class="setting-row"><div><b>Apri automaticamente il Watch</b><p>All’apertura di GymTracker e all’avvio della seduta.</p></div><button class="toggle ${state.settings.autoOpenWatch!==false?'on':''}" onclick="GymWatchBridge.toggle('autoOpenWatch')"><i></i></button></div>
      <div class="setting-row"><div><b>Avvia automaticamente i sensori</b><p>Solo durante un allenamento, dopo i permessi sul Watch.</p></div><button class="toggle ${state.settings.autoWatchHealth!==false?'on':''}" onclick="GymWatchBridge.toggle('autoWatchHealth')"><i></i></button></div>
      <button class="secondary-btn" onclick="window.GymWatchBridge.publish();window.AndroidBridge.openWatchNow?.()">Apri / sincronizza Watch</button>
      ${remote?`<p class="subtle">${esc(remote)}</p>`:''}
      <p class="subtle">Per comunicare devi installare anche Gym Tracker Watch sul dispositivo Wear OS. La comunicazione funziona tramite Wear OS Data Layer.</p>
      </section>`;
    return html.replace('</main>', panel + '</main>');
  };

  setInterval(() => publish(false), 1500);
  setTimeout(() => {
    publish(true);
    android()?.watchReady?.();
  }, 250);
})();
