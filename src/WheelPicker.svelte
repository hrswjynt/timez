<script>
  import { onMount, onDestroy } from 'svelte';

  let { value = $bindable(0), min = 0, max = 59, label = '' } = $props();

  let containerRef = $state(null);
  let isAnimating = $state(false);

  const ITEM_HEIGHT = 48;

  // Generate array of values
  const items = $derived(
    Array.from({ length: max - min + 1 }, (_, i) => min + i)
  );

  // Scroll to a specific value
  function scrollToValue(newValue, smooth = true) {
    if (!containerRef) return;

    const targetIndex = items.indexOf(newValue);
    if (targetIndex === -1) return;

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

  // Handle wheel events for precise control (1 step at a time)
  function handleWheel(e) {
    e.preventDefault();

    if (isAnimating) return;

    // Determine direction based on scroll delta
    const direction = e.deltaY > 0 ? 1 : -1;

    // Calculate new value
    const currentIndex = items.indexOf(value);
    const newIndex = Math.max(0, Math.min(items.length - 1, currentIndex + direction));
    const newValue = items[newIndex];

    if (newValue !== value) {
      value = newValue;
      scrollToValue(newValue);
    }
  }

  // Handle scroll to update value
  function handleScroll() {
    if (!containerRef || isAnimating) return;

    const scrollTop = containerRef.scrollTop;
    const index = Math.round(scrollTop / ITEM_HEIGHT);
    const newIndex = Math.max(0, Math.min(items.length - 1, index));
    const newValue = items[newIndex];

    if (newValue !== value) {
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
      const targetIndex = items.indexOf(value);
      if (targetIndex !== -1) {
        containerRef.scrollTop = targetIndex * ITEM_HEIGHT;
      }
    }
  });

  // Sync scroll position when value changes externally (e.g., from presets)
  $effect(() => {
    if (containerRef && !isAnimating) {
      const targetIndex = items.indexOf(value);
      if (targetIndex !== -1) {
        const expectedScroll = targetIndex * ITEM_HEIGHT;
        // Only scroll if significantly different
        if (Math.abs(containerRef.scrollTop - expectedScroll) > ITEM_HEIGHT / 2) {
          scrollToValue(value, false);
        }
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
      onwheel={handleWheel}
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
