<script>
  import { onMount, onDestroy } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import WheelPicker from './WheelPicker.svelte';

  let hours = $state(0);
  let minutes = $state(0);
  let seconds = $state(0);
  let isRunning = $state(false);
  let isFinished = $state(false);
  let remainingMs = $state(0);
  let endTime = $state(0); // Timestamp when timer should end
  let intervalId = null;
  let saveTimeout = null;

  const presets = [
    { label: '00:10:00', hours: 0, minutes: 10, seconds: 0 },
    { label: '00:15:00', hours: 0, minutes: 15, seconds: 0 },
    { label: '00:30:00', hours: 0, minutes: 30, seconds: 0 }
  ];

  // Format remaining time for display
  const displayTime = $derived(() => {
    const totalSeconds = Math.ceil(remainingMs / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  });

  // Load timer state on mount
  onMount(async () => {
    await loadTimerState();
  });

  // Auto-save inputs when they change
  $effect(() => {
    // Track dependencies
    const h = hours;
    const m = minutes;
    const s = seconds;

    // Only save if we are in setup mode (not running, not finished)
    if (!isRunning && !isFinished) {
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        saveTimerState();
      }, 500);
    }
  });

  async function loadTimerState() {
    if (typeof browser === 'undefined') return;

    try {
      const result = await browser.storage.local.get('timerState');
      if (result.timerState) {
        const { endTime: savedEndTime, remainingMs: savedRemainingMs, isRunning: wasRunning, hours: h, minutes: m, seconds: s } = result.timerState;
        
        // Restore input values
        if (h !== undefined) hours = h;
        if (m !== undefined) minutes = m;
        if (s !== undefined) seconds = s;

        if (wasRunning && savedEndTime) {
          const now = Date.now();
          const remaining = savedEndTime - now;

          if (remaining > 0) {
            endTime = savedEndTime;
            remainingMs = remaining;
            isRunning = true;
            startCountdown();
          } else {
            // Timer finished while popup was closed
            isFinished = true;
            remainingMs = 0;
            // Save state instead of clearing to preserve inputs
            await saveTimerState(); 
          }
        } else if (!wasRunning && savedRemainingMs > 0) {
          // Paused state - restore remaining time
          remainingMs = savedRemainingMs;
        }
      }
    } catch (e) {
      console.error('Failed to load timer state:', e);
    }
  }

  async function saveTimerState() {
    if (typeof browser === 'undefined') return;

    try {
      await browser.storage.local.set({
        timerState: {
          endTime: endTime,
          remainingMs: remainingMs,
          isRunning: isRunning,
          hours: hours,
          minutes: minutes,
          seconds: seconds
        }
      });
    } catch (e) {
      console.error('Failed to save timer state:', e);
    }
  }

  async function clearTimerState() {
    if (typeof browser === 'undefined') return;

    try {
      await browser.storage.local.remove('timerState');
    } catch (e) {
      console.error('Failed to clear timer state:', e);
    }
  }

  function setPreset(preset) {
    hours = preset.hours;
    minutes = preset.minutes;
    seconds = preset.seconds;
  }

  function startCountdown() {
    intervalId = setInterval(() => {
      const now = Date.now();
      remainingMs = Math.max(0, endTime - now);

      if (remainingMs <= 0) {
        stop();
        isFinished = true;
        playSound();
      }
    }, 100);
  }

  async function start() {
    const totalMs = (hours * 3600 + minutes * 60 + seconds) * 1000;
    if (totalMs <= 0) return;

    endTime = Date.now() + totalMs;
    remainingMs = totalMs;
    isRunning = true;
    isFinished = false;

    // Save state to storage
    await saveTimerState();

    // Create browser alarm for background timing
    if (typeof browser !== 'undefined') {
      browser.runtime.sendMessage({
        type: 'create-timer',
        delayInMinutes: totalMs / 60000
      }).catch(() => {});
    }

    startCountdown();
  }

  async function stop() {
    isRunning = false;
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }

    // Save paused state (keep remainingMs but mark as not running)
    if (remainingMs > 0) {
      endTime = Date.now() + remainingMs;
      await saveTimerState();
    }

    // Cancel browser alarm
    if (typeof browser !== 'undefined') {
      browser.runtime.sendMessage({ type: 'cancel-timer' }).catch(() => {});
    }
  }

  async function resume() {
    if (remainingMs <= 0) return;

    endTime = Date.now() + remainingMs;
    isRunning = true;
    isFinished = false;

    await saveTimerState();

    // Recreate browser alarm
    if (typeof browser !== 'undefined') {
      browser.runtime.sendMessage({
        type: 'create-timer',
        delayInMinutes: remainingMs / 60000
      }).catch(() => {});
    }

    startCountdown();
  }

  async function reset() {
    await stop();
    remainingMs = 0;
    endTime = 0;
    isFinished = false;
    // Don't reset inputs to 0, keep them for reuse
    // Save the "idle" state with inputs preserved
    await saveTimerState();
  }

  function playSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.value = 800;

      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.5);

      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.type = 'sine';
        osc2.frequency.value = 800;
        gain2.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc2.start(audioCtx.currentTime);
        osc2.stop(audioCtx.currentTime + 0.5);
      }, 600);
    } catch (e) {
      console.log('Audio not available:', e);
    }
  }

  // Cleanup on component destroy
  onDestroy(() => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  });
