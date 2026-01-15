import { useState, useEffect, useRef, useCallback } from 'react';

interface UseCounterOptions {
    duration?: number;
    start?: number;
    decimals?: number;
    easing?: (t: number) => number;
}

// Easing function for smooth animation
const easeOutExpo = (t: number): number => {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
};

/**
 * Custom hook for animated number counting with viewport trigger
 * Animates from start value to end value when element enters viewport
 */
export const useCounter = (
    end: number,
    options: UseCounterOptions = {}
) => {
    const {
        duration = 2000,
        start = 0,
        decimals = 1,
        easing = easeOutExpo,
    } = options;

    const [count, setCount] = useState(start);
    const [hasAnimated, setHasAnimated] = useState(false);
    const elementRef = useRef<HTMLDivElement>(null);
    const animationFrameRef = useRef<number | null>(null);

    const animate = useCallback(() => {
        const startTime = performance.now();
        const startValue = start;
        const endValue = end;

        const step = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easing(progress);
            const currentValue = startValue + (endValue - startValue) * easedProgress;

            setCount(Number(currentValue.toFixed(decimals)));

            if (progress < 1) {
                animationFrameRef.current = requestAnimationFrame(step);
            }
        };

        animationFrameRef.current = requestAnimationFrame(step);
    }, [start, end, duration, decimals, easing]);

    useEffect(() => {
        const element = elementRef.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && !hasAnimated) {
                        setHasAnimated(true);
                        animate();
                    }
                });
            },
            {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px',
            }
        );

        observer.observe(element);

        return () => {
            observer.disconnect();
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [animate, hasAnimated]);

    // Reset function for manual control
    const reset = useCallback(() => {
        setCount(start);
        setHasAnimated(false);
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
    }, [start]);

    return { count, elementRef, reset, hasAnimated };
};

export default useCounter;
