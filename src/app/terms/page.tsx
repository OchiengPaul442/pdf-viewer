import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100 sm:px-10">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-300">
            PaperPilot
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Terms of Use
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-300">
            These terms describe how PaperPilot is intended to be used. They are
            written to be practical and product-ready for a browser-based PDF
            workflow.
          </p>
        </div>

        <section className="grid gap-4 md:grid-cols-2">
          {[
            {
              title: "Acceptable use",
              body: "Use the app for lawful document review, editing, signing, and export workflows. Do not upload content you are not authorized to handle.",
            },
            {
              title: "Your content",
              body: "You remain responsible for the files you upload, edit, and export. Review outputs before sharing or distributing them.",
            },
            {
              title: "Service changes",
              body: "We may change features or limit access to keep the product reliable and secure. We may also update these terms over time.",
            },
            {
              title: "No guarantees",
              body: "PaperPilot is provided as a workflow tool. You should verify final PDFs for accuracy, compliance, and legal suitability.",
            },
          ].map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20"
            >
              <h2 className="text-lg font-semibold text-white">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {item.body}
              </p>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-sky-400/20 bg-sky-400/10 p-5 text-sm leading-6 text-slate-200">
          PaperPilot is designed for editing convenience and collaboration. For
          regulated or high-stakes use cases, keep a separate review and
          approval process in place.
        </section>

        <footer className="flex flex-wrap gap-4 border-t border-white/10 pt-6 text-sm text-slate-400">
          <Link href="/" className="text-sky-300 hover:text-sky-200">
            Back to PaperPilot
          </Link>
          <span>Last updated: March 29, 2026</span>
        </footer>
      </div>
    </main>
  );
}
