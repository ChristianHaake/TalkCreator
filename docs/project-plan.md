# TalkCreator Development Plan

Status: `2026-07-29`  
Basis: manuelle Funktionsprüfung, Quellcodeanalyse und `npm run verify`

## Produktziel

TalkCreator unterstützt Lernende, Lehrkräfte und Medienschaffende dabei,
strukturierte Gespräche für Interviews, Debatten, Podcasts und Unterricht zu
planen. Der Kernworkflow bleibt local-first, ohne Login und ohne Übertragung der
Projektinhalte an ein Anwendungs-Backend.

## Validierter Ausgangsstand

Bereits funktionsfähig:

- Gesprächsplan mit Einleitung, Hauptteil und Schluss
- Projekttitel, Zielgruppe, Zeitplanung, Fragen, Notizen und Backup-Markierung
- Checkliste, Quellen und lokalisierte Vorschläge
- Sortierung per Drag-and-drop sowie Pfeilsteuerung innerhalb einer Phase
- lokale Autospeicherung und Wiederherstellung
- JSON-Import und -Export
- Markdown-Export und Browser-Druck
- Vorlagen für Podcast, Interview, Debatte und Unterrichtsgespräch
- Benutzeroberfläche in DE, EN, FR, ES und NL
- responsive Nutzung ab 320 px
- lokalisierte Hilfe- und Über-Seiten sowie deutsche Rechtstexte

Bestätigte Kernprobleme aus der Funktionsprüfung:

1. Importierte Checklisten und Quellen können doppelte IDs enthalten.
2. Ein gültiger Import ersetzt bestehende Arbeit ohne Bestätigung.
3. Die Hilfe beschreibt teilweise eine nicht mehr vorhandene Oberfläche.

## Prioritäten

| Priorität | Bedeutung | Release-Regel |
| --- | --- | --- |
| P0 | Datenverlust, Datenintegrität oder blockierter Kernworkflow | Muss vor dem nächsten Release abgeschlossen sein |
| P1 | Zuverlässigkeit, korrekte Ausgabe, Dokumentation und Release-Evidenz | Muss vor einer stabilen Release-Freigabe abgeschlossen sein |
| P2 | Produktverbesserung mit hohem Nutzwert | Nach Abschluss von P0 und P1 |
| P3 | Optionale Erweiterung oder Optimierung | Nur nach Produktentscheidung |

## Meilenstein 1: Datenintegrität und sicherer Import

**Umsetzungsstatus:** abgeschlossen und am `2026-07-29` automatisiert sowie im
Browser verifiziert.

### US-01: Bestehende Arbeit vor Import schützen

**Priorität:** P0

Als Nutzerin oder Nutzer möchte ich vor dem Ersetzen meines aktuellen Projekts
gewarnt werden, damit unexportierte Arbeit nicht versehentlich verloren geht.

Akzeptanzkriterien:

- [x] Jede gültige Projektdatei ersetzt den aktuellen Projektzustand erst nach
      einer Bestätigung.
- [x] Der Dialog erklärt ausdrücklich, dass unexportierte Änderungen verloren
      gehen.
- [x] „Abbrechen“ erhält Titel, Metadaten, Phasen, Checkliste, Quellen und
      Autosave-Zustand unverändert.
- [x] „Importieren“ übernimmt erst nach der Bestätigung das vollständig
      validierte Projekt.
- [x] Ungültige, zu große oder nicht unterstützte Dateien öffnen keinen
      Überschreibdialog und verändern das aktuelle Projekt nicht.
- [x] Importfehler erscheinen als lokalisierte Meldung in der Oberfläche statt
      ausschließlich als blockierender Browser-Alert.
- [x] Dieselbe Datei kann nach Abbruch, Fehler oder erfolgreichem Import erneut
      ausgewählt werden.
- [x] Der Dialog ist per Tastatur bedienbar, schließt mit `Escape` und stellt
      den Fokus auf „Laden“ wieder her.
- [x] Tests decken Bestätigen, Abbrechen, ungültige Daten und den Erhalt des
      aktuellen Projekts ab.

### US-02: IDs aller importierten Sammlungen normalisieren

**Priorität:** P0

Als Nutzerin oder Nutzer möchte ich auch ältere oder fehlerhaft erzeugte
Projektdateien sicher öffnen, damit Einträge nicht gekoppelt, dupliziert oder
unbeabsichtigt gelöscht werden.

Akzeptanzkriterien:

