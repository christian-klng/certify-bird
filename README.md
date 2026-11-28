# Certify Bird

Zertifikate für kleine Bildungsanbieter: Vorlagen gestalten, Teilnahmezertifikate
ausstellen und verwalten, und jedes Zertifikat als öffentliche Seite und Open Badge
bereitstellen. Open Source und selbst hostbar.

> **Stand:** Früh. Es gibt die Mandantenverwaltung per Hostname, die beiden
> Betriebsmodi, die Anmeldung per Magic Link, Zertifikatsvorlagen, das
> Kohorten mit Zertifikaten als PDF, das Portal für Teilnehmende, die
> öffentliche Zertifikatsseite, Open Badges, eigene Domains im SaaS-Betrieb
> und Quizzes als Leistungsabfrage.

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

Die eigene Subdomain trägt der Inhaber unter „Eigene Domain" ein. Sie wird
erst aktiv, wenn ihr CNAME auf `<kürzel>.<APP_DOMAIN>` zeigt und die Instanz
darunter per HTTPS erreichbar ist. Wie Wildcard-Zertifikat und Zertifikate für
eigene Domains auf Coolify eingerichtet werden, steht in
[docs/saas-betrieb.md](docs/saas-betrieb.md).

## Anmeldung

Es gibt keine Passwörter. Wer sich anmelden will, gibt seine E-Mail-Adresse ein
und bekommt einen Link, der 15 Minuten und nur einmal gilt. Die Sitzung hält
danach 30 Tage. Das gilt für die Verwaltung genauso wie für Teilnehmende.

- **Single-Modus:** Die erste Person wird über `ADMIN_EMAIL` eingetragen.
- **SaaS-Modus:** Unter `/register` auf der Plattform-Adresse legt man einen
  Bildungsanbieter an und wird dessen Inhaber.

## Vorlagen

Unter „Vorlagen" in der Verwaltung legt man fest, wie ein Zertifikat aussieht:
im Editor frei gestaltet oder mit einem fertigen PDF als Hintergrund. Dazu
gehört ein Beschreibungstext des Leistungsnachweises. In einem Feld „Text mit
Platzhaltern" werden `{name}`, `{kurs}`, `{datum}` und `{anbieter}` beim
Ausstellen ersetzt; die Vorschau zeigt das PDF mit Beispieldaten.

