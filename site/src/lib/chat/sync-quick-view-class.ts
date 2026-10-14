export function syncQuickViewClass(quickViewOpen: boolean): void {
  if (typeof document === 'undefined') {
    return;
  }
  const quickView = document.querySelector('.quick-view-content');
  const chat = document.querySelector('.conversational-ui');
  quickView?.classList.toggle('quick-view-visible', quickViewOpen);
  chat?.classList.toggle('quick-view-visible', quickViewOpen);
}