- [x] Fragen besitzen über alle drei Phasen eindeutige IDs; Checklistenpunkte
      innerhalb der Checkliste und Quellen innerhalb der Quellenliste besitzen
      jeweils nichtleere, eindeutige IDs.
- [x] Die erste gültige ID bleibt erhalten; spätere Kollisionen erhalten
      deterministisch erzeugte Ersatz-IDs.
- [x] Eine Datei mit doppelten Checklisten- oder Quellen-IDs erzeugt keine
      React-Key-Warnung.
- [x] Bearbeiten oder Löschen eines Eintrags verändert ausschließlich den
      ausgewählten Eintrag.
- [x] Export und erneuter Import erhalten die normalisierten IDs.
- [x] Regressionstests decken leere IDs, Kollisionen innerhalb einer Sammlung
      und Kollisionen zwischen Phasen ab.

### US-03: Schema-v1 strikt und abwärtskompatibel validieren

**Priorität:** P0

Als Nutzerin oder Nutzer möchte ich eine verständliche Fehlermeldung für
inkompatible Projektdateien erhalten, damit kein teilweise interpretiertes
Projekt meinen aktuellen Stand ersetzt.

Akzeptanzkriterien:

- [x] Aktuelle Dateien akzeptieren ausschließlich die unterstützte numerische
      `schemaVersion`.
- [x] Zeichenketten, `0`, Bruchzahlen, negative oder zukünftige Versionen werden
      abgelehnt.
- [x] Schema-v1 verlangt `schemaVersion`, `id`, `title`, `partner`, `phases` mit
      den Arrays `intro`, `main` und `outro`, `checklist` sowie `sources`.
- [x] `id`, `title` und `partner` sind Zeichenketten; `id` ist nicht leer und
      `title` sowie `partner` überschreiten jeweils 5000 Zeichen nicht.
- [x] Eine Frage verlangt die Zeichenketten `id`, `text` und `notes`;
      `estimated_minutes` ist eine ganze Zahl von 1 bis 480 und `is_backup` ein
      Boolean, sofern die optionalen Felder vorhanden sind.
- [x] Ein Checklistenpunkt verlangt die Zeichenketten `id` und `text` sowie den
      Boolean `checked`.
- [x] Eine Quelle verlangt die Zeichenketten `id`, `title` und `url`.
- [x] Falsche Feldtypen, zu lange Texte oder überschrittene Sammlungsgrenzen
      lehnen die gesamte Schema-v1-Datei ab; Einträge werden nicht still
      verworfen oder gekürzt.
- [x] `target_minutes`, `created_at`, `updated_at` und
      `total_estimated_time` dürfen fehlen; sie werden validiert oder aus dem
      Projektzustand neu abgeleitet.
- [x] Falls vorhanden, ist `target_minutes` eine ganze Zahl von 1 bis 480,
      `created_at` und `updated_at` sind gültige ISO-8601-Zeitstempel und
      `total_estimated_time` ist eine nichtnegative ganze Zahl, die beim Import
      aus den Fragen neu berechnet wird.
- [x] Unbekannte Felder in einer Schema-v1-Datei werden ignoriert und verändern
      den kanonischen Projektzustand nicht.
- [x] Unterstützte Legacy-Dateien ohne `schemaVersion` werden weiterhin über
      die dokumentierten Legacy-Felder migriert.
- [x] Jeder Fehler erhält eine lokalisierte, handlungsorientierte Meldung.
- [x] Fehlgeschlagene Validierung verändert weder Arbeitsspeicher noch
      IndexedDB-Projekt.

## Meilenstein 2: Verlässliche Speicherung und Ausgabe

### US-04: Autosave-Zustand sichtbar und belastbar machen

**Priorität:** P1

Als Nutzerin oder Nutzer möchte ich erkennen, ob meine Änderungen gespeichert
sind, damit ich die Seite nicht mit einem falschen Sicherheitsgefühl verlasse.

Akzeptanzkriterien:

- [ ] Die Oberfläche unterscheidet „Ungespeicherte Änderungen“, „Speichert“,
      „Gespeichert“ und „Speichern fehlgeschlagen“.
- [ ] „Gespeichert“ erscheint erst nach erfolgreich abgeschlossener
      IndexedDB-Schreiboperation.
- [ ] Fehler werden sichtbar und über eine Live-Region angekündigt.
- [ ] Nach einem Fehler kann die Speicherung erneut ausgelöst werden.
- [ ] Ausstehende ältere Schreibvorgänge können weder einen neueren Stand noch
      einen bestätigten Reset überschreiben.
