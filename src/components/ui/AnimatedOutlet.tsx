import { useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0, y: 15, scale: 0.99 },
  in: { opacity: 1, y: 0, scale: 1 },
  out: { opacity: 0, y: -15, scale: 1.01 },
};

const pageTransition = {
  duration: 0.4,
  ease: [0.22, 1, 0.36, 1], // Smooth premium ease-out
};

export default function AnimatedOutlet() {
  const location = useLocation();
  const element = useOutlet();

  return (
    <AnimatePresence mode="wait" initial={false}>
      {element && (
        <motion.div
          key={location.pathname}
          initial="initial"
          animate="in"
          exit="out"
          variants={pageVariants}
          transition={pageTransition as any}
          className="w-full h-full flex flex-col"
        >
          {element}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
