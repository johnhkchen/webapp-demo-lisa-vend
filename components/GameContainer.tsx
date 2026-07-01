"use client";

/**
 * The single client island: it wires the `useGame` hook to the props-driven `Board`.
 *
 * `page.tsx` stays a server component and renders this; everything stateful lives behind this one
 * `"use client"` boundary. It holds no logic beyond handing the hook's composed view (settled board
 * + active piece overlaid) to `Board`, which paints it. Input and the gravity loop arrive in a
 * later ticket and will hang off the same hook.
 */

import Board from "@/components/Board";
import { useGame } from "@/components/useGame";

export default function GameContainer() {
  const { view } = useGame();
  return <Board board={view} />;
}
