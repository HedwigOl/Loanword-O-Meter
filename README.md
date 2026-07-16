# Loanword-O-Meter

Loanword-O-Meter is een interactieve webapplicatie voor het analyseren en visualiseren van leenwoorden in een corpus dat is geïndexeerd met BlackLab. De applicatie leest een JSON-bestand in en zet de gegevens automatisch om in statistieken, grafieken en doorzoekbare overzichten.

## Bestandsstructuur

### `index.html`

Bevat de structuur van de webpagina. Hier worden alle onderdelen van het dashboard gedefinieerd, zoals de invoer voor de JSON-link, de overzichtskaarten, de grafieken en de tabellen.

### `style.css`

Verzorgt de volledige opmaak van de applicatie, waaronder de lay-out, kleuren, lettertypes, tabellen, kaarten en de responsive weergave.

### `app.js`

Vormt het centrale besturingsbestand van de applicatie. Dit bestand:

* laadt de JSON-data;
* roept de parser aan;
* berekent de statistieken;
* werkt het dashboard bij;
* initialiseert en actualiseert de grafieken;
* vult de verschillende tabellen.

### `parser.js`

Leest de BlackLab JSON-uitvoer en zet deze om naar een eenvoudige datastructuur die door de rest van de applicatie gebruikt kan worden.

### `statistics.js`

Berekent alle statistieken die in het dashboard worden weergegeven, zoals:

* aantal leenwoordvoorkomens;
* aantal unieke leenwoorden;
* percentages;
* meest voorkomende brontaal;
* aantal brontalen.

### `charts.js`

Maakt en actualiseert de interactieve grafieken met behulp van Chart.js. Dit bestand verzorgt zowel het donutdiagram als het staafdiagram en ondersteunt de token- en typeweergave.

### `explorer.js`

Beheert het overzicht van leenwoorden per brontaal. De gebruiker kan talen uitklappen, zoeken op taal of leenwoord en door de resultaten bladeren met paginering.

### `ui.js`

Actualiseert de waarden in het dashboard, zoals de statistieken en statusmeldingen.

---

# Gebruik

1. Open de projectmap in Visual Studio Code.
2. Start de applicatie met **Live Server**.
3. Voer de URL van een BlackLab JSON-bestand in of gebruik een lokale JSON-uitvoer.
4. Klik op **Load**.
5. De applicatie verwerkt de gegevens automatisch en toont:

   * een corpusoverzicht;
   * interactieve grafieken;
   * de meest voorkomende leenwoorden;
   * een doorzoekbaar overzicht van leenwoorden per brontaal.

---

# Gebruikte technologieën

* HTML5
* CSS3
* JavaScript (ES6 Modules)
* Chart.js
* BlackLab JSON API
