import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <h1 className="text-5xl font-bold mb-4">
          ToyHunter AI
        </h1>

        <p className="text-xl text-slate-300 mb-10">
          ToyHunter AI zoekt automatisch naar verborgen parels op
          verkoopplatformen, analyseert foto's en helpt verzamelaars
          en handelaren betere koop- en verkoopbeslissingen te nemen.
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          <Link href="/hunt" className="bg-slate-800 p-6 rounded-2xl hover:bg-slate-700 transition">
            <h2 className="text-2xl font-bold mb-2">
              🔎 Hunt Deals
            </h2>
            <p>
              Laat ToyHunter AI automatisch zoeken naar verborgen parels.
            </p>
          </Link>

          <Link href="/analyse" className="bg-slate-800 p-6 rounded-2xl hover:bg-slate-700 transition">
            <h2 className="text-2xl font-bold mb-2">
              📸 Analyse Item
            </h2>
            <p>
              Upload een foto en ontvang direct BUY / MAYBE / NO advies.
            </p>
          </Link>

          <Link href="/sell" className="bg-slate-800 p-6 rounded-2xl hover:bg-slate-700 transition">
            <h2 className="text-2xl font-bold mb-2">
              📝 Sell Assistant
            </h2>
            <p>
              Genereer titels, beschrijvingen en prijsadvies.
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}