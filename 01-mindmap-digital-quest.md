# Auftrag 01: Mindmap Digital Quest

**Werkzeug:** Claude Code, gestartet im Ordner des Digital-Quest-Repos
**Ergebnis:** interaktive HTML-Mindmap plus Mermaid-Version als .md

## Deine Aufgabe
- [ ] Terminal im Digital-Quest-Ordner öffnen, `claude` starten
- [ ] Prompt unten einfügen
- [ ] Zwischenstand prüfen: Stimmen die Äste? Fehlt etwas aus deiner Sicht (z. B. Rollen, Messinstrumente)?
- [ ] Ergebnis im Browser öffnen, Korrekturen als Folgeprompt geben
- [ ] Wenn zufrieden: Datei ins Repo committen oder als Anhang für die Hauptseite ablegen

## Claudes Aufgabe
- Code durchgehen und die tatsächliche Struktur auslesen (keine Annahmen, Unklares als "unklar" markieren)
- Mindmap als eigenständige HTML-Datei bauen (aufklappbare Äste, Farben pro Hauptast)
- Dieselbe Struktur als Mermaid-Mindmap in einer .md-Datei liefern
- Nur nachfragen, wenn der Code etwas nicht eindeutig zeigt

## Prompt
```
Analysiere den Code dieses Projekts und erstelle eine übersichtliche Mindmap, die zeigt, wie die ganze Seite aufgebaut ist. Lies die Struktur aus dem Code aus und triff keine Annahmen. Markiere Unklares als "unklar".

Mitte: "Digital Quest"
- Ast E-Learning-Inhalte: alle Lerneinheiten, im Detail die einzelnen Messinstrumente und was jeweils abgedeckt ist
- Ast Administration: Leitstand, Klassenlehrer bzw. Klassensprecher, Kunden, Rollen und Rechte
- Ast Studenten/Lernende: Zugang, Ablauf, Fortschritt
- Ast Technik: Netzwerk- und Systemaufbau (Frontend, Hosting über Cloudflare, Datenspeicherung, wie die Teile zusammenhängen)

Ausgabe: eine einzelne, eigenständige HTML-Datei mit interaktiver Mindmap (aufklappbare Äste, klare Farben pro Hauptast, keine externen Abhängigkeiten ausser cdnjs) und dieselbe Struktur als Mermaid-Mindmap in einer .md-Datei.
```

## Fertig, wenn
Alle vier Äste mit realen Inhalten aus dem Code gefüllt sind und du die Struktur wiedererkennst.
