"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface AnimatedElementProps {
  children: React.ReactNode;
  animation?: "fadeIn" | "slideUp" | "slideDown" | "scaleIn" | "rotateIn";
  delay?: number;
  duration?: number;
  trigger?: boolean;
}

export const AnimatedElement: React.FC<AnimatedElementProps> = ({
  children,
  animation = "fadeIn",
  delay = 0,
  duration = 0.6,
  trigger = false,
}) => {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    const animationConfigs: Record<string, any> = {
      fadeIn: { opacity: 0, duration, delay },
      slideUp: { y: 100, opacity: 0, duration, delay },
      slideDown: { y: -100, opacity: 0, duration, delay },
      scaleIn: { scale: 0, opacity: 0, duration, delay },
      rotateIn: { rotation: -180, opacity: 0, duration, delay },
    };

    const config = animationConfigs[animation] || animationConfigs.fadeIn;

    if (trigger) {
      gsap.fromTo(ref.current, config, {
        opacity: 1,
        y: 0,
        scale: 1,
        rotation: 0,
        duration: config.duration,
        delay: config.delay,
        scrollTrigger: {
          trigger: ref.current,
          start: "top 80%",
          once: true,
        },
      });
    } else {
      gsap.fromTo(ref.current, config, {
        opacity: 1,
        y: 0,
        scale: 1,
        rotation: 0,
        duration: config.duration,
        delay: config.delay,
      });
    }
  }, [animation, delay, duration, trigger]);

  return <div ref={ref}>{children}</div>;
};

export default AnimatedElement;
