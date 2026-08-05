/**
 * Framer Motion feature package for LazyMotion async load.
 * Kept in its own module so ClientProviders can
 * `() => import("./motion-features")` without pulling domAnimation into the
 * initial shared bundle (Motion docs: Reduce bundle size / LazyMotion).
 */
export { domAnimation as default } from "framer-motion";