- [ ] Ein beschädigter lokaler Speicherstand wird nicht still durch ein
      Beispielprojekt überschrieben; die Oberfläche bietet einen erklärten
      Reset und, soweit lesbar, einen Download zur manuellen Wiederherstellung.
- [ ] Reload, `pagehide`, schneller Reload innerhalb der Debounce-Zeit und Reset
      sind automatisiert getestet.

### US-05: Markdown-Export inhaltstreu erzeugen

**Priorität:** P1

Als Nutzerin oder Nutzer möchte ich einen vollständigen Markdown-Leitfaden
exportieren, damit Status und Struktur meines Gesprächsplans erhalten bleiben.

Akzeptanzkriterien:

- [ ] Erledigte Checklistenpunkte werden als `- [x]`, offene als `- [ ]`
      exportiert.
- [ ] Titel, Fragen, Notizen und Quellennamen mit Markdown-Sonderzeichen
      beschädigen die Dokumentstruktur nicht.
- [ ] Mehrzeilige Notizen bleiben als zusammengehöriger Block erhalten.
- [ ] Backup-Markierung, Dauer, Quellen und leere optionale Felder werden
      konsistent ausgegeben.
- [ ] Der Export ist für alle fünf Oberflächensprachen getestet.
- [ ] Eine exportierte Datei lässt sich in einem GFM-kompatiblen Viewer ohne
      Strukturverlust darstellen.

### US-06: Export- und Druckartefakte als Release-Gate prüfen

**Priorität:** P1

Als Nutzerin oder Nutzer möchte ich verlässliche Projektdateien und einen
lesbaren Ausdruck erhalten, damit der Plan außerhalb der App nutzbar bleibt.

Akzeptanzkriterien:

- [ ] Der JSON-Download enthält Schema-Version, eindeutige IDs, aktuellen
      Zeitstempel und korrekt berechnete Gesamtdauer.
- [ ] Eine exportierte JSON-Datei kann ohne Feldverlust wieder importiert
      werden.
- [ ] Der Dateiname verwendet einen Unicode-fähigen Slug: „Überblick 2026“ wird
      zu `überblick_2026.json`, „学校“ zu `学校.json` und ein leerer Titel zu
      `talkcreator.json`.
- [ ] Vor dem Drucken wird ein offener Inline-Editor geschlossen.
- [ ] Bedienelemente erscheinen nicht im Ausdruck.
- [ ] Lange Fragen, Notizen, Checklisten und Quellen werden auf A4 nicht
      abgeschnitten oder unlesbar getrennt.
- [ ] Leeres Projekt und maximal befüllte Beispieldaten besitzen geprüfte
      Druckzustände.
- [ ] Download und Druckaufruf sind durch Browser-E2E abgedeckt; die erzeugte
      PDF-Ausgabe wird zusätzlich manuell geprüft.

### US-07: Externe Quellen-URLs begrenzen

**Priorität:** P1

Als Nutzerin oder Nutzer möchte ich nur sichere, erwartbare Quellenlinks öffnen,
damit importierte Projekte keine unerwünschten URL-Schemata anbieten.

Akzeptanzkriterien:

- [ ] Anklickbar und im Markdown verlinkt sind ausschließlich URLs mit dem
      Schema `https:`.
- [ ] `javascript:`, `data:`, `file:`, relative und unbekannte Schemata werden
      nicht als Link gerendert.
- [ ] Groß-/Kleinschreibung und führende Leerzeichen umgehen die Prüfung nicht.
- [ ] Nicht erlaubte URLs bleiben als Text sichtbar und bearbeitbar.
- [ ] Tests decken erlaubte und abgelehnte Varianten ab.

### US-08: Einzellöschungen rückgängig machen

**Priorität:** P1

Als Nutzerin oder Nutzer möchte ich versehentlich gelöschte Fragen,
Checklistenpunkte und Quellen wiederherstellen, damit kleine Fehlbedienungen
nicht unmittelbar dauerhaft gespeichert werden.

Akzeptanzkriterien:

- [ ] Nach dem Löschen erscheint eine klar benannte
      „Rückgängig“-Möglichkeit.
- [ ] Rückgängig stellt Inhalt, ID, Position, Status und Metadaten exakt wieder
      her.
- [ ] Die Rückgängig-Möglichkeit ist per Tastatur erreichbar und wird über eine
      Live-Region angekündigt.
- [ ] Die Aktion bleibt zehn Sekunden sichtbar; danach bleibt die Löschung
      gespeichert und die Aktion ist nicht mehr verfügbar.
