import React, { useRef } from 'react';
import { HelpCircle, MessageSquare } from 'lucide-react';
import { gsap, useGSAP, Draggable } from '@/lib/gsap';

export function DraggableHelper() {
  const helperRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!helperRef.current) return;

    // Bounce in on mount
    gsap.from(helperRef.current, {
      scale: 0,
      opacity: 0,
      duration: 1,
      ease: "elastic.out(1, 0.5)",
      delay: 1.5
    });

    // Make the helper draggable with inertia
    Draggable.create(helperRef.current, {
      type: "x,y",
      bounds: "body",
      inertia: true,
      edgeResistance: 0.8,
      onPress: function() {
        gsap.to(this.target, { scale: 0.95, duration: 0.1 });
      },
      onRelease: function() {
        gsap.to(this.target, { scale: 1, duration: 0.2, ease: "back.out(1.5)" });
      },
      onClick: function() {
        // Simple spin effect on click when not dragging
        gsap.to(this.target, {
          rotation: "+=360",
          duration: 0.8,
          ease: "power2.inOut"
        });
      }
    });
  }, { scope: helperRef });

  return (
    <div 
      ref={helperRef}
      className="fixed bottom-6 right-6 z-50 cursor-grab active:cursor-grabbing select-none"
      style={{ touchAction: 'none' }}
    >
      <div className="relative group">
        <div className="absolute inset-0 bg-emerald-500 rounded-full blur-md opacity-40 group-hover:opacity-70 transition-opacity"></div>
        <button 
          className="relative w-14 h-14 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-2xl border-2 border-emerald-500 hover:bg-slate-800 transition-colors"
          title="Need Help? Drag me!"
        >
          <MessageSquare className="w-6 h-6 text-emerald-400" />
          
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900">
            1
          </div>
        </button>
      </div>
    </div>
  );
}
