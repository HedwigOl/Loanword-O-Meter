## Loanword-O-Meter

Loanword-O-Meter is een webapplicatie voor het analyseren en visualiseren van leenwoorden in een corpus. De applicatie leest een JSON-bestand in en zet de gegevens automatisch om in statistieken, grafieken en doorzoekbare overzichten.

### Projectstructuur

- `index.html` HTML file, Bevat algemene structuur van de webpagina.

#### css

- `style.css` Verzorgt de volledige opmaak van de applicatie, waaronder de lay-out, kleuren, lettertypes, tabellen, kaarten en de responsive weergave.

#### js

- `app.js` Centrale besturing van de applicatie.
- `parser.js` Leest de BlackLab JSON-uitvoer en zet deze om naar een eenvoudige datastructuur die door de rest van de applicatie gebruikt kan worden.
- `statistics.js` Berekent statistieken die op het dashboard weergeven worden.
- `charts.js` Maakt de grafieken in de webapplicatie.
- `explorer.js `Beheert het overzicht van leenwoorden per brontaal.
- `ui.js` Houdt het dashboard met statistieken en statusmeldingen bij.

---

# Gebruik

1. Open de projectmap in Visual Studio Code.
3. Start de localhost `node proxy.js`.
4. Ga naar de localhost in de browser.
5. Voer de URL van een BlackLab JSON-bestand in of gebruik een lokale JSON-uitvoer.
6. Klik op **Load**.
7. De applicatie verwerkt de gegevens automatisch en toont:

   * overzicht van algemene statistieken;
   * grafieken voor type-based en token-based analyse;
   * lijst met de voorkomende leenwoorden;
   * een doorzoekbaar overzicht van leenwoorden per brontaal.

---
Dashboardapplicatie voor het weergeven van statistieken verkregen met behulp van de Loanword-O-Meter (https://github.com/instituutnederlandsetaal/leenwoordenzoeker?tab=readme-ov-file). Licence holders van deze Loanword-O-Meter zijn Nicoline van der Sijs (data), Kaspar Beelen en Joey Stofberg (code).