- [ ] Projektzustand und ausstehende Rückgängig-Datensätze werden lokal so
      gespeichert, dass ein Reload oder erneutes Öffnen innerhalb der zehn
      Sekunden jede Löschung weiterhin einzeln rückgängig machen kann.
- [ ] Nach Ablauf werden die lokalen Rückgängig-Datensätze entfernt und nie in
      Projektdateien exportiert.
- [ ] Mehrere schnelle Löschungen führen nicht zu gekoppelten oder vertauschten
      Einträgen.
- [ ] Die bestehenden Dialoge für Reset und Vorlagenwechsel sowie der in US-01
      eingeführte Importdialog werden durch die Einzellöschungslogik nicht
      verändert.
- [ ] Tests decken Löschen, Rückgängig, Ablauf des Rückgängig-Zeitraums und
      Autosave ab.

## Meilenstein 3: Dokumentation und Release-Evidenz

### US-09: Hilfe an den aktuellen Ein-Dokument-Workflow anpassen

**Priorität:** P1

Als neue Nutzerin oder neuer Nutzer möchte ich eine Hilfe sehen, die der
aktuellen Oberfläche entspricht, damit ich den Kernworkflow ohne Fehlversuche
verstehe.

Akzeptanzkriterien:

- [ ] Die Hilfe beschreibt direktes Bearbeiten im Dokument statt einer
      getrennten Editor-/Vorschauansicht.
- [ ] Es wird kein mobiler Editor-/Vorschau-Umschalter erwähnt.
- [ ] Reset wird korrekt als Laden des ausgefüllten Podcast-Beispiels
      beschrieben.
- [ ] Import, Export, Autosave, Vorlagen, Sortierung und Druck verwenden die
      tatsächlich sichtbaren Bezeichnungen.
- [ ] DE, EN, FR, ES und NL enthalten dieselbe fachliche Aussage.
- [ ] Direkte Navigation zu `/hilfe` funktioniert in jeder Sprache.
- [ ] Die Hilfetexte werden gegen die sichtbare Oberfläche manuell geprüft.

### US-10: Browser-E2E und Release-Checkliste vervollständigen

**Priorität:** P1

Als für Wartung und Freigabe verantwortliche Person möchte ich die kritischen
Nutzerstrecken reproduzierbar prüfen, damit ein grüner Build nicht mit einer
funktionsfähigen Release-Version verwechselt wird.

Akzeptanzkriterien:

- [ ] Browser-E2E deckt Autosave/Reload, Import-Abbruch, bestätigten Import,
      ungültigen Import, Reset, Vorlagen, Sortierung, Download, Druckaufruf und
      Inhaltsrouten ab.
- [ ] Dialogtests prüfen Fokusfalle, `Escape`, Hintergrund-Inertheit und
      Fokuswiederherstellung.
- [ ] Responsive Tests prüfen mindestens 320, 390, 600, 601, 768, 900, 901 und
      1280 px ohne horizontalen Seiten-Overflow.
- [ ] Kritische Flows laufen in Chromium und WebKit.
- [ ] `npm run verify` bleibt grün; der dokumentierte Release-Gate ergänzt die
      Browser-E2E-Prüfung.
- [ ] PWA-Installation, Offlinebetrieb, 200-%-Zoom, Screenreader und
      Zielgeräteprüfung bleiben als explizite manuelle Checks dokumentiert.
- [ ] Ein Produktions-Preview bestätigt Root- und Inhaltsrouten, Offline-Start,
      Offline-Bearbeitung und Service-Worker-Update ohne Projektverlust.
- [ ] Ein Netzwerk-Trace bestätigt, dass Projektinhalte nicht an ein
      Anwendungs-Backend übertragen werden.
- [ ] `docs/review-checklist.md` enthält Datum, Ergebnis und verbleibende
      Ausnahmen der aktuellen Prüfung.

## Meilenstein 4: Produktweiterentwicklung

Dieser Meilenstein beginnt erst, wenn keine offenen P0- oder P1-Punkte mehr
bestehen.

### US-11: Zeitbudget verständlich darstellen

**Priorität:** P2

Als Gesprächsleitung möchte ich sofort sehen, ob mein Plan zur Zielzeit passt,
damit ich Fragen vor dem Gespräch sinnvoll kürzen oder ergänzen kann.

Akzeptanzkriterien:

- [ ] Gesamtzeit, Zielzeit, verbleibende Zeit und Überschreitung werden
      numerisch angezeigt.
