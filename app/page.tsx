import Board from "@/components/Board";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-8">
      <header className="text-center">
        <h1 className="bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-violet-400 bg-clip-text text-5xl font-black tracking-tight text-transparent sm:text-6xl">
          TETRIS
        </h1>
        <p className="mt-2 text-sm text-white/50">Scaffold — placeholder board</p>
      </header>
      <Board />
    </main>
  );
}
