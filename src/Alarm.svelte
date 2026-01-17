<script>
  import { onMount, onDestroy } from 'svelte';
  import { slide, fly, fade } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import WheelPicker from './WheelPicker.svelte';
  import { uiState } from './uiState.svelte.js';

  let alarms = $state([]);
  let showAddForm = $state(false);
  
  // New Form State
  let editingAlarmId = $state(null); // ID of the alarm being edited, or null if creating new
  let newAlarmHours = $state(0);
  let newAlarmMinutes = $state(0);
  let newAlarmLabel = $state('');
  let selectedDays = $state([false, false, false, false, false, false, false]); // Sun-Sat

  let isMounted = $state(false);

  const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
    
    // Enable animations only AFTER initial data is loaded
    setTimeout(() => {
      isMounted = true;
    }, 100);
  }

  async function saveAlarms() {
    if (typeof browser !== 'undefined') {
      try {
        // Deep copy to remove Svelte proxies
        const alarmsToSave = JSON.parse(JSON.stringify(alarms));
        await browser.storage.local.set({ alarms: alarmsToSave });
      } catch (e) {
        console.error('Failed to save alarms:', e);
      }
    }
  }

  function getNextOccurrence() {
    const now = new Date();
    const currentDay = now.getDay();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();

    let targetDate = new Date();
    targetDate.setHours(newAlarmHours, newAlarmMinutes, 0, 0);

    // Check if any days are selected
    const isRepeating = selectedDays.some(d => d);

    if (!isRepeating) {
      // One-time alarm logic
      if (targetDate <= now) {
        targetDate.setDate(targetDate.getDate() + 1); // Tomorrow
      }
    } else {
      // Repeating alarm logic
      // Find the next active day
      let daysToAdd = 0;
      let found = false;

      // Check current day first if time hasn't passed
      if (selectedDays[currentDay]) {
         if (targetDate > now) {
           daysToAdd = 0;
           found = true;
         }
      }

      if (!found) {
        // Look for next days
        for (let i = 1; i <= 7; i++) {
          const checkDay = (currentDay + i) % 7;
          if (selectedDays[checkDay]) {
            daysToAdd = i;
            found = true;
            break;
          }
        }
      }
      targetDate.setDate(targetDate.getDate() + daysToAdd);
    }

    return targetDate;
  }

  const nextRingText = $derived(() => {
    const target = getNextOccurrence();
    const now = new Date();
    
    // Calculate difference in days roughly
    const diffTime = target - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    const dayName = FULL_DAYS[target.getDay()];
    const month = MONTHS[target.getMonth()];
    const date = target.getDate();
    
    let prefix = '';
    if (diffDays <= 1 && target.getDate() === now.getDate()) prefix = 'Today - ';
    else if (target.getDate() === new Date(now.getTime() + 86400000).getDate()) prefix = 'Tomorrow - ';
    
    return `${prefix}${dayName}, ${month} ${date}`;
  });

  function addAlarm() {
    const timeString = `${String(newAlarmHours).padStart(2, '0')}:${String(newAlarmMinutes).padStart(2, '0')}`;
    const daysIndices = selectedDays.map((isSelected, index) => isSelected ? index : -1).filter(i => i !== -1);

    if (editingAlarmId) {
        // Edit existing alarm
        const index = alarms.findIndex(a => a.id === editingAlarmId);
        if (index !== -1) {
            alarms[index] = {
                ...alarms[index],
                time: timeString,
                label: newAlarmLabel || 'Alarm',
                days: daysIndices,
                enabled: true // Re-enable on edit usually makes sense, or keep toggle? Let's enabling.
            };
             // Reactivity trigger is tricky with fine-grained index assignment in Svelte 5 sometimes? 
             // Ideally alarms = [...alarms] is safest or deep mutation.
             alarms = [...alarms]; 
             scheduleAlarm(alarms[index]);
        }
    } else {
        // Create new alarm
        const alarm = {
            id: Date.now(),
            time: timeString,
            label: newAlarmLabel || 'Alarm',
            enabled: true,
            days: daysIndices
        };
        alarms = [...alarms, alarm];
        scheduleAlarm(alarm);
    }

    saveAlarms();
    
    // Reset form
    showAddForm = false;
    uiState.isOverlayOpen = false;
    newAlarmLabel = '';
    editingAlarmId = null;
  }

  function toggleAlarm(alarm, event) {
    event.stopPropagation(); // Prevent card click
    alarm.enabled = !alarm.enabled;
    alarms = [...alarms]; // Trigger reactivity
    saveAlarms();

    if (alarm.enabled) {
      scheduleAlarm(alarm);
    } else {
      cancelAlarm(alarm);
    }
  }

  function deleteAlarm() {
    if (!editingAlarmId) return;
    
    const alarm = alarms.find(a => a.id === editingAlarmId);
    if (alarm) {
        cancelAlarm(alarm);
        alarms = alarms.filter(a => a.id !== editingAlarmId);
        saveAlarms();
    }
    
    showAddForm = false;
    uiState.isOverlayOpen = false;
    editingAlarmId = null;
  }

  function scheduleAlarm(alarm) {
    if (typeof browser === 'undefined') return;
    
    const [h, m] = alarm.time.split(':').map(Number);
    
    const now = new Date();
    let targetDate = new Date();
    targetDate.setHours(h, m, 0, 0);
    
    const hasDays = alarm.days && alarm.days.length > 0;
    
    if (!hasDays) {
       if (targetDate <= now) targetDate.setDate(targetDate.getDate() + 1);
    } else {
       const currentDay = now.getDay();
       let daysToAdd = 0;
       let found = false;
       
       // Check today
       if (alarm.days.includes(currentDay)) {
         if (targetDate > now) {
            daysToAdd = 0;
            found = true;
         }
       }
       
       if (!found) {
         for (let i = 1; i <= 7; i++) {
           const d = (currentDay + i) % 7;
           if (alarm.days.includes(d)) {
             daysToAdd = i;
             found = true;
             break;
           }
         }
       }
       targetDate.setDate(targetDate.getDate() + daysToAdd);
    }

    const delayInMinutes = (targetDate - now) / 60000;

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
      time: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
      period: '' 
    };
  }

  function getRepeatingText(alarm) {
    if (!alarm.days || alarm.days.length === 0) {
        const [h, m] = alarm.time.split(':').map(Number);
        const now = new Date();
        if (h > now.getHours() || (h === now.getHours() && m > now.getMinutes())) {
            return `Today - ${MONTHS[now.getMonth()]} ${now.getDate()}`;
        } else {
             const tmr = new Date(now);
             tmr.setDate(tmr.getDate() + 1);
             return `Tomorrow - ${MONTHS[tmr.getMonth()]} ${tmr.getDate()}`;
        }
    }
    if (alarm.days.length === 7) return 'Every day';
    if (alarm.days.length === 2 && alarm.days.includes(0) && alarm.days.includes(6)) return 'Weekends';
    if (alarm.days.length === 5 && !alarm.days.includes(0) && !alarm.days.includes(6)) return 'Weekdays';
    
    // For specific days, we can just show text OR we can implement the "S M T W T F S" visual from screenshot
    return 'custom';
  }

  function openAddForm(alarmToEdit = null) {
    if (alarmToEdit) {
        editingAlarmId = alarmToEdit.id;
        const [h, m] = alarmToEdit.time.split(':').map(Number);
        newAlarmHours = h;
        newAlarmMinutes = m;
        newAlarmLabel = alarmToEdit.label || '';
        
        // Reset days
        selectedDays = [false, false, false, false, false, false, false];
        if (alarmToEdit.days) {
            alarmToEdit.days.forEach(idx => selectedDays[idx] = true);
        }
    } else {
        editingAlarmId = null;
        const now = new Date();
        newAlarmHours = now.getHours();
        newAlarmMinutes = now.getMinutes();
        selectedDays = [false, false, false, false, false, false, false];
        newAlarmLabel = ''; // Ensure label is cleared for new
    }
    
    showAddForm = true;
    uiState.isOverlayOpen = true;
  }

  function toggleDay(index) {
    selectedDays[index] = !selectedDays[index];
    selectedDays = [...selectedDays]; // Reactivity
  }

  function startupSlide(node, params) {
    if (!isMounted) return { duration: 0 };
    return slide(node, params);
  }
