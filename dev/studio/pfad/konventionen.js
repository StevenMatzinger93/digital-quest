/* Lernpfad: Konventionen an EINER Stelle. Offene Fragen an Steven (docs/FRAGEN_STUDIO.md) werden hier beantwortet; die Änderung ist dann eine Zeile.
 * Wer eine Konvention ändert: tests/pfad.js laufen lassen (sie nennt jede Stelle, die davon abhängt). */
(function (root) {
  'use strict';
  var P = root.DQPfad = root.DQPfad || {};
  P.KONV = {
    /* Stellenwertigkeit der Eingänge im KV-Teil und in der m-Schreibweise: Die Buchstaben stehen vom NIEDERWERTIGSTEN zum höchstwertigen Bit. Belegt aus Stevens Lehrmittel:
     * d'cb'a' = 0100, also ist d das höchstwertige und a das niederwertigste Bit; Feldnummer = d·8 + c·4 + b·2 + a. Die Feldnummern in docs/aufgaben/kv_diagramm.json gelten für diese Reihenfolge.
     * Der Rechenkern zählt überall «Eingang 1 = Bit 0» (E1 = a); die Buchstaben benennen nur die Eingänge. */
    buchstaben: 'abcdef',
    /* NOR-Flipflop (B1, B2): Welcher Eingang SETZT (Q = 1)? 'e1' oder 'e2'. Der andere setzt zurück. Offen bis Steven antwortet (FRAGEN_STUDIO.md, Punkt 6). */
    norSetzen: 'e2'
    /* preClear-Regel im Rechenkern (Takt im selben Zeitpunkt wie das Wegfallen von preSet/preClear zählt nicht): E.RULES.preClearRennen in src/engine.js (FRAGEN_STUDIO.md, Punkt 7). */
  };
})(typeof window !== 'undefined' ? window : globalThis);
