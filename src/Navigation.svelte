<script>
  let { activeTab = $bindable() } = $props();

  const tabs = [
    { id: 'alarm', label: 'Alarm' },
    { id: 'worldclock', label: 'World Clock' },
    { id: 'stopwatch', label: 'Stopwatch' },
    { id: 'timer', label: 'Timer' }
  ];
</script>

<nav class="flex justify-around items-center h-14 bg-zinc-900 border-t border-zinc-800">
  {#each tabs as tab}
    <button
      class="flex-1 w-full flex flex-col items-center gap-1 px-4 py-2 transition-colors duration-200
             {activeTab === tab.id ? 'text-violet-500' : 'text-zinc-500 hover:text-zinc-300'}"
      onclick={() => activeTab = tab.id}
    >
      {#if tab.id === 'alarm'}
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z M19 4l-2 2 M5 4l2 2" />
          <!-- Waker/Alarm Clock: Circle with hands + "ears"/bells -->
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 22a9 9 0 1 1 0-18 9 9 0 0 1 0 18ZM19 4L17 6M5 4L7 6M12 8V12L15 15" />
        </svg>
      {:else if tab.id === 'worldclock'}
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <!-- Globe/World: Circle with meridians/parallels -->
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 0c2.5 0 5 4.48 5 10s-2.5 10-5 10-5-4.48-5-10 2.5-10 5-10ZM2 12h20" />
        </svg>
      {:else if tab.id === 'stopwatch'}
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <!-- Mechanical Stopwatch: Circle with top button -->
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M12 6a9 9 0 1 0 9 9 9 9 0 0 0-9-9Zm0-4v4m-4-2h8m-4 6v5" />
        </svg>
      {:else if tab.id === 'timer'}
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <!-- Hourglass -->
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M7 2v4l5 5-5 5v4h10v-4l-5-5 5-5V2H7Z" />
        </svg>
      {/if}
      <span class="text-xs font-medium whitespace-nowrap">{tab.label}</span>
    </button>
  {/each}
</nav>
