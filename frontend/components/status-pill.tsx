import type { ReactNode } from "react";

type Props = {
  tone: "success" | "warning" | "danger" | "info" | "neutral";
  children: ReactNode;
};

const toneClass: Record<Props["tone"], string> = {
  success: "pill pill-success",
  warning: "pill pill-warning",
  danger: "pill pill-danger",
  info: "pill pill-info",
  neutral: "pill pill-neutral",
};

export function StatusPill({ tone, children }: Props) {
  return <span className={toneClass[tone]}>{children}</span>;
}
