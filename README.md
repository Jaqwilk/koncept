# koncept - Strona Agencji Webowej

Nowoczesna, responsywna strona internetowa dla jednoosobowej agencji webowej "koncept".

## Struktura projektu

```
koncept-agency/
├── index.html                    # Strona główna
├── uslugi.html                   # Usługi z cennikiem
├── portfolio.html                # Portfolio (3 projekty)
├── o-mnie.html                   # O mnie
├── kontakt.html                  # Kontakt z formularzem
├── polityka-prywatnosci.html     # Polityka prywatności (RODO)
├── portal/                       # Interfejs klienta (dashboard, workspace, admin)
├── api/                          # Funkcje backendowe Vercel dla portalu
├── prisma/                       # Schema ORM, migracje i seed
├── css/
│   └── style.css                  # Główny arkusz stylów
├── js/
│   └── main.js                    # Skrypty (menu, animacje, formularz)
├── images/
│   └── favicon.svg                # Favicon
├── sitemap.xml                    # Mapa strony dla Google
└── robots.txt                     # Instrukcje dla robotów
```

## Portal klienta

Portal został dodany jako natywna część tego repo, bez przepisywania całej strony marketingowej na framework SPA.

Architektura:

- statyczne strony marketingowe pozostają w HTML/CSS/Vanilla JS
- portal działa pod `/portal/`
- backend portalu jest zrealizowany przez funkcje `Vercel` w katalogu `api/`
- dane są trzymane w `PostgreSQL` przez `Prisma`
- logowanie używa ciasteczka sesyjnego HTTP-only
- pliki projektowe i faktury są uploadowane do `Vercel Blob`

Główne moduły portalu:

- dashboard klienta i zespołu
- workspace projektu z zakładkami:
  - overview
  - materials
  - timeline
  - feedback
  - messages
  - files
  - invoices
  - approvals
- panel admina do tworzenia projektów i zapraszania użytkowników
- aktywność projektu i powiadomienia

## Instalacja i uruchomienie

1. Zainstaluj zależności:

```bash
npm install
```

2. Skopiuj zmienne środowiskowe:

```bash
cp .env.example .env
```

3. Wygeneruj klienta Prisma i uruchom migracje:

```bash
npm run prisma:generate
npm run prisma:migrate
```

4. Zasil bazę danymi demo:

```bash
npm run seed
```

5. Uruchom lokalnie:

```bash
npm run dev
```

## Wymagane zmienne środowiskowe

- `DATABASE_URL`
- `DIRECT_URL`
- `AUTH_SECRET`
- `APP_BASE_URL`
- `BLOB_READ_WRITE_TOKEN`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `ENABLE_EMAIL_NOTIFICATIONS`
- `MAX_UPLOAD_MB`

## Konta demo po seedzie

- `admin@koncept.pl` / `demo12345`
- `team@koncept.pl` / `demo12345`
- `client@koncept.pl` / `demo12345`

## Najważniejsze endpointy portalu

- `POST /api/auth-login`
- `POST /api/auth-logout`
- `GET /api/auth-me`
- `POST /api/auth-invite`
- `POST /api/auth-accept-invite`
- `GET /api/dashboard`
- `GET /api/admin-overview`
- `POST /api/admin-projects`
- `GET /api/project-workspace?projectId=...`
- `POST /api/project-brief`
- `POST /api/project-files`
- `POST /api/project-feedback`
- `POST /api/project-messages`
- `POST /api/project-approvals`
- `POST /api/project-stages`
- `POST /api/project-invoices`
- `GET|POST /api/notifications`

## Jak testować portal

Scenariusz klienta:

1. Zaloguj się jako `client@koncept.pl`.
2. Wejdź do `/portal/`.
3. Otwórz projekt `Vitals Studio`.
4. Sprawdź checklistę, timeline, feedback, approvals i faktury.
5. Dodaj wiadomość oraz zaktualizuj brief.
6. Dodaj materiał do zakładki `Materials`.

Scenariusz zespołu / admina:

1. Zaloguj się jako `admin@koncept.pl` lub `team@koncept.pl`.
2. Wejdź do `/portal/admin/`.
3. Utwórz nowy projekt.
4. Wyślij zaproszenie do klienta lub członka zespołu.
5. W workspace projektu:
   - zaktualizuj etap timeline
   - dodaj fakturę PDF
   - wyślij prośbę o akceptację
   - dodaj wiadomość wewnętrzną

## Co jest wdrożone

- role: `ADMIN`, `TEAM_MEMBER`, `CLIENT`
- projektowe ograniczenia dostępu po członkostwie
- dashboard i panel admina
- brief klienta z możliwością edycji
- checklista z automatycznym domykaniem zadań
- messaging per projekt
- feedback i approval log
- invoices z PDF
- activity log i notifications
- bezpieczne pobieranie plików przez sprawdzanie uprawnień

## SEO - Optymalizacja

Strona została zoptymalizowana pod kątem wyszukiwarek:

- ✅ **Semantyczny HTML5** - odpowiednie tagi (header, nav, main, article, section)
- ✅ **Meta tagi** - title, description, keywords na każdej stronie
- ✅ **Open Graph** - dla Facebooka i innych social media
- ✅ **Schema.org** - strukturyzowane dane (JSON-LD)
- ✅ **Canonical URLs** - unikanie duplikatów treści
- ✅ **Sitemap.xml** - mapa strony
- ✅ **robots.txt** - instrukcje dla crawlerów
- ✅ **Atrybuty alt** - dla wszystkich obrazów
- ✅ **Szybkość ładowania** - optymalizacja CSS, defer dla JS
- ✅ **Responsywność** - mobile-first design
- ✅ **Dostępność** - ARIA labels, skip link, kontrast

## Technologie

- **HTML5** - semantyczna struktura
- **CSS3** - zmienne CSS, Grid, Flexbox, animacje
- **Vanilla JS** - bez frameworków, lekki kod
- **Google Fonts** - Inter (czcionka)

## Usługi (zgodnie z briefem)

1. **Strony WWW** - projektowanie i tworzenie
2. **Systemy rezerwacji** - online, SMS
3. **Płatności online** - subskrypcje, faktury
4. **SEO** - pozycjonowanie, optymalizacja
5. **Google Business** - wizytówki Google
6. **Reklamy** - Google Ads, Meta Ads
7. **Utrzymanie** - wsparcie techniczne

## Design

- **Inspiracja:** mikr.us, notion.so
- **Styl:** High-tech, minimalistyczny, czysty
- **Kolory:** Jasne tło, ciemny tekst, niebieski akcent
- **Animacje:** Subtelne, nienachalne
- **Typografia:** Inter - nowoczesna, czytelna

## Co zmienić przed publikacją

1. **Dane kontaktowe:**
   - Numer telefonu (wszędzie gdzie XXX)
   - Adres e-mail
   - Godziny pracy
   - Adres (jeśli dotyczy)

2. **O mnie:**
   - Imię i nazwisko
   - Zdjęcie
   - Historia/opis

3. **Portfolio:**
   - Zrzuty ekranu projektów
   - Linki do działających stron

4. **Polityka prywatności:**
   - Dane firmy/adres
   - NIP/REGON (jeśli dotyczy)

5. **SEO:**
   - Zmień URL w meta tagach (obecnie koncept.pl)
   - Dodaj rzeczywiste obrazy dla Open Graph

## Walidacja

Przed publikacją sprawdź:

- [ ] Validator W3C (HTML)
- [ ] Google Mobile-Friendly Test
- [ ] Google PageSpeed Insights
- [ ] Rich Results Test (Schema.org)

## Licencja

Projekt stworzony dla agencji koncept.
