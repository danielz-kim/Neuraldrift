import { useInView } from '../hooks/useInView';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

export default function ScrollReveal({
  children,
  className = '',
  as: Component = 'div',
}: ScrollRevealProps) {
  const { ref, isInView } = useInView<HTMLElement>({
    rootMargin: '0px 0px -6% 0px',
    threshold: 0.05,
    once: true,
  });

  return (
    <Component
      ref={ref}
      className={`scroll-reveal ${isInView ? 'scroll-reveal--in' : ''} ${className}`.trim()}
    >
      {children}
    </Component>
  );
}