- [ ] Der Zustand ist nicht ausschließlich über Farbe erkennbar.
- [ ] Änderungen an Dauer oder Reihenfolge aktualisieren die Anzeige sofort.
- [ ] Ohne Zielzeit bleibt die bestehende Gesamtdauer verständlich.
- [ ] Ausgabe und Druck zeigen eine kompakte, eindeutige Zeitinformation.

### US-12: Mehrere lokale Projekte verwalten

**Priorität:** P2

Als Lehrkraft oder Vielnutzer möchte ich mehrere Gesprächspläne lokal verwalten,
damit ich nicht für jeden Wechsel Dateien importieren und exportieren muss.

Akzeptanzkriterien:

- [ ] Die Projektübersicht zeigt Titel, Typ und letzte Änderung.
- [ ] Projekte können erstellt, geöffnet, dupliziert, exportiert und nach
      Bestätigung gelöscht werden.
- [ ] Das zuletzt geöffnete Projekt wird eindeutig markiert.
- [ ] Bestehende Einzelprojekt-Daten werden ohne Verlust migriert.
- [ ] Speichergrenzen und Wiederherstellungsweg sind dokumentiert.
- [ ] Alle Daten bleiben standardmäßig lokal im Browser.

### US-13: Gespräch im Durchführungsmodus begleiten

**Priorität:** P2

Als Gesprächsleitung möchte ich den vorbereiteten Plan in einem reduzierten
Durchführungsmodus nutzen, damit ich während des Gesprächs Fokus und Zeit im
Blick behalte.

Akzeptanzkriterien:

- [ ] Der Modus zeigt aktuelle Frage, Notizen, Abschnitt und geplante Dauer.
- [ ] Vorherige und nächste Frage sind per Tastatur und Touch erreichbar.
- [ ] Backup-Fragen können ein- und ausgeblendet werden.
- [ ] Ein Timer funktioniert ohne Netzwerkverbindung und kann gestartet,
      pausiert und zurückgesetzt werden.
- [ ] Der Modus verändert den Plan nicht unbeabsichtigt.
- [ ] Beenden stellt den vorherigen Editorzustand und Fokus nachvollziehbar
      wieder her.

## Abhängigkeiten und Reihenfolge

1. Das Browser-Testgerüst aus US-10 zuerst aufsetzen; die vollständige Story
   schließt erst nach US-01 bis US-09.
2. US-02 und US-03 vor US-01 abschließen, damit nur kanonisch validierte Daten in
   den Bestätigungsdialog gelangen.
3. US-04 vor Einführung einer Mehrprojektverwaltung stabilisieren.
4. US-05 bis US-10 vor einer stabilen Release-Freigabe abschließen.
5. US-11 bis US-13 erst nach geschlossenem P0/P1-Backlog beginnen.

## Nicht Teil dieses Plans

- Benutzerkonten, Backend oder Cloud-Synchronisierung
- kollaboratives Echtzeit-Editing
- automatische KI-Erzeugung von Gesprächsinhalten
- ungeprüfte Übersetzungen von Datenschutz und Impressum
- Repository-, DNS- oder Cloudflare-Projektumbenennung
- eigener PDF-Renderer, solange die Browser-Druckausgabe die Kriterien erfüllt

## Definition of Done

Eine User Story ist abgeschlossen, wenn:

- alle Akzeptanzkriterien erfüllt und nachvollziehbar geprüft sind;
- neue oder geänderte Logik automatisierte Regressionstests besitzt;
- Tastatur-, Responsive- und Fehlerszenarien berücksichtigt sind;
- sichtbare Texte in allen betroffenen Sprachen aktualisiert wurden;
- README, Architektur, Hilfe und Review-Checkliste nicht widersprechen;
- `npm run verify` erfolgreich ist;
- Browser-E2E und erforderliche manuelle Checks dokumentiert bestanden sind;
- bewusste Abweichungen vom haak3 Web App Standard dokumentiert sind.

## Release-Gate

Eine stabile Freigabe ist möglich, wenn:

- keine offenen P0- oder P1-Stories bestehen;
- `npm run verify` erfolgreich ist;
- die gemeinsame Review-Checkliste mit aktuellem Datum und nachvollziehbarer
  Evidenz abgeschlossen ist;
- Import-, Autosave-, Export-, Reset- und Recovery-Flows grün sind;
- Chromium- und WebKit-E2E grün sind;
- Druck/PDF, PWA/Offline, 200-%-Zoom, Screenreader und Zielgeräte manuell
  geprüft wurden;
- Rechtstexte und verbleibende Standard-Ausnahmen durch den Betreiber geprüft
  und dokumentiert sind.
