<script>
  import { onMount } from 'svelte';

  let alarms = $state([]);
  let showAddForm = $state(false);
  let newAlarmTime = $state('08:00');
  let newAlarmLabel = $state('');

  // Load alarms from storage on mount
  onMount(() => {
    loadAlarms();
  });

  async function loadAlarms() {
    if (typeof browser !== 'undefined') {
      try {
        const result = await browser.storage.local.get('alarms');
        if (result.alarms) {
          alarms = result.alarms;
        }
      } catch (e) {
        console.error('Failed to load alarms:', e);
      }
    }
  }

  async function saveAlarms() {
    if (typeof browser !== 'undefined') {
      try {
        await browser.storage.local.set({ alarms });
      } catch (e) {
        console.error('Failed to save alarms:', e);
      }
    }
  }

  function addAlarm() {
    const alarm = {
      id: Date.now(),
      time: newAlarmTime,
      label: newAlarmLabel || 'Alarm',
      enabled: true
    };

    alarms = [...alarms, alarm];
    saveAlarms();
    scheduleAlarm(alarm);

    // Reset form
    showAddForm = false;
    newAlarmTime = '08:00';
    newAlarmLabel = '';
  }

  function toggleAlarm(alarm) {
    alarm.enabled = !alarm.enabled;
    alarms = [...alarms]; // Trigger reactivity
    saveAlarms();

    if (alarm.enabled) {
      scheduleAlarm(alarm);
    } else {
      cancelAlarm(alarm);
    }
  }

  function deleteAlarm(alarm) {
    cancelAlarm(alarm);
    alarms = alarms.filter(a => a.id !== alarm.id);
    saveAlarms();
  }

  function scheduleAlarm(alarm) {
    if (typeof browser === 'undefined') return;

    const [hours, minutes] = alarm.time.split(':').map(Number);
    const now = new Date();
    const alarmDate = new Date();
    alarmDate.setHours(hours, minutes, 0, 0);

    // If alarm time has passed today, schedule for tomorrow
    if (alarmDate <= now) {
      alarmDate.setDate(alarmDate.getDate() + 1);
    }

    const delayInMinutes = (alarmDate - now) / 60000;

    browser.runtime.sendMessage({
      type: 'create-alarm',
      alarmId: alarm.id,
      delayInMinutes: delayInMinutes
    }).catch(() => {});
  }

  function cancelAlarm(alarm) {
    if (typeof browser === 'undefined') return;

    browser.runtime.sendMessage({
      type: 'cancel-alarm',
      alarmId: alarm.id
    }).catch(() => {});
  }

  function formatTimeDisplay(time) {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return {
      time: `${displayHours}:${String(minutes).padStart(2, '0')}`,
      period
    };
  }

  function getNextAlarmText(alarm) {
    if (!alarm.enabled) return 'Off';

    const [hours, minutes] = alarm.time.split(':').map(Number);
    const now = new Date();
    const alarmDate = new Date();
    alarmDate.setHours(hours, minutes, 0, 0);

    if (alarmDate <= now) {
      alarmDate.setDate(alarmDate.getDate() + 1);
    }

    const diffMs = alarmDate - now;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours === 0) {
      return `In ${diffMinutes} min`;
    } else if (diffHours < 24) {
      return `In ${diffHours}h ${diffMinutes}m`;
    } else {
      return 'Tomorrow';
    }
  }
</script>

<div class="flex flex-col h-full p-4">
  <h2 class="text-lg font-medium text-white mb-4">Alarms</h2>

  <!-- Alarm List -->
  <div class="flex-1 overflow-y-auto custom-scrollbar">
    {#if alarms.length === 0}
      <div class="flex items-center justify-center h-32 text-zinc-500">
        No alarms set
      </div>
    {:else}
      {#each alarms as alarm}
        {@const formatted = formatTimeDisplay(alarm.time)}
        <div class="flex items-center justify-between py-4 border-b border-zinc-800">
          <div class="flex-1">
            <div class="flex items-baseline gap-2">
              <span class="text-4xl font-light text-white font-mono {!alarm.enabled ? 'opacity-50' : ''}">
                {formatted.time}
              </span>
              <span class="text-lg text-zinc-400 {!alarm.enabled ? 'opacity-50' : ''}">
                {formatted.period}
              </span>
            </div>
            <div class="flex items-center gap-2 mt-1">
              <span class="text-sm text-zinc-500">{alarm.label}</span>
              <span class="text-xs text-zinc-600">•</span>
              <span class="text-xs text-zinc-500">{getNextAlarmText(alarm)}</span>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <!-- Toggle Switch -->
            <button
              class="relative w-12 h-7 rounded-full transition-colors duration-200
                     {alarm.enabled ? 'bg-violet-600' : 'bg-zinc-700'}"
              onclick={() => toggleAlarm(alarm)}
              aria-label={alarm.enabled ? 'Disable alarm' : 'Enable alarm'}
            >
              <div
                class="absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200
                       {alarm.enabled ? 'translate-x-6' : 'translate-x-1'}"
              ></div>
            </button>

            <!-- Delete Button -->
            <button
              class="p-2 text-zinc-500 hover:text-red-400 transition-colors duration-200"
              onclick={() => deleteAlarm(alarm)}
              aria-label="Delete alarm"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      {/each}
    {/if}
  </div>

  <!-- Add Alarm Form -->
  {#if showAddForm}
    <div class="mt-4 p-4 bg-zinc-900 rounded-xl">
      <div class="mb-4">
        <label for="alarm-time" class="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Time</label>
        <input
          id="alarm-time"
          type="time"
          bind:value={newAlarmTime}
          class="w-full bg-zinc-800 text-white text-2xl font-mono p-3 rounded-lg border border-zinc-700 focus:border-violet-500 focus:outline-none"
        />
      </div>

      <div class="mb-4">
        <label for="alarm-label" class="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Label</label>
        <input
          id="alarm-label"
          type="text"
          bind:value={newAlarmLabel}
          placeholder="Alarm"
          class="w-full bg-zinc-800 text-white p-3 rounded-lg border border-zinc-700 focus:border-violet-500 focus:outline-none"
        />
      </div>

      <div class="flex gap-3">
        <button
          class="flex-1 py-2.5 bg-zinc-700 hover:bg-zinc-600 rounded-full text-white font-medium transition-colors duration-200"
          onclick={() => showAddForm = false}
        >
          Cancel
        </button>
        <button
          class="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 rounded-full text-white font-medium transition-colors duration-200"
          onclick={addAlarm}
        >
          Save
        </button>
      </div>
    </div>
  {:else}
    <!-- Add Alarm Button -->
    <button
      class="mt-4 py-3 bg-violet-600 hover:bg-violet-700 rounded-full text-white font-medium transition-colors duration-200 flex items-center justify-center gap-2"
      onclick={() => showAddForm = true}
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
      Add Alarm
    </button>
  {/if}
</div>
