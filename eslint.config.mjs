import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Bestand (Stand 30.10.2026): Diese Dateien verstoßen gegen die React-Compiler-
// Regeln, die eslint-config-next 16 neu als Fehler führt. Fast alle sind Spiel-
// Komponenten, deren Umbau das Spielverhalten ändert; sie werden im Neubau
// ohnehin ersetzt. Damit die CI ab sofort blockieren kann, gelten die vier
// Regeln NUR in diesen Dateien als Warnung. Jede neue oder nicht gelistete
// Datei bekommt sie weiter als Fehler.
//
// Die Liste wird nur kürzer: Wer eine dieser Dateien sauber macht, streicht sie.
// Neue Einträge sind kein Ausweg, sondern ein Befund für den Review.
const BESTAND_REACT_COMPILER = [
  "src/app/(dashboard)/classes/page.tsx",
  "src/app/(dashboard)/spiele/page.tsx",
  "src/components/game/BossFight.tsx",
  "src/components/game/GameEngine.tsx",
  "src/components/game/Hangman.tsx",
  "src/components/game/MemoryMatch.tsx",
  "src/components/game/QuizTower.tsx",
  "src/components/game/Reihenfolge.tsx",
  "src/components/game/SortierKarussell.tsx",
  "src/components/game/SpaceInvaders.tsx",
  "src/components/game/StudyBird.tsx",
  "src/components/modules/FlowLehrkraftCheckPanel.tsx",
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: BESTAND_REACT_COMPILER,
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
