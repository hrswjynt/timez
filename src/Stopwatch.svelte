<script>
  import { onMount, onDestroy } from 'svelte';

  let isRunning = $state(false);
  let elapsedMs = $state(0);
  let laps = $state([]);
  let startTimestamp = $state(0); // When the stopwatch was started
  let intervalId = null;

  // Current lap time (time since last lap or start)
  const currentLapTime = $derived(() => {
    if (laps.length === 0) return elapsedMs;
    return elapsedMs - laps[0].time;
  });

  // Load stopwatch state on mount
  onMount(async () => {
    await loadStopwatchState();
  });

  async function loadStopwatchState() {
    if (typeof browser === 'undefined') return;

    try {
      const result = await browser.storage.local.get('stopwatchState');
      if (result.stopwatchState) {
        const { savedAt, elapsedMs: savedElapsed, laps: savedLaps, isRunning: wasRunning } = result.stopwatchState;

        laps = savedLaps || [];

        if (wasRunning && savedAt) {
          // Calculate current elapsed time: saved elapsed + time since save
          const now = Date.now();
          elapsedMs = savedElapsed + (now - savedAt);
          startTimestamp = now - elapsedMs;
          isRunning = true;
          startInterval();
        } else if (savedElapsed > 0) {
          // Paused state
          elapsedMs = savedElapsed;
        }
      }
    } catch (e) {
      console.error('Failed to load stopwatch state:', e);
    }
  }

  async function saveStopwatchState() {
    if (typeof browser === 'undefined') return;

    try {
      await browser.storage.local.set({
        stopwatchState: {
          savedAt: Date.now(),
          elapsedMs: elapsedMs,
          laps: laps,
          isRunning: isRunning
        }
      });
    } catch (e) {
      console.error('Failed to save stopwatch state:', e);
    }
  }

  async function clearStopwatchState() {
    if (typeof browser === 'undefined') return;

    try {
      await browser.storage.local.remove('stopwatchState');
    } catch (e) {
      console.error('Failed to clear stopwatch state:', e);
    }
  }

  function startInterval() {
    intervalId = setInterval(() => {
      elapsedMs = Date.now() - startTimestamp;
    }, 10);
  }

  async function start() {
    isRunning = true;
    startTimestamp = Date.now() - elapsedMs;
    startInterval();
    await saveStopwatchState();
  }

  async function stop() {
    isRunning = false;
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    await saveStopwatchState();
  }

  async function lap() {
    const lapTime = elapsedMs;
    const previousLapTime = laps.length > 0 ? laps[0].time : 0;
    const diff = lapTime - previousLapTime;

    // Determine color based on lap performance
    let color = 'white';
    if (laps.length >= 2) {
      const avgDiff = laps.reduce((sum, l) => sum + l.diff, 0) / laps.length;
      if (diff < avgDiff * 0.95) color = 'blue';
      else if (diff > avgDiff * 1.05) color = 'red';
    }

    laps = [
      { id: Date.now(), time: lapTime, diff, color },
      ...laps
    ];

    await saveStopwatchState();
  }

  async function reset() {
    await stop();
    elapsedMs = 0;
    startTimestamp = 0;
    laps = [];
    await clearStopwatchState();
  }

  function formatTime(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
  }

  function formatLapTime(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
  }

  // Cleanup on destroy
  onDestroy(() => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  });
</script>

<div class="flex flex-col h-full p-4">
  <!-- Time Display -->
  <div class="flex flex-col items-center py-4">
    <div class="text-6xl font-light text-white tracking-wider font-mono">
      {formatTime(elapsedMs)}
    </div>
    {#if laps.length > 0}
      <div class="text-xl text-zinc-400 font-mono mt-2">
        +{formatLapTime(currentLapTime())}
      </div>
    {/if}
  </div>

  <!-- Lap History -->
  {#if laps.length > 0}
    <div class="flex-1 overflow-hidden mb-3">
      <!-- Table Header -->
      <div class="grid grid-cols-3 gap-4 px-2 pb-2 border-b border-zinc-800">
        <span class="text-xs text-zinc-500 uppercase tracking-wider">Lap</span>
        <span class="text-xs text-zinc-500 uppercase tracking-wider text-center">Lap times</span>
        <span class="text-xs text-zinc-500 uppercase tracking-wider text-right">Overall time</span>
      </div>

      <!-- Lap Rows -->
      <div class="overflow-y-auto h-[calc(100%-28px)] custom-scrollbar">
        {#each laps as lap, i}
          <div
            class="grid grid-cols-3 gap-4 px-2 py-2 border-b border-zinc-800/50
                   {lap.color === 'red' ? 'text-red-400' : lap.color === 'blue' ? 'text-blue-400' : 'text-white'}"
          >
            <span class="font-mono text-sm">{String(laps.length - i).padStart(2, '0')}</span>
            <span class="font-mono text-sm text-center">{formatLapTime(lap.diff)}</span>
            <span class="font-mono text-sm text-right">{formatTime(lap.time)}</span>
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <div class="flex-1"></div>
  {/if}

  <!-- Controls -->
  <div class="flex justify-center gap-4 mb-3">
    {#if isRunning}
      <button
        class="px-8 py-3 bg-zinc-700 hover:bg-zinc-600 rounded-full text-white font-medium transition-colors duration-200"
        onclick={lap}
      >
        Lap
      </button>
      <button
        class="px-8 py-3 bg-red-600 hover:bg-red-700 rounded-full text-white font-medium transition-colors duration-200"
        onclick={stop}
      >
        Stop
      </button>
    {:else}
      <button
        class="px-8 py-3 bg-zinc-700 hover:bg-zinc-600 rounded-full text-white font-medium transition-colors duration-200
               {elapsedMs === 0 ? 'opacity-50 cursor-not-allowed' : ''}"
        onclick={reset}
        disabled={elapsedMs === 0}
      >
        Reset
      </button>
      <button
        class="px-8 py-3 bg-green-600 hover:bg-green-700 rounded-full text-white font-medium transition-colors duration-200"
        onclick={start}
      >
        {elapsedMs > 0 ? 'Resume' : 'Start'}
      </button>
    {/if}
  </div>
</div>
