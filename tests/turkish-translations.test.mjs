import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { TURKISH_DATA_TRANSLATIONS } from "../src/turkish-data-translations.js";

const appData = JSON.parse(readFileSync(new URL("../public/data/app-data.json", import.meta.url), "utf8"));

test("every stored business translation has a Turkish equivalent", () => {
  const missing = Object.keys(appData.translations).filter(source => !TURKISH_DATA_TRANSLATIONS[source]);
  assert.deepEqual(missing, []);
});

test("application metadata exposes Turkish as a selectable language", () => {
  assert.deepEqual(
    appData.ui.languages.find(language => language.code === "tr"),
    { code: "tr", label: "Türkçe" },
  );
});
