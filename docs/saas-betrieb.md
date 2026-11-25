# SaaS-Betrieb mit eigenen Domains

Diese Anleitung beschreibt, wie Certify Bird im Modus `saas` auf Coolify mit
dem Standard-Proxy Traefik läuft: viele Bildungsanbieter unter
`<kürzel>.<APP_DOMAIN>`, auf Wunsch jeder unter einer eigenen Subdomain.

> **Stand:** Die App-Seite ist gebaut und getestet. Die Proxy-Einrichtung
> unten ist aus der Dokumentation von Coolify und Traefik zusammengestellt,
> aber **noch auf keinem Server erprobt**. Was nur abgeleitet und nicht
> dokumentiert ist, steht ausdrücklich dabei. Probier es zuerst mit der
> Staging-Zertifizierungsstelle von Let's Encrypt aus.

## Was die App tut

- Sie ordnet jede Anfrage über den Hostnamen einem Anbieter zu.
- Inhaber tragen unter „Verwaltung → Eigene Domain" eine Subdomain ein und
  setzen bei ihrem Domain-Anbieter einen `CNAME` auf `<kürzel>.<APP_DOMAIN>`.
- „Jetzt prüfen" schaltet die Domain erst frei, wenn zwei Dinge stimmen: Der
  CNAME zeigt auf die Adresse genau dieses Anbieters, und die Instanz
  antwortet unter der Domain per HTTPS mit gültigem Zertifikat. Vorher ändert
  sich nichts, niemand sperrt sich aus.
- Danach gilt nur noch die eigene Domain; die alte Adresse leitet um.

Für den Proxy stellt die App drei Abfragen bereit, die auch unter unbekannten
Hostnamen antworten:

| Adresse | Zweck |
|---|---|
| `/api/traefik-config` | Traefik-Konfiguration mit einem Router je eigener Domain (HTTP-Provider). Nur aktiv, wenn `TRAEFIK_SERVICE_URL` gesetzt ist. |
| `/api/tls-check?domain=…` | Für Proxys mit Zertifikaten auf Abruf (Caddy `on_demand_tls`): 200, wenn die Domain zu einem Anbieter gehört, sonst 404. |
| `/api/domain-check` | Von der App selbst genutzt: beweist, dass sie unter einer Domain erreichbar ist. |

## 1. DNS der Plattform

Bei der Domain aus `APP_DOMAIN` (Beispiel `certifybird.com`):

- `A`-Eintrag für `certifybird.com` auf die IP des Servers
- `A`-Eintrag für `*.certifybird.com` auf dieselbe IP

## 2. Wildcard-Zertifikat für `*.<APP_DOMAIN>`

Ein Wildcard-Zertifikat gibt es nur über die DNS-Challenge: Traefik braucht
einen API-Zugang zu deinem DNS-Anbieter. Das ist in Coolify dokumentiert:
<https://coolify.io/docs/knowledge-base/proxy/traefik/dns-challenge> und
<https://coolify.io/docs/knowledge-base/proxy/traefik/wildcard-certs>.

In Coolify unter **Servers → Server → Proxy → Configuration** beim Dienst
`traefik` (Beispiel Hetzner; für andere Anbieter heißen Variable und Provider
anders):

```yaml
environment:
  - HETZNER_API_TOKEN=<token>
command:
  - '--certificatesresolvers.letsencrypt.acme.dnschallenge.provider=hetzner'
  - '--certificatesresolvers.letsencrypt.acme.dnschallenge.delaybeforecheck=0'
```

Die beiden Zeilen mit `httpchallenge` für den Resolver `letsencrypt` entfernen,
dann den Proxy neu starten.

Unter **Proxy → Dynamic Configurations** eine Datei `wildcard-certifybird.yaml`
anlegen, die das Zertifikat anfordert:

```yaml
http:
  routers:
    wildcard-certifybird:
      rule: 'HostRegexp(`[a-z0-9-]+\.certifybird\.com`)'
      entryPoints:
        - https
      priority: 1
      service: wildcard-placeholder
      tls:
        certResolver: letsencrypt
        domains:
          - main: certifybird.com
            sans:
              - '*.certifybird.com'
  services:
    wildcard-placeholder:
      loadBalancer:
        servers: []
```

## 3. Alle Subdomains zur App leiten

