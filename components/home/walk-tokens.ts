import { Children, isValidElement, type ReactNode } from "react";

export type WalkAccent = "emerald";

export type WalkToken = {
  text: string;
  accent?: WalkAccent;
};

/**
 * Split a walk line into words. Punctuation stays on the word.
 * Styled leaves (e.g. emerald "no") keep an accent; copy is unchanged.
 */
export function tokenizeWalkLine(children: ReactNode): WalkToken[] {
  return mergePunctuation(flatten(children));
}

function flatten(node: ReactNode): WalkToken[] {
  const out: WalkToken[] = [];
  Children.forEach(node, (child) => {
    if (child == null || typeof child === "boolean") return;
    if (typeof child === "string" || typeof child === "number") {
      out.push(...splitWords(String(child)));
      return;
    }
    if (isValidElement<{ className?: string; children?: ReactNode }>(child)) {
      const cls = typeof child.props.className === "string" ? child.props.className : "";
      const accent: WalkAccent | undefined = cls.includes("text-emerald") ? "emerald" : undefined;
      const inner = flatten(child.props.children);
      for (const token of inner) {
        out.push({ text: token.text, accent: token.accent ?? accent });
      }
    }
  });
  return out;
}

function splitWords(text: string): WalkToken[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => ({ text: word }));
}

function mergePunctuation(tokens: WalkToken[]): WalkToken[] {
  const out: WalkToken[] = [];
  for (const token of tokens) {
    if (out.length > 0 && /^[^\p{L}\p{N}]+$/u.test(token.text)) {
      const prev = out[out.length - 1];
      out[out.length - 1] = { text: `${prev.text}${token.text}`, accent: prev.accent ?? token.accent };
    } else {
      out.push({ text: token.text, accent: token.accent });
    }
  }
  return out;
}
