<script>
  import { onMount, onDestroy } from 'svelte';

  let { value = $bindable(0), min = 0, max = 59, label = '' } = $props();

  let containerRef = $state(null);
  let isAnimating = $state(false);

  const ITEM_HEIGHT = 48;

  // Generate array of values
  // Generate array of values
  const originalItems = $derived(
    Array.from({ length: max - min + 1 }, (_, i) => min + i)
  );

  // Triple items for infinite scroll
  const items = $derived([...originalItems, ...originalItems, ...originalItems]);

  // Scroll to a specific value
  function scrollToValue(newValue, smooth = true) {
    if (!containerRef) return;

    const baseIndex = originalItems.indexOf(newValue);
    if (baseIndex === -1) return;
    
    const singleSetLength = originalItems.length;
    // Target the middle set
    const targetIndex = baseIndex + singleSetLength; 
    const targetScroll = targetIndex * ITEM_HEIGHT;

    if (smooth) {
      isAnimating = true;
      containerRef.scrollTo({
        top: targetScroll,
        behavior: 'smooth'
      });
      // Reset animating flag after animation completes
      setTimeout(() => {
        isAnimating = false;
      }, 300);
    } else {
      containerRef.scrollTop = targetScroll;
    }
  }



  // Handle scroll to update value
  // Handle scroll to update value
  function handleScroll() {
    if (!containerRef) return;

    const singleSetHeight = originalItems.length * ITEM_HEIGHT;
    
    // Loop logic: jump silently if near edges
    if (containerRef.scrollTop < 10) {
      containerRef.scrollTop += singleSetHeight;
    } else if (containerRef.scrollTop > singleSetHeight * 2 + ITEM_HEIGHT) {
      containerRef.scrollTop -= singleSetHeight;
    }

    if (isAnimating) return;

    const scrollTop = containerRef.scrollTop;
    const index = Math.round(scrollTop / ITEM_HEIGHT);
    const normalizedIndex = index % originalItems.length;
    const newValue = originalItems[normalizedIndex];

    if (newValue !== undefined && newValue !== value) {
      value = newValue;
    }
  }

  // Handle click on item to select it
  function handleItemClick(item) {
    if (item !== value) {
      value = item;
      scrollToValue(item);
    }
  }

  // Initialize scroll position on mount
  onMount(() => {
    if (containerRef) {
      // Force immediate jump to middle set without animation
      scrollToValue(value, false);
    }
  });

  // Sync scroll position when value changes externally (e.g., from presets)
  // Sync scroll position when value changes externally (e.g., from presets)
  $effect(() => {
    if (containerRef && !isAnimating) {
      // We check if the current scroll position roughly matches ANY of the instances of the value
      // If none match, we re-center to the middle instance
      
      const currentScroll = containerRef.scrollTop;
      const index = Math.round(currentScroll / ITEM_HEIGHT);
      const normalizedIndex = index % originalItems.length;
      const currentValueAtScroll = originalItems[normalizedIndex];

      if (currentValueAtScroll !== value) {
        scrollToValue(value, true);
      }
    }
  });
</script>

<div class="flex flex-col items-center">
  <span class="text-xs text-zinc-500 uppercase tracking-wider mb-2">{label}</span>

  <div class="relative h-[240px] w-20 overflow-hidden">
    <!-- Gradient overlays for fade effect -->
    <div class="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black to-transparent z-10 pointer-events-none"></div>
    <div class="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black to-transparent z-10 pointer-events-none"></div>

    <!-- Selection indicator -->
    <div class="absolute inset-x-2 top-1/2 -translate-y-1/2 h-12 border-y border-zinc-700 z-0 pointer-events-none"></div>

    <!-- Scrollable container -->
    <div
      bind:this={containerRef}
      class="h-full overflow-y-scroll scrollbar-hide snap-y snap-mandatory scroll-smooth"
      onscroll={handleScroll}
    >
      <!-- Top padding for centering first item -->
      <div style="height: {ITEM_HEIGHT * 2}px"></div>

      {#each items as item}
        <button
          type="button"
          class="w-full h-12 flex items-center justify-center font-mono transition-all duration-150 cursor-pointer snap-center"
          class:text-white={item === value}
          class:text-6xl={item === value}
          class:font-light={item === value}
          class:text-zinc-600={item !== value}
          class:text-3xl={item !== value}
          onclick={() => handleItemClick(item)}
        >
          {String(item).padStart(2, '0')}
        </button>
      {/each}

      <!-- Bottom padding for centering last item -->
      <div style="height: {ITEM_HEIGHT * 2}px"></div>
    </div>
  </div>
</div>
