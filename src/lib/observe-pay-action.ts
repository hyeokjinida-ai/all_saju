export function observePayAction(
  onVisible: (visible: boolean) => void,
  surface: "inline" | "sheet" = "inline",
): () => void {
  let target: HTMLElement | null = null;
  let container: HTMLElement | null = null;
  let observer: IntersectionObserver | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  let visible = false;
  const cancel = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  const publish = (next: boolean) => {
    if (next === visible) return;
    visible = next;
    onVisible(next);
  };
  const sufficientlyVisible = () => {
    if (!target?.isConnected || !container?.isConnected) return false;
    const rect = target.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    const viewport = window.visualViewport;
    const viewportTop = viewport?.offsetTop ?? 0;
    const viewportLeft = viewport?.offsetLeft ?? 0;
    let top = Math.max(rect.top, viewportTop);
    let bottom = Math.min(rect.bottom, viewportTop + (viewport?.height ?? window.innerHeight));
    let left = Math.max(rect.left, viewportLeft);
    let right = Math.min(rect.right, viewportLeft + (viewport?.width ?? window.innerWidth));
    if (surface === "sheet") {
      const bounds = container.getBoundingClientRect();
      top = Math.max(top, bounds.top);
      bottom = Math.min(bottom, bounds.bottom);
      left = Math.max(left, bounds.left);
      right = Math.min(right, bounds.right);
    }
    return Math.max(0, bottom - top) * Math.max(0, right - left) / (rect.width * rect.height) >= 0.5;
  };
  const update = () => {
    if (stopped) return;
    if (!sufficientlyVisible()) {
      cancel();
      publish(false);
      return;
    }
    if (visible || timer !== undefined) return;
    const current = target;
    timer = setTimeout(() => {
      timer = undefined;
      if (stopped || current !== target) return;
      publish(sufficientlyVisible());
    }, 250);
  };
  const attach = () => {
    if (stopped) return;
    const nextContainer = document.getElementById(surface === "sheet" ? "pay-sheet" : "pay-panel");
    const next = nextContainer?.querySelector<HTMLElement>("button[data-price-amount]") ?? null;
    if (next === target && nextContainer === container) {
      update();
      return;
    }
    cancel();
    observer?.disconnect();
    target = next;
    container = nextContainer;
    publish(false);
    if (!next) return;
    const current = next;
    observer = new IntersectionObserver(() => {
      if (!stopped && current === target && current.isConnected) update();
    }, { threshold: [0, 0.5, 1] });
    observer.observe(current);
    update();
  };
  const mutations = new MutationObserver(attach);
  mutations.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style", "hidden"] });
  window.addEventListener("scroll", update, true);
  window.addEventListener("resize", update);
  window.visualViewport?.addEventListener("resize", update);
  window.visualViewport?.addEventListener("scroll", update);
  attach();
  return () => {
    stopped = true;
    cancel();
    observer?.disconnect();
    mutations.disconnect();
    window.removeEventListener("scroll", update, true);
    window.removeEventListener("resize", update);
    window.visualViewport?.removeEventListener("resize", update);
    window.visualViewport?.removeEventListener("scroll", update);
  };
}
