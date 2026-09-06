import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface AnimatedPageProps {
 children: ReactNode;
 className?: string;
}

const pageVariants = {
 initial: {
 opacity: 0,
 y: 20,
 scale: 0.98,
 },
 in: {
 opacity: 1,
 y: 0,
 scale: 1,
 },
 out: {
 opacity: 0,
 y: -20,
 scale: 1.02,
 },
};

const pageTransition = {
 duration: 0.4,
 ease: 'easeOut',
};

export default function AnimatedPage({ children, className = '' }: AnimatedPageProps) {
 return (
 <motion.div
 initial="initial"
 animate="in"
 exit="out"
 variants={pageVariants}
 transition={pageTransition as any}
 className={`w-full h-full ${className}`}
 >
 {children}
 </motion.div>
 );
}