Das Domain-Feld von Coolify nimmt nur feste Hostnamen. Für alle Subdomains
braucht der Dienst `app` eigene Traefik-Labels (in Coolify „Label management:
Managed manually"):

```
traefik.enable=true
traefik.http.routers.certifybird-http.rule=Host(`certifybird.com`) || HostRegexp(`[a-z0-9-]+\.certifybird\.com`)
traefik.http.routers.certifybird-http.entryPoints=http
traefik.http.routers.certifybird-http.middlewares=redirect-to-https
traefik.http.routers.certifybird-https.rule=Host(`certifybird.com`) || HostRegexp(`[a-z0-9-]+\.certifybird\.com`)
traefik.http.routers.certifybird-https.entryPoints=https
traefik.http.routers.certifybird-https.tls=true
traefik.http.routers.certifybird-https.tls.certresolver=letsencrypt
traefik.http.routers.certifybird-https.service=certifybird
traefik.http.services.certifybird.loadbalancer.server.port=3000
```

**Nicht bestätigt:** Die Coolify-Doku beschreibt manuelle Labels für einzelne
Anwendungen. Wie das bei einer Ressource vom Typ „Docker Compose" eingestellt
wird, habe ich nicht belegt gefunden.

Variablen der App:

```bash
APP_MODE=saas
APP_DOMAIN=certifybird.com
```

Damit läuft der SaaS-Betrieb ohne eigene Domains: Registrierung unter
`https://certifybird.com/register`, jeder Anbieter unter seinem Kürzel.

## 4. Eigene Domains der Anbieter

Für fremde Domains kann Traefik keine DNS-Challenge lösen, und für Hostnamen,
die nur über `HostRegexp` passen, holt es kein Zertifikat. Jede eigene Domain
braucht deshalb einen eigenen Router mit `Host(...)`. Diese Router liefert die
App über `/api/traefik-config`; Traefik fragt die Adresse alle paar Sekunden
ab (HTTP-Provider:
<https://doc.traefik.io/traefik/reference/install-configuration/providers/others/http/>).

**Dieser Abschnitt ist abgeleitet, nicht von Coolify dokumentiert.** Coolify
erlaubt eigene Startparameter für den Proxy, erwähnt den HTTP-Provider aber
nicht.

Unter **Proxy → Configuration** beim Dienst `traefik` ergänzen:

```yaml
command:
  # Zweiter Resolver mit HTTP-Challenge, nur für die eigenen Domains
  - '--certificatesresolvers.letsencrypt-http.acme.httpchallenge=true'
  - '--certificatesresolvers.letsencrypt-http.acme.httpchallenge.entrypoint=http'
  - '--certificatesresolvers.letsencrypt-http.acme.storage=/traefik/acme-http.json'
  # Zum Ausprobieren: Staging-Zertifizierungsstelle, später entfernen
  - '--certificatesresolvers.letsencrypt-http.acme.caserver=https://acme-staging-v02.api.letsencrypt.org/directory'
  # Die Router für eigene Domains kommen von der App
  - '--providers.http.endpoint=http://<app-container>:3000/api/traefik-config'
```

Variablen der App:

```bash
# Adresse der App aus Sicht des Proxys
TRAEFIK_SERVICE_URL=http://<app-container>:3000
TRAEFIK_CERT_RESOLVER=letsencrypt-http
```

`<app-container>` ist der Name, unter dem der Proxy den Container der App im
Docker-Netz erreicht. Coolify hängt an Containernamen eine Kennung an; den
tatsächlichen Namen zeigt `docker ps` auf dem Server. **Offen:** ob dieser Name
über Deployments hinweg gleich bleibt. Falls nicht, braucht der Dienst einen
festen Netzwerk-Alias.

### Ablauf für einen Anbieter

1. Der Inhaber trägt die Subdomain ein. Sie erscheint sofort in
   `/api/traefik-config`.
2. Er setzt den CNAME. Sobald er wirkt, holt Traefik beim ersten Aufruf das
   Zertifikat.
3. „Jetzt prüfen" gelingt, die Domain ist aktiv.

Zeigt der CNAME noch nicht auf den Server, scheitert Traefiks Versuch, ein
Zertifikat zu holen. Let's Encrypt begrenzt Fehlversuche; bei vielen
vorgemerkten, aber nie eingerichteten Domains kann das stören.

### Alternative: Caddy mit Zertifikaten auf Abruf

Caddy stellt Zertifikate beim ersten Aufruf einer Domain aus und fragt vorher
die App (`/api/tls-check`). Das braucht keine Router je Domain. Coolify
unterstützt Caddy als Proxy, dokumentiert `on_demand_tls` aber nicht; es gibt
dazu nur einzelne Berichte aus der Community
(<https://github.com/coollabsio/coolify/discussions/6254>). Für das
Wildcard-Zertifikat braucht Caddy außerdem ein selbst gebautes Image mit dem
Modul des DNS-Anbieters.

## Was beim Betrieb zu beachten ist

- **Kürzel und Domains sind dauerhaft.** Zertifikatsseiten und Open Badges
  verweisen auf die Adresse, unter der sie ausgestellt wurden. Die alte
  Kürzel-Adresse leitet auf die eigene Domain um; entfernt ein Anbieter seine
  eigene Domain wieder, lassen sich die darunter ausgestellten Badges nicht
  mehr prüfen.
- **`/api/traefik-config` und `/api/tls-check` sind ohne Anmeldung
  abrufbar** und verraten, welche Domains Anbieter eingetragen haben. Wer das
  nicht will, sperrt beide Pfade im Proxy für Anfragen von außen.
- **Anmeldungen gelten je Adresse.** Nach dem Umstellen auf die eigene Domain
  melden sich Verwaltung und Teilnehmende dort einmal neu an.
