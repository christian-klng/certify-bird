# Certify Bird

Zertifikate für kleine Bildungsanbieter: Vorlagen gestalten, Teilnahmezertifikate
ausstellen und verwalten, und jedes Zertifikat als öffentliche Seite und Open Badge
bereitstellen. Open Source und selbst hostbar.

> **Stand:** Grundgerüst. Es gibt bisher die Mandantenverwaltung per Hostname und
> die beiden Betriebsmodi, aber noch keine Vorlagen, Zertifikate oder Anmeldung.

## Betriebsmodi

Der Modus wird mit `APP_MODE` gewählt.

| | `single` | `saas` |
|---|---|---|
| Gedacht für | Selbsthoster mit einer Domain | Betrieb für viele Bildungsanbieter |
| Mandanten | genau einer | beliebig viele |
| Adresse | die Domain der Instanz | `<kürzel>.<APP_DOMAIN>` oder eigene Subdomain per CNAME |

Im SaaS-Modus wird der Mandant über den Hostnamen der Anfrage bestimmt. Ein
Mandant mit geprüfter eigener Subdomain tritt nur unter dieser auf; seine
`<kürzel>.<APP_DOMAIN>`-Adresse leitet dorthin um. Kürzel werden nie neu
vergeben, auch nicht nach Umbenennung oder Löschung, weil ausgestellte
Zertifikate dauerhaft auf ihre Adresse verweisen.

## Lokale Entwicklung

Voraussetzungen: Node.js 24, pnpm, Docker.

```bash
cp .env.example .env
docker compose -f docker-compose.dev.yml up -d   # PostgreSQL
pnpm install
pnpm db:deploy                                   # Migrationen einspielen
pnpm db:seed                                     # Demo-Anbieter anlegen
pnpm dev
```

Danach läuft die App unter <http://localhost:3000>.

Für den SaaS-Modus `APP_MODE=saas` in `.env` setzen. Die Plattform ist dann unter
<http://localhost:3000> erreichbar, der Demo-Anbieter unter
<http://demo-akademie.localhost:3000>.

| Befehl | Zweck |
|---|---|
| `pnpm test` | Tests |
| `pnpm typecheck` | Typprüfung |
| `pnpm lint` | Linter |
| `pnpm db:migrate` | Neue Migration aus dem geänderten Schema erzeugen |

## Selbst hosten

```bash
POSTGRES_PASSWORD=<sicheres-passwort> ORG_NAME="Meine Akademie" docker compose up -d --build
```

Das startet PostgreSQL, spielt die Migrationen ein, legt den Bildungsanbieter an
und startet die App auf Port 3000. Davor gehört ein Reverse Proxy mit TLS, zum
Beispiel der von Coolify. Unter `/api/health` meldet die App, ob sie und die
Datenbank erreichbar sind.

| Variable | Bedeutung |
|---|---|
| `APP_MODE` | `single` (Standard) oder `saas` |
| `APP_DOMAIN` | Basis-Domain ohne Protokoll; im SaaS-Modus Pflicht |
| `POSTGRES_PASSWORD` | Passwort der mitgelieferten Datenbank |
| `ORG_NAME` | Name des ersten Bildungsanbieters; wird nur angelegt, wenn noch keiner existiert |
| `ORG_SLUG` | Optionales Kürzel statt des aus dem Namen gebildeten |
| `PORT` | Port auf dem Host (Standard 3000) |

## Technik

Next.js (App Router), TypeScript, PostgreSQL mit Prisma, Tailwind CSS.