</script>

<div class="h-full p-4 grid grid-cols-1 grid-rows-1 overflow-hidden relative">
  <!-- Alarm List (Always Rendered) -->
  <div class="flex flex-col h-full col-start-1 row-start-1">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-bold text-white tracking-tight">Alarm</h2>
      <!-- Header Actions -->
      <div class="flex gap-4">
         <button
          class="text-zinc-400 hover:text-white transition-colors"
          onclick={() => openAddForm()}
          aria-label="Add alarm"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Alarm List -->
    <div class="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 pb-4">
      {#if alarms.length === 0}
        <div class="flex flex-col items-center justify-center h-full text-zinc-500 gap-2">
            <span class="text-4xl text-zinc-700">⏰</span>
          <span>No alarms set</span>
        </div>
      {:else}
        {#each alarms as alarm (alarm.id)}
          {@const formatted = formatTimeDisplay(alarm.time)}
          {@const repeatText = getRepeatingText(alarm)}
          
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <div 
            class="relative flex items-center justify-between px-4 pt-2 pb-3 bg-zinc-900 rounded-2xl group overflow-hidden cursor-pointer"
            transition:startupSlide|local={{ duration: 300, axis: 'y' }}
            animate:flip={{ duration: 300 }}
            onclick={() => openAddForm(alarm)}
            role="button"
            tabindex="0"
          > 
            <div class="flex flex-col justify-center gap-1 z-10 w-3/5">
               <!-- Label -->
               <span class="text-xs text-zinc-500 font-medium truncate pr-4">
                 {alarm.label}
               </span>
               <!-- Time -->
               <div class="flex items-baseline gap-1">
                 <span class="text-4xl font-light text-white font-mono tracking-tighter {!alarm.enabled ? 'opacity-40' : ''}">
                   {formatted.time}
                 </span>
                 {#if formatted.period}
                    <span class="text-sm text-zinc-500">{formatted.period}</span>
                 {/if}
               </div>
            </div>

            <div class="flex flex-col items-end justify-center gap-4 w-2/5">
                <!-- Info/Days -->
               <div class="text-xs text-zinc-400 font-medium text-right h-5 flex items-center justify-end">
                   {#if repeatText === 'custom'}
                      <!-- Visual Days -->
                       <div class="flex gap-0.5">
                           {#each DAYS as d, i}
                               <span class="{alarm.days.includes(i) ? 'text-violet-400' : (i===0 ? 'text-zinc-600' : 'text-zinc-700')}">
                                   {d}
                               </span>
                           {/each}
                       </div>
                   {:else}
                       {repeatText}
                   {/if}
               </div>

              <!-- Toggle Switch -->
              <button
                class="relative w-12 h-7 rounded-full transition-colors duration-200 flex-shrink-0
                       {alarm.enabled ? 'bg-violet-600' : 'bg-zinc-700'}"
                onclick={(e) => toggleAlarm(alarm, e)}
                aria-label={alarm.enabled ? 'Disable alarm' : 'Enable alarm'}
              >
                <div
                  class="absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200
                         {alarm.enabled ? 'translate-x-6' : 'translate-x-1'}"
                ></div>
              </button>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </div>

  <!-- Add Alarm Form (Overlay) -->
  {#if showAddForm}
    <div 
      class="flex flex-col h-full bg-zinc-950 col-start-1 row-start-1 z-20"
      in:fly|local={{ y: 20, duration: 300, delay: 100 }}
      out:fly|local={{ y: 20, duration: 250 }}
    >
      <!-- Time Picker Area -->
      <div class="flex-1 flex flex-col items-center justify-center min-h-0 pt-8">
        <div class="flex gap-1 items-center justify-center scale-100">
          <WheelPicker bind:value={newAlarmHours} min={0} max={23} label="" />
          <div class="text-4xl text-white font-mono pb-2">:</div>
          <WheelPicker bind:value={newAlarmMinutes} min={0} max={59} label="" />
        </div>
      </div>

      <!-- Bottom Formatting Section -->
      <div class="bg-zinc-900 rounded-t-3xl p-6 pb-4 shadow-2xl z-20">
        <!-- Next Ring Text -->
        <div class="flex justify-between items-center mb-6">
          <span class="text-zinc-400 text-sm">{nextRingText()}</span>
          <svg class="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>

        <!-- Day Selector -->
        <div class="flex justify-between mb-8">
          {#each DAYS as day, i}
             <button
               class="w-8 h-8 rounded-full text-sm font-medium transition-all duration-200
                      {selectedDays[i] ? 'bg-violet-600 text-white' : (i === 0 ? 'text-red-500 hover:text-red-400' : 'text-zinc-500 hover:text-zinc-300')}"
               onclick={() => toggleDay(i)}
             >
               {day}
             </button>
          {/each}
        </div>

        <!-- Inputs -->
        <div class="mb-8">
          <input
            type="text"
            bind:value={newAlarmLabel}
            placeholder="Alarm name"
            class="w-full bg-transparent text-zinc-400 placeholder-zinc-600 border-b border-zinc-700 pb-2 focus:border-violet-400 focus:text-white focus:outline-none transition-colors"
          />
        </div>

        <!-- Actions -->
        <div class="flex gap-3 mt-auto">
          <button
            class="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-full text-white font-medium transition-colors duration-200 flex items-center justify-center"
            onclick={() => {
              showAddForm = false;
              uiState.isOverlayOpen = false;
            }}
          >
            Cancel
          </button>
           {#if editingAlarmId}
              <button
                class="flex-1 py-2 bg-red-900/50 hover:bg-red-900 text-red-200 rounded-full font-medium transition-colors duration-200 border border-red-800/50 flex items-center justify-center"
                onclick={deleteAlarm}
              >
                Delete
              </button>
           {/if}
          <button
            class="flex-1 py-2 bg-violet-600 hover:bg-violet-700 rounded-full text-white font-medium transition-colors duration-200 flex items-center justify-center"
            onclick={addAlarm}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
