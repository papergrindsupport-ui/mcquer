import { createContext, useContext } from "react";

export type HoverRefsCtx = {
  hovered: number[];
  setHovered: (v: number[]) => void;
  sticky: number[];
  setSticky: (v: number[]) => void;
  /** Refs belonging to the CORRECT answer — painted green after reveal. */
  correctRefs: number[];
  /** Refs belonging to the user's WRONG pick that are NOT in the correct
   *  answer — painted red after reveal. */
  wrongRefs: number[];
};

export const HoverRefsContext = createContext<HoverRefsCtx>({
  hovered: [],
  setHovered: () => {},
  sticky: [],
  setSticky: () => {},
  correctRefs: [],
  wrongRefs: [],
});

export function useHoverRefs() {
  return useContext(HoverRefsContext);
}
