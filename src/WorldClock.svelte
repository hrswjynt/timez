<script>
  import { onMount, onDestroy } from 'svelte';
  import { slide, fly, fade } from 'svelte/transition';
  import { flip } from 'svelte/animate';

  let cities = $state([]);

  let currentTime = $state(new Date());
  let showAddForm = $state(false);
  let newCityName = $state('');
  let newCityTimezone = $state('');
  let intervalId = null;
  let isMounted = $state(false);

  // Common timezones for dropdown
  const timezones = [
    { value: 'America/New_York', label: 'New York (EST)' },
    { value: 'America/Los_Angeles', label: 'Los Angeles (PST)' },
    { value: 'America/Chicago', label: 'Chicago (CST)' },
    { value: 'America/Denver', label: 'Denver (MST)' },
    { value: 'America/Toronto', label: 'Toronto (EST)' },
    { value: 'America/Vancouver', label: 'Vancouver (PST)' },
    { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)' },
    { value: 'Europe/London', label: 'London (GMT)' },
    { value: 'Europe/Paris', label: 'Paris (CET)' },
    { value: 'Europe/Berlin', label: 'Berlin (CET)' },
    { value: 'Europe/Rome', label: 'Rome (CET)' },
    { value: 'Europe/Madrid', label: 'Madrid (CET)' },
    { value: 'Europe/Amsterdam', label: 'Amsterdam (CET)' },
    { value: 'Europe/Moscow', label: 'Moscow (MSK)' },
    { value: 'Asia/Dubai', label: 'Dubai (GST)' },
    { value: 'Asia/Kolkata', label: 'Mumbai (IST)' },
    { value: 'Asia/Bangkok', label: 'Bangkok (ICT)' },
    { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
    { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
    { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Asia/Seoul', label: 'Seoul (KST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
    { value: 'Australia/Melbourne', label: 'Melbourne (AEST)' },
    { value: 'Pacific/Auckland', label: 'Auckland (NZST)' }
  ];

  // Update time every second
  onMount(() => {
    loadCities();
    intervalId = setInterval(() => {
      currentTime = new Date();
    }, 1000);
  });

  onDestroy(() => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  });

  async function loadCities() {
    // Default cities (same as previous hardcoded state)
    const defaults = [
      { id: 1, name: 'New York', timezone: 'America/New_York' },
      { id: 2, name: 'London', timezone: 'Europe/London' },
      { id: 3, name: 'Tokyo', timezone: 'Asia/Tokyo' }
    ];

    if (typeof browser !== 'undefined') {
      try {
        const result = await browser.storage.local.get('worldClockCities');
        if (result.worldClockCities) {
          cities = result.worldClockCities;
        } else {
          // No saved data, use defaults
          cities = defaults;
        }
      } catch (e) {
        console.error('Failed to load cities:', e);
        cities = defaults;
      }
    } else {
      // Fallback for non-extension environment
      cities = defaults;
    }
    
    // Enable animations only AFTER initial data is loaded
    // Use a small timeout to ensure the DOM has updated with the initial list
    setTimeout(() => {
      isMounted = true;
    }, 100);
  }

  async function saveCities() {
    if (typeof browser !== 'undefined') {
      try {
        // Deep copy to remove Svelte proxies
        const citiesToSave = JSON.parse(JSON.stringify(cities));
        await browser.storage.local.set({ worldClockCities: citiesToSave });
      } catch (e) {
        console.error('Failed to save cities:', e);
      }
    }
  }

  function getTimeParts(timezone) {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    
    // We can rely on predictable format for en-US: "10:30:45 AM"
    const timeString = formatter.format(currentTime);
    const [timeWithSeconds, ampm] = timeString.split(' ');
    const [hours, minutes, seconds] = timeWithSeconds.split(':');
    
    return {
      main: `${hours}:${minutes}`,
      sub: seconds,
      ampm: ampm
    };
  }

  function getDateForTimezone(timezone) {
    return currentTime.toLocaleDateString('en-US', {
      timeZone: timezone,
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  }

  function getTimeDiff(timezone) {
    const localOffset = currentTime.getTimezoneOffset();
    const targetDate = new Date(currentTime.toLocaleString('en-US', { timeZone: timezone }));
    const localDate = new Date(currentTime.toLocaleString('en-US'));
    const diffMs = targetDate - localDate;
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));

    if (diffHours === 0) return 'Same time';
    if (diffHours > 0) return `+${diffHours}h`;
    return `${diffHours}h`;
  }

  function addCity() {
    if (!newCityName || !newCityTimezone) return;

    cities = [...cities, {
      id: Date.now(),
      name: newCityName,
      timezone: newCityTimezone
    }];

    saveCities();
    showAddForm = false;
    newCityName = '';
    newCityTimezone = '';
  }

  function removeCity(city) {
    cities = cities.filter(c => c.id !== city.id);
    saveCities();
  }

  function startupSlide(node, params) {
    if (!isMounted) return { duration: 0 };
    return slide(node, params);
  }
</script>

<div class="h-full p-4 grid grid-cols-1 grid-rows-1 overflow-hidden relative">
  <!-- City List (Always Rendered) -->
  <div class="flex flex-col h-full col-start-1 row-start-1">
    <h2 class="text-lg font-medium text-white mb-4">World Clock</h2>

    <!-- City List -->
    <div class="flex-1 overflow-y-auto custom-scrollbar">
      {#if cities.length === 0}
        <div class="flex items-center justify-center h-32 text-zinc-500">
          No cities added
        </div>
      {:else}
        {#each cities as city (city.id)}
          <div 
            class="flex items-center justify-between py-4 border-b border-zinc-800"
            transition:startupSlide|local={{ duration: 200, axis: 'y' }}
            animate:flip={{ duration: 300 }}
          >
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-sm text-zinc-400">{city.name}</span>
                <span class="text-xs text-zinc-600 px-2 py-0.5 bg-zinc-800 rounded">
                  {getTimeDiff(city.timezone)}
                </span>
              </div>
              <div class="text-white font-mono flex gap-1.5 h-10">
                <span class="text-4xl font-light leading-none flex items-center">{getTimeParts(city.timezone).main}</span>
                <div class="flex flex-col justify-between text-xs text-zinc-400 font-medium leading-none py-0.5">
                  <span>{getTimeParts(city.timezone).ampm}</span>
                  <span class="text-zinc-300 font-bold text-sm tracking-wide">{getTimeParts(city.timezone).sub}</span>
                </div>
              </div>
              <div class="text-xs text-zinc-500 mt-1">
                {getDateForTimezone(city.timezone)}
              </div>
            </div>

            <button
              class="p-2 text-zinc-500 hover:text-red-400 transition-colors duration-200"
              onclick={() => removeCity(city)}
              aria-label="Remove {city.name}"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        {/each}
      {/if}
    </div>

    <!-- Add City Button -->
    <button
      class="mt-4 py-3 bg-violet-600 hover:bg-violet-700 rounded-full text-white font-medium transition-colors duration-200 flex items-center justify-center gap-2"
      onclick={() => showAddForm = true}
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
      Add City
    </button>
  </div>

  <!-- Add City Form (Overlay) -->
  {#if showAddForm}
    <div 
      class="flex flex-col h-full bg-zinc-950 col-start-1 row-start-1 z-10"
      in:fly|local={{ y: 20, duration: 300, delay: 150 }}
      out:fade|local={{ duration: 150 }}
    >
      <h2 class="text-lg font-medium text-white mb-4">Add City</h2>
      
      <div class="flex-1">
        <div class="mb-4">
          <label for="city-name" class="block text-xs text-zinc-500 uppercase tracking-wider mb-2">City Name</label>
          <input
            id="city-name"
            type="text"
            bind:value={newCityName}
            placeholder="e.g., Paris"
            class="w-full bg-zinc-800 text-white p-3 rounded-lg border border-zinc-700 focus:border-violet-500 focus:outline-none"
          />
        </div>

        <div class="mb-4">
          <label for="city-timezone" class="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Timezone</label>
          <select
            id="city-timezone"
            bind:value={newCityTimezone}
            class="w-full bg-zinc-800 text-white p-3 rounded-lg border border-zinc-700 focus:border-violet-500 focus:outline-none"
          >
            <option value="">Select timezone</option>
            {#each timezones as tz}
              <option value={tz.value}>{tz.label}</option>
            {/each}
          </select>
        </div>
      </div>

      <div class="flex gap-3 mt-auto">
        <button
          class="flex-1 py-3 bg-zinc-700 hover:bg-zinc-600 rounded-full text-white font-medium transition-colors duration-200"
          onclick={() => showAddForm = false}
        >
          Cancel
        </button>
        <button
          class="flex-1 py-3 bg-violet-600 hover:bg-violet-700 rounded-full text-white font-medium transition-colors duration-200
                 {!newCityName || !newCityTimezone ? 'opacity-50 cursor-not-allowed' : ''}"
          onclick={addCity}
          disabled={!newCityName || !newCityTimezone}
        >
          Add
        </button>
      </div>
    </div>
  {/if}
</div>
