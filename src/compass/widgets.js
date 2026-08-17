// Hands-on props for the stops that are easier to think about by touching.

import { coinTray, wireCoinTray } from "./coins.js";
import { ringWidget, wireRingWidget, createRingState } from "./handshakes.js";

export const createWidgetState = (widget) => {
  if (!widget) return null;
  return widget.kind === "coins" ? new Set() : createRingState();
};

export const renderWidget = (widget, state) =>
  widget.kind === "coins" ? coinTray(widget, state) : ringWidget(widget, state);

export const wireWidget = (root, widget, state, repaint) =>
  widget.kind === "coins"
    ? wireCoinTray(root, widget, state, repaint)
    : wireRingWidget(root, widget, state, repaint);
