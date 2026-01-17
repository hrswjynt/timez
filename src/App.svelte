<script>
  import { onMount } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  import Timer from './Timer.svelte';
  import Stopwatch from './Stopwatch.svelte';
  import Alarm from './Alarm.svelte';
  import WorldClock from './WorldClock.svelte';
  import Navigation from './Navigation.svelte';

  let activeTab = $state('timer');

  // Load saved tab and listen for messages from background script
  onMount(() => {
    if (typeof browser !== 'undefined') {
      // Load last active tab
      browser.storage.local.get('activeTab').then((result) => {
        if (result.activeTab) {
          activeTab = result.activeTab;
        }
      }).catch(() => {});

      browser.runtime.onMessage.addListener((message) => {
        if (message.type === 'alarm-fired') {
          console.log('Alarm fired:', message.name);
        }
      });
    }
  });

  // Save tab whenever it changes
  $effect(() => {
    if (typeof browser !== 'undefined') {
      browser.storage.local.set({ activeTab }).catch(() => {});
    }
  });
</script>

<div class="flex flex-col h-[500px] bg-black">
  <main class="flex-1 overflow-hidden grid grid-cols-1 grid-rows-1 relative">
    {#key activeTab}
      <div 
        class="col-start-1 row-start-1 w-full h-full"
        in:fly={{ x: 20, duration: 300, delay: 150 }}
        out:fade={{ duration: 150 }}
      >
        {#if activeTab === 'timer'}
          <Timer />
        {:else if activeTab === 'stopwatch'}
          <Stopwatch />
        {:else if activeTab === 'alarm'}
          <Alarm />
        {:else if activeTab === 'worldclock'}
          <WorldClock />
        {/if}
      </div>
    {/key}
  </main>

  <Navigation bind:activeTab />
</div>
