"use client";

import * as React from "react";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { useAccount } from "@/components/dashboard/AccountContext";
import { Button } from "@/components/ui/button";
import { Compass } from "lucide-react";

const TOUR_STEPS: DriveStep[] = [
  {
    element: '[data-tour="nav-overview"]',
    popover: {
      title: "Your dashboard",
      description: "Attendance health, upcoming sessions, and at-risk students all live here.",
      side: "right",
    },
  },
  {
    element: '[data-tour="onboarding-checklist"]',
    popover: {
      title: "Getting started checklist",
      description: "Track setup progress here — it disappears once every step is done.",
      side: "bottom",
    },
  },
  {
    element: '[data-tour="nav-students"]',
    popover: {
      title: "Students",
      description: "Manage your roster and see per-student attendance rates.",
      side: "right",
    },
  },
  {
    element: '[data-tour="nav-sessions"]',
    popover: {
      title: "Sessions",
      description: "Schedule classes and mark attendance from list or calendar view.",
      side: "right",
    },
  },
  {
    element: '[data-tour="nav-reports"]',
    popover: {
      title: "Reports",
      description: "Pull attendance trends and export data for your team.",
      side: "right",
    },
  },
  {
    element: '[data-tour="command-palette"]',
    popover: {
      title: "Quick search",
      description: "Press ⌘K anytime to jump straight to a student, teacher, or page.",
      side: "top",
    },
  },
  {
    element: '[data-tour="nav-settings"]',
    popover: {
      title: "Settings",
      description: "Manage your team, roles, and billing from here.",
      side: "right",
    },
  },
];

function storageKey(orgId: string) {
  return `vam.tour.completed.${orgId}`;
}

/** A step only counts as usable if its target is actually visible on screen right now. */
function isVisibleTarget(selector: string): boolean {
  if (typeof document === "undefined") return false;
  const el = document.querySelector<HTMLElement>(selector);
  if (!el || el.offsetParent === null) return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function visibleSteps(): DriveStep[] {
  return TOUR_STEPS.filter((step) => isVisibleTarget((step.element as string) || ""));
}

function buildDriver(steps: DriveStep[], onDone: () => void) {
  return driver({
    showProgress: true,
    animate: true,
    allowClose: true,
    overlayColor: "rgba(15, 23, 42, 0.55)",
    nextBtnText: "Next",
    prevBtnText: "Back",
    doneBtnText: "Done",
    steps,
    onDestroyed: onDone,
  });
}

export function useProductTour() {
  const { accountId } = useAccount();

  const start = React.useCallback(() => {
    const steps = visibleSteps();
    if (steps.length === 0) return;
    const instance = buildDriver(steps, () => {
      try {
        localStorage.setItem(storageKey(accountId), "1");
      } catch {}
    });
    instance.drive();
  }, [accountId]);

  return { start };
}

/** Auto-launches the tour once per org for first-time visitors, plus a manual "Take a tour" button. */
export function ProductTourLauncher() {
  const { accountId } = useAccount();
  const { start } = useProductTour();

  React.useEffect(() => {
    let completed = false;
    try {
      completed = localStorage.getItem(storageKey(accountId)) === "1";
    } catch {}
    if (completed) return;

    const timer = setTimeout(() => start(), 800);
    return () => clearTimeout(timer);
  }, [accountId, start]);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={start}
      className="hidden gap-1.5 border-slate-200 text-slate-600 lg:inline-flex"
    >
      <Compass className="h-3.5 w-3.5" />
      Take a tour
    </Button>
  );
}
