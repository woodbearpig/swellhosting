import { useLayoutEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * ScrollToTop — resets the window scroll position to (0, 0) every time the
 * pathname changes via a PUSH / REPLACE navigation (i.e. a real in-app click).
 *
 * Why not always? On POP navigations (browser Back / Forward) we intentionally
 * let the browser restore the previous scroll position — that's the natural
 * expectation for those actions. Only "new" navigations should jump to the top.
 *
 * Why useLayoutEffect? So the scroll reset is applied synchronously BEFORE the
 * browser paints the new page. Using a regular useEffect can produce a brief
 * flash where the new page appears scrolled, then snaps to top.
 *
 * Also scrolls any explicit scroll-container passed via prop (e.g. an inner
 * <main> that owns its own scroll on some admin layouts). Falls back to
 * window if no ref/element is passed.
 */
const ScrollToTop = ({ containerSelector }) => {
  const { pathname } = useLocation();
  const navType = useNavigationType(); // 'PUSH' | 'REPLACE' | 'POP'

  useLayoutEffect(() => {
    if (navType === 'POP') return; // preserve back/forward scroll behavior
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      if (containerSelector) {
        const el = document.querySelector(containerSelector);
        if (el && typeof el.scrollTo === 'function') {
          el.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        } else if (el) {
          el.scrollTop = 0;
        }
      }
      // Also nudge document.documentElement for browsers that ignore window.scrollTo
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    } catch { /* noop */ }
  }, [pathname, navType, containerSelector]);

  return null;
};

export default ScrollToTop;
