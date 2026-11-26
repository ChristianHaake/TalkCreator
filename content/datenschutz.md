# Datenschutzhinweise

**Redaktioneller Entwurf zur Betreiberprüfung. Angaben zu Hosting und Aufbewahrung technischer Verbindungsdaten müssen vor der Freigabe bestätigt werden.**

Stand: 26. November 2026

Diese Software ist ein Open-Source-Projekt für den Einsatz im Bildungsbereich.

TalkCreator verarbeitet deine Projekteingaben lokal im Browser. Beim Abruf der Website werden technische Verbindungsdaten an den Hosting-Anbieter übertragen. Projekteinträge werden dabei nicht mitgesendet.

## Verantwortlicher

Christian Haake  
Alte Ziegelei 7  
26197 Großenkneten  
Deutschland

E-Mail: christianhaake@gmail.com

## 1. Lokale Speicherung

Alle Inhalte, die du in TalkCreator eingibst (Projekttitel, Fragen, Notizen, Checklisten, Quellen), verbleiben lokal auf deinem Gerät. Es gibt keine Datenbank für Nutzerinhalte, keine Benutzerkonten und keinen Upload deiner Inhalte an den Betreiber.

Die Speicherung erfolgt über folgende Browser-Technologien:

- **IndexedDB** (Eintrag `interview-creator-session`): dein aktuelles Projekt, damit es beim nächsten Besuch wieder verfügbar ist.
- **LocalStorage** (Eintrag `interview-creator-locale`): deine gewählte Sprache. Ältere Projektstände unter dem Eintrag `interview-creator-session` werden beim ersten Laden übernommen.
- **Service-Worker-Cache**: technische Dateien der App (HTML, CSS, JavaScript), damit die App auch offline funktioniert. Dieser Cache enthält keine von dir eingegebenen Inhalte.

## 2. Löschung deiner Daten

Du kannst deine Daten jederzeit selbst löschen:

- Über den Button **„Projekt zurücksetzen“** im Editor wird das aktuelle Projekt gelöscht und durch ein Beispielprojekt ersetzt.
- Wenn du in deinem Browser die Websitedaten dieser Seite löschst (Cookies/Websitedaten bzw. „Browserdaten löschen“), werden alle lokal gespeicherten Daten von TalkCreator restlos entfernt.

## 3. Cookies und Analyse

Die Anwendung selbst setzt keine Cookies und bindet keine Web-Analyse-Tools ein. Ob der Hosting-Anbieter im Einzelfall technische Cookies oder Sicherheitsmechanismen einsetzt, muss der Betreiber anhand der aktiven Cloudflare-Konfiguration prüfen.

## 4. Projektdateien (Speichern / Laden / Export)

Beim Speichern oder Exportieren erzeugt die App eine Datei (JSON oder Markdown) direkt in deinem Browser und bietet sie als Download an. Beim Laden wird die Datei ausschließlich lokal in deinem Browser gelesen. In beiden Fällen findet keine Übertragung an einen Server statt.

## 5. Webhosting

Die Website wird über Cloudflare Workers mit statischen Dateien ausgeliefert. Für die Auslieferung und technische Sicherheit verarbeitet Cloudflare Verbindungsdaten wie die IP-Adresse und den Zeitpunkt des Abrufs. Welche Protokolle aktiv sind, wer darauf zugreifen kann und wie lange die Daten aufbewahrt werden, muss der Betreiber vor Freigabe dieses Textes prüfen. Weitere Informationen: [Datenschutzhinweise von Cloudflare](https://www.cloudflare.com/privacypolicy/).

## 6. Externe Unterstützungsseite

Die Unterstützungsseite enthält einen Link zu Buy Me a Coffee. Beim bloßen Anzeigen der Seite sendet TalkCreator keine Projektdaten an diesen Anbieter. Erst wenn du den externen Link öffnest, stellt dein Browser eine Verbindung zu Buy Me a Coffee her; dort gelten dessen [Datenschutzhinweise](https://buymeacoffee.com/privacy-policy).

## 7. Deine Rechte

Der Betreiber speichert keine von dir eingegebenen Projektinhalte auf einem eigenen Server. Technische Verbindungsdaten beim Hosting sind davon zu unterscheiden. Fragen zu Verarbeitung und Betroffenenrechten kannst du an die oben genannte Kontaktadresse richten.
