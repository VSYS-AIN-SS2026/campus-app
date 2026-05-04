import Link from 'next/link'

export default function HomePage() {
	return (
		<main className="app-shell">
			<section className="hero">
				<span className="eyebrow">Campus App · VSYS26T4-36</span>
				<h1>Hauptseite für die HTWG-Simulation</h1>
				<p>
					Diese Startseite bildet den Einstieg für den Flow
					 <strong>Hauptseite &gt; Profil &gt; Studiengangauswahl</strong>.
				</p>
				<div className="actions">
					<Link className="button" href="/profile">
						Zum Profil
					</Link>
					<Link className="button button-secondary" href="/study_programs/choose_program">
						Direkt zur Studiengangauswahl
					</Link>
				</div>
			</section>

			<section className="card-grid">
				<article className="panel">
					<h2>Was bereits steht</h2>
					<p>
						Die App ist aktuell ein schlanker Next.js-Prototyp mit Supabase-Anbindung und einer
						 ersten fachlichen Strecke für Studiengänge.
					</p>
				</article>

				<article className="panel">
					<h2>Wofür diese Story da ist</h2>
					<p>
						Die Auswahl eines Studiengangs wird sichtbar simuliert, damit spätere Profile,
						 SPOs und modulbezogene Daten auf einer konkreten Nutzerentscheidung aufbauen
						 können.
					</p>
				</article>
			</section>
		</main>
	)
}