Editor und PDF-Erzeugung stammen von [pdfme](https://pdfme.com) (MIT).

## Kohorten und Zertifikate

Eine Kohorte ist ein Durchgang eines Kurses, etwa „Generative KI –
Wintersemester 2026/27“. Sie ist mit einer Vorlage verbunden, und unter ihr
stehen die Teilnehmenden und ihre Zertifikate.

Unter „Kohorten und Zertifikate“ legt man eine Kohorte an: Name des Kurses,
Vorlage, Ausstellungsdatum und auf Wunsch ein Quiz. Die Teilnehmenden trägt
man gleich oder später als Liste ein, eine Person pro Zeile mit Name und
E-Mail-Adresse, etwa direkt aus einer Tabelle kopiert. Eintragen allein
erzeugt noch kein Zertifikat und verschickt keine E-Mail.

Wenn es so weit ist, kreuzt man in der Kohorte an, wer ein Zertifikat bekommt,
und stellt aus. Die Übrigen bleiben eingetragen. Jede Person bekommt ein
Zertifikat als PDF; alle zusammen gibt es als ein PDF zum Drucken.

Mit dem ersten Zertifikat hält die Kohorte fest, wie die Vorlage aussieht, und
das Ausstellungsdatum steht fest. Bis dahin wirken Änderungen an der Vorlage
noch. Wer die Vorlage danach ändert oder löscht, verändert die Zertifikate der
Kohorte nicht mehr.

## Quizzes

Ein Quiz fragt ab, was Teilnehmende gelernt haben. Unter „Quizzes" legt man
Fragen mit Antworten zum Ankreuzen an und markiert die richtigen. Sind bei
einer Frage mehrere richtig, zählt sie nur, wenn genau diese angekreuzt sind.
Dazu kommen die Bestehensgrenze in Prozent und, wenn gewünscht, eine
Höchstzahl an Versuchen.

Beim Anlegen einer Kohorte lässt sich ein Quiz als Leistungsnachweis wählen.
Dann stellt nicht die Verwaltung aus: Die Teilnehmenden werden per E-Mail zum
Quiz eingeladen und bekommen ihr Zertifikat in dem Moment, in dem sie es
bestehen. Die Kohorte zeigt, wer noch offen ist und mit welchem Ergebnis jemand
bestanden hat. Sind die Versuche einer Person aufgebraucht, kann die
Verwaltung sie zurücksetzen.

Das Quiz wird beim Anlegen der Kohorte kopiert; spätere Änderungen gelten nur
für künftige Kohorten. Teilnehmende sehen nach einem Versuch,
wie viele Fragen richtig waren, aber nicht welche.

## Teilnehmende und öffentliche Seite

Aus einer Kohorte heraus werden die Teilnehmenden per E-Mail über ihr
Zertifikat benachrichtigt. Die Mail enthält einen persönlichen Anmeldelink (14 Tage
gültig, einmalig); später bekommen sie unter `/login` jederzeit einen neuen.
Ein Passwort gibt es auch für sie nicht.

Unter `/meine-zertifikate` sehen sie ihre Zertifikate und laden das PDF
herunter. Ein Zertifikat ist für Dritte **nur mit Einwilligung** sichtbar: Erst
wenn die Person zustimmt, gibt es die öffentliche Seite `/z/<id>`, die sie
teilen kann. Der Widerruf schaltet die Seite sofort ab. Einwilligung und
Widerruf werden mit Zeitpunkt und Fassung des Einwilligungstexts festgehalten.
Der Text steht in `src/lib/certificates/consent.ts` und sollte vor dem
Produktivbetrieb rechtlich geprüft werden.

## Open Badges

Jedes Zertifikat gibt es auch als Open Badge nach
[Open Badges 3.0](https://www.imsglobal.org/spec/ob/v3p0/): ein Verifiable
Credential, das der Bildungsanbieter digital signiert (JWT, RS256).

- **Aussteller ist der Bildungsanbieter**, nicht Certify Bird. Sein Profil
  steht unter `/badges/issuer`, sein öffentlicher Schlüssel unter
  `/badges/keys/<id>`, beides auf seiner eigenen Adresse.
- Jeder Anbieter bekommt beim ersten Badge ein eigenes Schlüsselpaar. Der
  geheime Teil liegt in der Datenbank der Instanz; wer die Datenbank sichert,
  sichert auch ihn.
- Die E-Mail-Adresse der Person steht nur als gesalzener Hash im Badge.
- Teilnehmende laden ihr Badge unter „Meine Zertifikate" herunter, Dritte von
  der öffentlichen Zertifikatsseite, sofern eingewilligt wurde.

Die Umsetzung folgt der Spezifikation, ist aber nicht von 1EdTech zertifiziert.
Noch nicht umgesetzt: Widerruf einzelner Badges (Statusliste) und das
Einbetten in eine Bilddatei. Ein Badge prüft nur, wer die Adresse der Instanz
erreicht: Sie muss dauerhaft dieselbe bleiben.

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
| `TRAEFIK_SERVICE`, `TRAEFIK_SERVICE_URL`, `TRAEFIK_CERT_RESOLVER` | Nur SaaS mit eigenen Domains, siehe [docs/saas-betrieb.md](docs/saas-betrieb.md) |

## Technik

Next.js (App Router), TypeScript, PostgreSQL mit Prisma, Tailwind CSS, pdfme.

## Lizenz

[AGPL-3.0](LICENSE). Wer eine veränderte Version als Dienst betreibt, muss den
geänderten Quellcode offenlegen.
