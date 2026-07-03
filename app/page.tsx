import GameContainer from "@/components/GameContainer";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-8">
      <header className="text-center">
        <h1 className="text-5xl font-bold tracking-tight text-primary sm:text-6xl">
          TETRIS
        </h1>
        <p className="mt-2 text-sm text-foreground/50">Auto-play demo — press any key to play</p>
      </header>
      <GameContainer attract />
    </main>
  );
}
