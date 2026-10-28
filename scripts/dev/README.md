# Lokaler Storyblok-Mock

`storyblok_mock.py` spielt das konvertierte Migrationspaket (`storyblok-paket/`) als
Storyblok-CDN-API aus — zum Entwickeln und Testen ohne Netz und ohne Token.

```bash
python3 scripts/dev/storyblok_mock.py /pfad/zu/storyblok-paket     # http://127.0.0.1:8787/v2/cdn
```

`.env.local`:

```
VITE_CONTENT_SOURCE=storyblok
VITE_STORYBLOK_TOKEN=mock
VITE_STORYBLOK_API_BASE=http://127.0.0.1:8787/v2/cdn
```

Bild-URLs zeigen im Paket noch auf den alten Storage; im echten Space liegen die
Storyblok-Asset-URLs.
