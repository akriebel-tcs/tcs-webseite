-- Modellliste (Presets) des CMS-Light-Übersetzungswerkzeugs abstimmen.
-- Idempotent: alte Lovable-Presets entfernen, abgestimmte neu setzen.

DELETE FROM public.cms_translation_provider_rates
 WHERE provider = 'lovable_ai';

-- Nicht abgestimmter Eigenschlüssel-Eintrag (Gemini 2.5) aus der Auswahl nehmen.
UPDATE public.cms_translation_provider_rates
   SET is_enabled = false,
       basis_note = 'Nicht abgestimmt — Eintrag ist ausgeblendet. Übersetzungen laufen über das Lovable-Gateway.',
       cost_per_1k_source_chars = 0,
       updated_at = now()
 WHERE provider = 'google_gemini'
   AND model = 'gemini-2.5-flash';

INSERT INTO public.cms_translation_provider_rates
  (provider, model, label, currency, cost_per_1k_source_chars, is_default, is_enabled, requires_secret, basis_note)
VALUES
  ('lovable_ai', 'google/gemini-3.6-flash',
   'Lovable AI · Gemini 3.6 Flash (empfohlen für große Läufe)', 'EUR', 0, true, true, NULL,
   'Schätzung nicht verfügbar: Die Abrechnung läuft über Lovable-AI-Credits nach Ein-/Ausgabe-Token, nicht pro Zeichen.'),
  ('lovable_ai', 'openai/gpt-6-astra',
   'Lovable AI · GPT-6 Astra (Qualitätsmodus für schwierige Fachtexte)', 'EUR', 0, false, true, NULL,
   'Schätzung nicht verfügbar: Die Abrechnung läuft über Lovable-AI-Credits nach Ein-/Ausgabe-Token, nicht pro Zeichen. Deutlich teurer als Gemini Flash.'),
  ('lovable_ai', 'google/gemini-3.7-flash',
   'Lovable AI · Gemini 3.7 Flash', 'EUR', 0, false, true, NULL,
   'Schätzung nicht verfügbar: Abrechnung über Lovable-AI-Credits nach Token.'),
  ('lovable_ai', 'google/gemini-3.1-flash-lite',
   'Lovable AI · Gemini 3.1 Flash Lite (günstigste Variante)', 'EUR', 0, false, true, NULL,
   'Schätzung nicht verfügbar: Abrechnung über Lovable-AI-Credits nach Token.'),
  ('lovable_ai', 'google/gemini-3.1-pro-preview',
   'Lovable AI · Gemini 3.1 Pro (Vorschau)', 'EUR', 0, false, true, NULL,
   'Schätzung nicht verfügbar: Abrechnung über Lovable-AI-Credits nach Token. Vorschaumodell.');