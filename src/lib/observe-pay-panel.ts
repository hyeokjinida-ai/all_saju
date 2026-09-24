/** Observe the rendered inline payment panel, including replacement after closing the sheet.
 * A short dwell and a fresh geometry check reject transient layout intersections.
 * Scrolling is not required: a panel already visible on a large screen is a real view.
 */
export function observePayPanel(onVisible: (visible: boolean) => void): () => void {
  let target: HTMLElement | null = null;
  let observer: IntersectionObserver | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  const cancel = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  const attach = () => {
    if (stopped) return;
    const next = document.getElementById("pay-panel");
    if (next === target) return;
    cancel();
    observer?.disconnect();
    target = next;
    onVisible(false);
    if (!next) return;
    const current = next;
    observer = new IntersectionObserver((entries) => {
      if (stopped || current !== target || !current.isConnected) return;
      const entry = entries.find((e) => e.target === current);
      if (!entry) return;
      cancel();
      if (!entry.isIntersecting) return onVisible(false);
      timer = setTimeout(() => {
        timer = undefined;
        if (stopped || current !== target || !current.isConnected) return;
        const rect = current.getBoundingClientRect();
        onVisible(rect.width > 0 && rect.height > 0 && rect.bottom > 0 &&
          rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth);
      }, 250);
    });
    observer.observe(current);
  };
  const mutations = new MutationObserver(attach);
  mutations.observe(document.body, { childList: true, subtree: true });
  attach();
  return () => {
    stopped = true;
    cancel();
    observer?.disconnect();
    mutations.disconnect();
  };
}