</script>

<div class="h-full p-4 pt-6 grid grid-cols-1 grid-rows-1">
  {#if isRunning || remainingMs > 0 || isFinished}
  <div 
    class="flex flex-col items-center justify-between w-full h-full col-start-1 row-start-1 z-10"
    in:fly={{ y: 20, duration: 400, delay: 200 }} 
    out:fade={{ duration: 200 }}
  >
    <!-- Running/Paused/Finished Timer Display -->
    <div class="flex-1 flex flex-col items-center justify-center">
      <div class="text-6xl font-light text-white tracking-wider font-mono">
        {displayTime()}
      </div>
    </div>

    <!-- Controls -->
    <div class="flex gap-3 mb-4">
      {#if isRunning}
        <button
          class="px-8 py-3 bg-red-600 hover:bg-red-700 rounded-full text-white font-medium transition-colors duration-200"
          onclick={stop}
        >
          Pause
        </button>
      {:else}
        <button
          class="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 rounded-full text-white font-medium transition-colors duration-200"
          onclick={reset}
        >
          Reset
        </button>
        {#if !isFinished}
          <button
            class="px-6 py-3 bg-violet-600 hover:bg-violet-700 rounded-full text-white font-medium transition-colors duration-200"
            onclick={resume}
          >
            Resume
          </button>
        {/if}
      {/if}
    </div>
  </div>
  {:else}
  <div 
    class="flex flex-col items-center justify-between w-full h-full col-start-1 row-start-1 z-10"
    in:fly={{ y: 20, duration: 400, delay: 200 }} 
    out:fade={{ duration: 200 }}
  >
    <!-- Wheel Pickers -->
    <div class="flex gap-1 justify-center flex-1 items-center">
      <WheelPicker bind:value={hours} min={0} max={23} label="Hours" />
      <WheelPicker bind:value={minutes} min={0} max={59} label="Minutes" />
      <WheelPicker bind:value={seconds} min={0} max={59} label="Seconds" />
    </div>

    <!-- Presets -->
    <div class="flex gap-2 mb-3">
      {#each presets as preset}
        <button
          class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-full text-sm text-zinc-300 font-mono transition-colors duration-200"
          onclick={() => setPreset(preset)}
        >
          {preset.label}
        </button>
      {/each}
    </div>

    <!-- Start Button -->
    <button
      class="w-full max-w-xs px-12 py-3 bg-violet-600 hover:bg-violet-700 rounded-full text-white text-lg font-medium transition-colors duration-200 mb-4"
      onclick={start}
    >
      Start
    </button>
  </div>
  {/if}
</div>
