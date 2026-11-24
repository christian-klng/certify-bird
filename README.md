# Certify Bird

Zertifikate für kleine Bildungsanbieter: Vorlagen gestalten, Teilnahmezertifikate
ausstellen und verwalten, und jedes Zertifikat als öffentliche Seite und Open Badge
bereitstellen. Open Source und selbst hostbar.

> **Stand:** Früh. Es gibt die Mandantenverwaltung per Hostname, die beiden
> Betriebsmodi und die Anmeldung per Magic Link, aber noch keine Vorlagen und
> Zertifikate.

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

## Anmeldung

Es gibt keine Passwörter. Wer sich anmelden will, gibt seine E-Mail-Adresse ein
und bekommt einen Link, der 15 Minuten und nur einmal gilt. Die Sitzung hält
danach 30 Tage.

- **Single-Modus:** Die erste Person wird über `ADMIN_EMAIL` eingetragen.
- **SaaS-Modus:** Unter `/register` auf der Plattform-Adresse legt man einen
  Bildungsanbieter an und wird dessen Inhaber.

## Lokale Entwicklung

Voraussetzungen: Node.js 24, pnpm, Docker.

```bash
cp .env.example .env
docker compose -f docker-compose.dev.yml up -d   # PostgreSQL und Test-Postfach
pnpm install
pnpm db:deploy                                   # Migrationen einspielen
pnpm db:seed                                     # Demo-Anbieter und Admin anlegen
pnpm dev
```

Danach läuft die App unter <http://localhost:3000>. Anmelden kannst du dich mit
`admin@example.org`; die Mail mit dem Link landet im Test-Postfach unter
<http://localhost:8025>.

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

Die `docker-compose.yml` startet PostgreSQL, spielt die Migrationen ein, legt
den Bildungsanbieter an und startet die App. Die Werte kommen aus der Umgebung
oder aus einer `.env`-Datei daneben:

```bash
APP_DOMAIN=zertifikate.meine-akademie.de
POSTGRES_PASSWORD=<sicheres-passwort>
ORG_NAME="Meine Akademie"
ADMIN_EMAIL=ich@meine-akademie.de
SMTP_HOST=smtp.ionos.de
SMTP_PORT=587
SMTP_USER=noreply@meine-akademie.de
SMTP_PASSWORD=<passwort-des-postfachs>
SMTP_FROM=noreply@meine-akademie.de
```

```bash
docker compose up -d --build
```

Die App lauscht im Container auf Port 3000 und gibt ihn nicht nach außen frei.
Davor gehört ein Reverse Proxy mit TLS:

- **Coolify:** Repo als Ressource mit Build Pack „Docker Compose" anlegen, die
  Variablen dort eintragen und dem Dienst `app` die Domain mit Port 3000 zuweisen.
- **Eigener Proxy auf demselben Server:** eine `docker-compose.override.yml`
  mit `services: { app: { ports: ["127.0.0.1:3000:3000"] } }` anlegen und den
  Proxy auf diesen Port zeigen lassen.

Unter `/api/health` meldet die App, ob sie und die Datenbank erreichbar sind.

| Variable | Bedeutung |
|---|---|
| `APP_MODE` | `single` (Standard) oder `saas` |
| `APP_DOMAIN` | Domain der Instanz ohne Protokoll. Pflicht: Daraus entstehen die Links in den Anmelde-Mails |
| `POSTGRES_PASSWORD` | Passwort der mitgelieferten Datenbank |
| `ORG_NAME` | Name des ersten Bildungsanbieters; wird nur angelegt, wenn noch keiner existiert |
| `ORG_SLUG` | Optionales Kürzel statt des aus dem Namen gebildeten |
| `ADMIN_EMAIL` | Erste Person mit Zugang; wird nur eingetragen, solange der Anbieter niemanden hat |
| `SMTP_HOST`, `SMTP_PORT` | Mailserver; Port 587 (STARTTLS) oder 465 (TLS) |
| `SMTP_USER`, `SMTP_PASSWORD` | Zugangsdaten des Postfachs |
| `SMTP_FROM` | Absenderadresse; bei den meisten Anbietern muss sie zum Postfach gehören |

## Technik

Next.js (App Router), TypeScript, PostgreSQL mit Prisma, Tailwind CSS.

## Lizenz

[AGPL-3.0](LICENSE). Wer eine veränderte Version als Dienst betreibt, muss den
geänderten Quellcode offenlegen.
