<script>
  let { activeTab = $bindable() } = $props();

  const tabs = [
    { id: 'alarm', label: 'Alarm' },
    { id: 'worldclock', label: 'Clock' },
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
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      {:else if tab.id === 'worldclock'}
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      {:else if tab.id === 'stopwatch'}
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      {:else if tab.id === 'timer'}
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0zM9 3h6M12 3v3" />
        </svg>
      {/if}
      <span class="text-xs font-medium">{tab.label}</span>
    </button>
  {/each}
</nav>
