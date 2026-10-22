export type VisibleImpressionOptions = {
  threshold?: number;
  visibleMs?: number;
  onImpression: () => void;
};

export function observeVisibleImpression(
  node: Element,
  options: VisibleImpressionOptions
): () => void {
  const threshold = options.threshold ?? 0.5;
  const visibleMs = options.visibleMs ?? 1000;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let impressed = false;

  const clearTimer = (): void => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  const observer = new IntersectionObserver(
    (entries) => {
      if (impressed) {
        return;
      }
      const visibleEnough = entries.some(
        (entry) => entry.isIntersecting && entry.intersectionRatio >= threshold
      );
      if (!visibleEnough) {
        clearTimer();
        return;
      }
      if (timer !== undefined) {
        return;
      }
      timer = setTimeout(() => {
        if (impressed) {
          return;
        }
        impressed = true;
        clearTimer();
        options.onImpression();
      }, visibleMs);
    },
    { threshold: [0, threshold, 1] }
  );

  observer.observe(node);
  return () => {
    clearTimer();
    observer.disconnect();
  };
}
