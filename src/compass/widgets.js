// Hands-on props for the stops that are easier to think about by touching.

import { coinTray, wireCoinTray } from "./coins.js";
import { ringWidget, wireRingWidget, createRingState } from "./handshakes.js";
import { pancakeWidget, wirePancakeWidget, createPancakeState } from "./pancake.js";

const KINDS = {
  coins: {
    state: () => new Set(),
    render: coinTray,
    wire: wireCoinTray,
  },
  ring: {
    state: createRingState,
    render: ringWidget,
    wire: wireRingWidget,
  },
  pancake: {
    state: createPancakeState,
    render: pancakeWidget,
    wire: wirePancakeWidget,
  },
};

export const createWidgetState = (widget) => (widget ? KINDS[widget.kind].state() : null);

export const renderWidget = (widget, state, answered = false) =>
  KINDS[widget.kind].render(widget, state, answered);

export const wireWidget = (root, widget, state, repaint) =>
  KINDS[widget.kind].wire(root, widget, state, repaint);
