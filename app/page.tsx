import GameContainer from "@/components/GameContainer";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-8">
      <header className="text-center">
        <h1 className="text-5xl font-bold tracking-tight text-primary sm:text-6xl">
          ROWCLEAR
        </h1>
        <p className="mt-2 text-sm text-foreground/50">Auto-play demo — press any key to play</p>
      </header>
      <GameContainer attract />
      <p className="text-xs text-foreground/30 text-center max-w-md">
        RowClear is an independent, non-commercial project and is not affiliated with, licensed by, or endorsed by any commercial falling-block puzzle game or its rights holders.
      </p>
    </main>
  );
}
