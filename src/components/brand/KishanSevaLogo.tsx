import React, { useRef } from 'react';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';
import { gsap, useGSAP } from '@/lib/gsap';

interface KishanSevaLogoProps {
 className?: string;
 size?: 'sm' | 'md' | 'lg' | 'xl';
 theme?: 'light' | 'dark';
 showSubtitle?: boolean;
}

export function KishanSevaLogo({
 className,
 size = 'md',
 theme = 'light',
 showSubtitle = true
}: KishanSevaLogoProps) {
 
 const sizeClasses = {
 sm: { img: 'w-8 h-8', title: 'text-xl', sub: 'text-[10px]' },
 md: { img: 'w-12 h-12', title: 'text-2xl', sub: 'text-xs' },
 lg: { img: 'w-16 h-16', title: 'text-3xl', sub: 'text-sm' },
 xl: { img: 'w-20 h-20', title: 'text-4xl', sub: 'text-base' }
 };

 const themeClasses = {
 light: {
 wrapper: 'bg-white border-emerald-100 shadow-sm',
 titlePrimary: 'text-[#143d23]',
 titleSecondary: 'text-emerald-600',
 subtitle: 'text-slate-500'
 },
 dark: {
 wrapper: 'bg-emerald-900 border-emerald-800 shadow-md',
 titlePrimary: 'text-white',
 titleSecondary: 'text-emerald-300',
 subtitle: 'text-emerald-100/80'
 }
 };

 const currentSize = sizeClasses[size];
 const currentTheme = themeClasses[theme];
 const container = useRef<HTMLDivElement>(null);

 useGSAP(() => {
   // Draw the SVG ring around the logo
   gsap.fromTo(".logo-ring circle", 
     { drawSVG: "0%" },
     { drawSVG: "100%", duration: 1.5, ease: "power2.inOut", delay: 0.2 }
   );

   // Draw the sparkles on hover (lucide icons use strokes!)
   const sparkles = gsap.utils.toArray(".sparkle-icon path");
   gsap.set(sparkles, { drawSVG: "0%" });
   
   const hoverAnim = gsap.to(sparkles, {
     drawSVG: "100%",
     duration: 0.6,
     stagger: 0.1,
     ease: "power1.inOut",
     paused: true
   });

   const wrapper = container.current?.querySelector('.logo-wrapper');
   wrapper?.addEventListener('mouseenter', () => hoverAnim.play());
   wrapper?.addEventListener('mouseleave', () => hoverAnim.reverse());

 }, { scope: container });

 return (
 <div ref={container} className={cn("flex items-center gap-3", className)}>
 <div className={cn(
 "logo-wrapper p-2 rounded-2xl border hover:scale-105 transition-transform shrink-0 flex items-center justify-center relative group",
 currentTheme.wrapper
 )}>
 <svg className="logo-ring absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
   <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="300" className="text-emerald-500/30" />
 </svg>
 <Sparkles className="sparkle-icon absolute -top-1 -right-1 w-3 h-3 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity motion-reduce:hidden" />
 <img 
 src="/logo.svg" 
 alt="Kishan Seva Official Emblem" 
 className={cn("object-contain", currentSize.img)} 
 />
 </div>
 <div>
 <h1 className={cn("font-black leading-none tracking-tight", currentSize.title)}>
 <span className={currentTheme.titlePrimary}>Kishan</span>{' '}
 <span className={currentTheme.titleSecondary}>Seva</span>
 </h1>
 </div>
 </div>
 );
}
