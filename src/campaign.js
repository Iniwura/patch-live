// Decorative progressive enhancement only. Never alters the arena or Twitch state.
const animated = document.querySelectorAll('.chapter-grid h2, .chapter-side, .chapter-rule, .protocol-heading, .protocol-steps, .closing-big');
if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
  }, { threshold: .12, rootMargin: '0px 0px -24px 0px' });
  for (const el of animated) {el.classList.add('reveal');observer.observe(el);}
}
