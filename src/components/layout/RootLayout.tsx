import { Outlet } from 'react-router-dom';
import { gsap, ScrollSmoother, useGSAP } from '@/lib/gsap';
import { useRef } from 'react';

export default function RootLayout() {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Only initialize ScrollSmoother if not on a mobile device where native scroll is often preferred,
    // though ScrollSmoother handles touch fine, we ensure it's registered.
    ScrollSmoother.create({
      wrapper: '#smooth-wrapper',
      content: '#smooth-content',
      smooth: 1.5,
      effects: true,
      normalizeScroll: true, // Prevents address bar hide/show jumping on mobile
    });
  }, { scope: container });

  return (
    <div ref={container} className="min-h-screen bg-background font-sans antialiased" id="smooth-wrapper">
      <div id="smooth-content">
        <Outlet />
      </div>
    </div>
  );
}
