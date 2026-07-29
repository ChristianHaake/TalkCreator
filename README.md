# TalkCreator

Planungswerkzeug fuer strukturierte Gespraeche — Interviews, Debatten, Podcasts oder Unterricht.

Live application: [https://talkcreator.haak3.de](https://talkcreator.haak3.de) (Rename ausstehend; Cloudflare-Projekt derzeit `interviewdesigner`)

## Purpose

TalkCreator ist eine React-basierte Webanwendung, mit der Schuelerinnen und Schueler sowie Lehrkraefte strukturierte Gespraeche vorbereiten koennen: Einstieg, Hauptteil und Schluss mit Zeitbudget, Checkliste und Quellen, am Ende ausgedruckt als Leitfaden.

Zielgruppen:

- Schuelerinnen und Schueler
- Lehrkraefte
- Medienschaffende

Einsatzszenarien:

- Interviews (Podcasts, Reportagen, Zeitzeugen, Expert:innen)
- Debatten und Diskussionen
- Unterrichtsgespraeche und forschendes Lernen
- Pitches und Projektpraesentationen

## Features

- Projekttitel, Zielgruppe und Zeitplanung direkt im Gesprächsplan bearbeiten
- Fragen nach Einleitung, Hauptteil und Schluss direkt im druckbaren Dokument strukturieren
- Fragen mit Notizen, Dauer und Backup-Markierung pflegen
- Vorbereitung per Checkliste planen
- Checkliste, Quellen und Referenzen im selben Dokument bearbeiten
- Lokale Autospeicherung im Browser
- JSON-Projektdateien importieren und exportieren
- Markdown exportieren
- Druck- und PDF-Ausgabe ueber die Browser-Druckfunktion

## Development

Requirements:

- Node.js `>=22.22.0`
- npm `>=10`

Setup:

```bash
npm install
npm run dev
```

Scripts:

- `npm run dev` - start development server
- `npm run build` - build for production
- `npm run typecheck` - run TypeScript type checking
- `npm run lint` - run oxlint
- `npm test` - run automated tests
- `npm run verify` - run typecheck, lint, tests, and production build

## haak3 Standard

Standard version: `1.0.0-draft`

This app follows the [haak3 Web App Standard](https://github.com/ChristianHaake/haak3-webapp-standard). See [docs/standard-conformance.md](docs/standard-conformance.md) for local conformance notes.

## License

GNU General Public License v3.0 only. See [LICENSE](LICENSE) for details.
