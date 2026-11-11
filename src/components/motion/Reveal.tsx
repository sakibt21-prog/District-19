"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";

const EXPO_OUT = [0.16, 1, 0.3, 1] as const;

/** Fades and lifts its children into place the first time they scroll into view. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: reduce ? 0.15 : 0.7, delay, ease: EXPO_OUT }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Image reveal: a panel is unmasked from the bottom edge while its contents
 * settle from a slight zoom. Used for the large editorial tiles.
 */
export function MaskReveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      className={className}
      initial={{ clipPath: "inset(100% 0% 0% 0%)" }}
      whileInView={{ clipPath: "inset(0% 0% 0% 0%)" }}
      viewport={{ once: true, margin: "0px 0px -15% 0px" }}
      transition={{ duration: 1.1, delay, ease: [0.87, 0, 0.13, 1] }}
    >
      <motion.div
        className="h-full w-full"
        initial={{ scale: 1.18 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true, margin: "0px 0px -15% 0px" }}
        transition={{ duration: 1.4, delay, ease: EXPO_OUT }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/** Moves its children slower or faster than the page as it scrolls past. */
export function Parallax({
  children,
  distance = 60,
  className,
}: {
  children: ReactNode;
  /** Total travel in pixels across the time the element is on screen. */
  distance?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [distance / 2, -distance / 2]);
  return (
    <div ref={ref} className={className}>
      <motion.div style={reduce ? undefined : { y }} className="h-full w-full">
        {children}
      </motion.div>
    </div>
  );
}

/**
 * Headline that rises in one character at a time. Screen readers get the plain
 * text once. Keep it to short headlines.
 */
export function SplitHeadline({
  text,
  as: Tag = "h2",
  className,
  delay = 0,
  onLoad = false,
}: {
  text: string;
  as?: "h1" | "h2" | "h3" | "p";
  className?: string;
  delay?: number;
  /** Animate on page load instead of waiting for scroll. */
  onLoad?: boolean;
}) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <Tag className={className}>{text}</Tag>;
  }
  const words = text.split(" ");
  let index = 0;
  const trigger = onLoad
    ? { animate: "shown" as const }
    : { whileInView: "shown" as const, viewport: { once: true, margin: "0px 0px -10% 0px" } };
  return (
    <Tag className={className} aria-label={text}>
      <motion.span
        aria-hidden="true"
        initial="hidden"
        {...trigger}
        transition={{ staggerChildren: 0.018, delayChildren: delay }}
        className="inline"
      >
        {words.map((word, wordIndex) => (
          <span key={`${word}-${wordIndex}`} className="inline-block whitespace-nowrap">
            {word.split("").map((char) => {
              const key = index++;
              return (
                <span key={key} className="-my-[0.12em] inline-block overflow-hidden py-[0.12em] align-bottom">
                  <motion.span
                    className="inline-block"
                    variants={{
                      hidden: { y: "105%" },
                      shown: { y: "0%", transition: { duration: 0.8, ease: EXPO_OUT } },
                    }}
                  >
                    {char}
                  </motion.span>
                </span>
              );
            })}
            {wordIndex < words.length - 1 && <span className="inline-block">&nbsp;</span>}
          </span>
        ))}
      </motion.span>
    </Tag>
  );
}
