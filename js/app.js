// app.js

import { parseBlackLab }                      from "./parser.js";
import { calculateStatistics }                from "./statistics.js";
import { updateDashboard, updateStatus }      from "./ui.js";
import { initialiseCharts, updateCharts }     from "./charts.js";
import { initialiseExplorer, updateExplorer } from "./explorer.js";
import { openOccurrences }                    from "./occurrences.js";

// Main interface elements
const loadButton     = document.getElementById("loadBtn");
const urlInput       = document.getElementById("jsonUrl");
const loaderSection  = document.getElementById("loaderSection");
const tableBody      = document.getElementById("topWordsTable");
const previousButton = document.getElementById("showLessBtn");
const nextButton     = document.getElementById("showMoreBtn");
const pageInfo       = document.getElementById("tablePageInfo");

// Application state
let currentCorpus = null;
let currentHomFalseCorpus = null;
let currentChartCorpus = null;
let currentMode   = "token";

const pageSize  = 10;
let currentPage = 0;

// Create empty charts and explorer
initialiseCharts();
initialiseExplorer();

// Event listeners
loadButton.addEventListener("click", loadCorpus);

urlInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        loadCorpus();
    }
});

if (
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
) {
    loaderSection.style.display = "none";
    loadCorpus();
}

// Switch to token mode
document.getElementById("tokenTab").addEventListener("click", () => {
    if (!currentCorpus) return;

    currentMode = "token";
    setActiveTab();
    updateCharts(currentChartCorpus, currentMode);
});

// Switch to type mode
document.getElementById("typeTab").addEventListener("click", () => {
    if (!currentCorpus) return;

    currentMode = "type";
    setActiveTab();
    updateCharts(currentChartCorpus, currentMode);
});

// Previous table page
previousButton.addEventListener("click", () => {
    if (currentPage > 0) {
        currentPage--;
        renderTopWords(
            currentHomFalseCorpus.rows,
            currentCorpus.rows
        );
    }
});

// Next table page
nextButton.addEventListener("click", () => {
    if (!currentHomFalseCorpus) return;

    const maxPage = Math.floor(
        (currentHomFalseCorpus.rows.length - 1) / pageSize
    );

    if (currentPage < maxPage) {
        currentPage++;
        renderTopWords(
            currentHomFalseCorpus.rows,
            currentCorpus.rows
        );
    }
});

// Highlight the selected tab
function setActiveTab() {
    document
        .getElementById("tokenTab")
        .classList.toggle("active", currentMode === "token");

    document
        .getElementById("typeTab")
        .classList.toggle("active", currentMode === "type");
}

function getRequestUrl(url) {
    // Local development: use the proxy
    if (
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
    ) {
        return "/blacklab" + url.pathname + url.search;
    }

    return url.href;
}

function createHomUrl(originalUrl, homValue) {
    const url = new URL(originalUrl);

    // Keep the same corpus, but replace the query parameters
    url.searchParams.set(
        "patt",
        `<term hom="${homValue}"/>`
    );

    url.searchParams.set(
        "group",
        "context:lemma:i:H"
    );

    url.searchParams.set("adjusthits", "true");
    url.searchParams.set("withspans", "false");
    url.searchParams.set("outputformat", "json");

    // We want all matching groups
    url.searchParams.set("first", "0");
    url.searchParams.set("number", "50000");

    // These are not needed for this query
    url.searchParams.delete("sort");
    url.searchParams.delete("interface");

    return url;
}

export function getProductionCorpusUrl() {
    const corpus = document.location.href
        .replace(/.*blacklab-frontend\//, "")
        .replace(/\/.*/, "");

    return `${window.location.origin}/blacklab-server/corpora/${encodeURIComponent(corpus)}/hits`;
}

async function getNumberOfGroups(originalUrl) {
    const url = new URL(originalUrl);

    url.searchParams.set("patt", "[]");
    url.searchParams.set("group", "context:lemma:i:H");
    url.searchParams.set("withspans", "false");
    url.searchParams.set("outputformat", "json");

    url.searchParams.delete("sort");

    // Make sure there are no accidental double slashes in the path
    url.pathname = url.pathname.replace(/\/+/g, "/");

    const proxyUrl =
        "/blacklab" +
        url.pathname +
        url.search;

    console.log("GROUPS URL:", proxyUrl);

    const response = await fetch(proxyUrl);

    if (!response.ok) {
        throw new Error("Could not retrieve number of groups.");
    }

    const json = await response.json();

    return json.summary.numberOfGroups;
}

function createChartCorpus(corpus, ambiguousLemmas) {

    // Change the language of ambiguous loanwords
    const rows = corpus.rows.map(row => {

        const isAmbiguous =
            ambiguousLemmas.has(
                row.lemma.toLowerCase()
            );

        if (isAmbiguous) {
            return {
                ...row,
                language: "Ambigue leenwoorden"
            };
        }

        return row;
    });


    // Recalculate token distribution
    const tokenTotals = new Map();

    rows.forEach(row => {

        const language = row.language;

        if (!tokenTotals.has(language)) {
            tokenTotals.set(language, 0);
        }

        tokenTotals.set(
            language,
            tokenTotals.get(language) + row.count
        );
    });


    // Recalculate type distribution
    const typeTotals = new Map();

    rows.forEach(row => {

        const language = row.language;

        if (!typeTotals.has(language)) {
            typeTotals.set(language, 0);
        }

        typeTotals.set(
            language,
            typeTotals.get(language) + 1
        );
    });


    return {
        ...corpus,
        rows,

        tokenDistribution: Array.from(
            tokenTotals,
            ([language, count]) => ({
                language,
                count
            })
        ),

        typeDistribution: Array.from(
            typeTotals,
            ([language, count]) => ({
                language,
                count
            })
        )
    };
}

function getAmbiguousLemmas(json) {
    const lemmas = new Set();

    for (const group of json.hitGroups ?? []) {
        const lemmaProperty = (group.properties ?? []).find(
            property =>
                property.name.includes("lemma")
        );

        if (lemmaProperty?.value) {
            lemmas.add(
                lemmaProperty.value.toLowerCase()
            );
        }
    }

    return lemmas;
}

// Load and process the selected JSON file
async function loadCorpus() {

    let url;

    if (
        window.location.hostname !== "localhost" &&
        window.location.hostname !== "127.0.0.1"
    ) {
        url = getProductionCorpusUrl();
    } else {
        url = urlInput.value.trim();

        if (!url) {
            updateStatus("Please enter a JSON URL.");
            return;
        }
    }

    updateStatus("Loading corpus...");

    try {

        // --------------------------------------------------
        // 1. Parse the original BlackLab URL
        // --------------------------------------------------

        const parsedUrl = new URL(url);

        parsedUrl.pathname =
            parsedUrl.pathname.replace(/\/+/g, "/");

        const requestUrl = getRequestUrl(parsedUrl);

        console.log("ORIGINAL URL:", url);
        console.log("REQUEST URL:", requestUrl);


        // --------------------------------------------------
        // 2. Fetch the general corpus
        // --------------------------------------------------

        const response = await fetch(requestUrl);

        if (!response.ok) {
            throw new Error(
                `${response.status} ${response.statusText}`
            );
        }

        const json = await response.json();


        // --------------------------------------------------
        // 3. Get number of groups
        // --------------------------------------------------

        const numberOfGroups =
            await getNumberOfGroups(url);


        // --------------------------------------------------
        // 4. Parse the general corpus
        // --------------------------------------------------

        currentCorpus =
            parseBlackLab(json, numberOfGroups);

        if (currentCorpus.rows.length === 0) {
            throw new Error("No loanword groups found.");
        }


        // --------------------------------------------------
        // 5. Fetch hom=false corpus
        // --------------------------------------------------

        const homFalseUrl =
            createHomUrl(url, "false");

        const homFalseRequestUrl =
            getRequestUrl(homFalseUrl);

        console.log(
            "HOM=FALSE URL:",
            homFalseUrl.href
        );

        console.log(
            "HOM=FALSE REQUEST URL:",
            homFalseRequestUrl
        );

        const homFalseResponse =
            await fetch(homFalseRequestUrl);

        if (!homFalseResponse.ok) {
            throw new Error(
                `Could not retrieve hom=false data: ${homFalseResponse.status} ${homFalseResponse.statusText}`
            );
        }

        const homFalseJson =
            await homFalseResponse.json();

        console.log(
            "HOM=FALSE JSON:",
            homFalseJson
        );

        const homFalseCorpus =
            parseBlackLab(
                homFalseJson,
                numberOfGroups
            );

        currentHomFalseCorpus =
            homFalseCorpus;


        // --------------------------------------------------
        // 6. Fetch hom=true corpus
        // --------------------------------------------------

        const homTrueUrl =
            createHomUrl(url, "true");

        const homTrueRequestUrl =
            getRequestUrl(homTrueUrl);

        console.log(
            "HOM=TRUE URL:",
            homTrueUrl.href
        );

        console.log(
            "HOM=TRUE REQUEST URL:",
            homTrueRequestUrl
        );

        const homTrueResponse =
            await fetch(homTrueRequestUrl);

        if (!homTrueResponse.ok) {
            throw new Error(
                `Could not retrieve hom=true data: ${homTrueResponse.status} ${homTrueResponse.statusText}`
            );
        }

        const homTrueJson =
            await homTrueResponse.json();

        console.log(
            "HOM=TRUE JSON:",
            homTrueJson
        );


        // --------------------------------------------------
        // 7. Get ambiguous lemmas
        // --------------------------------------------------

        const ambiguousLemmas =
            getAmbiguousLemmas(homTrueJson);
        
        const explorerRows = currentCorpus.rows.filter(row =>
            ambiguousLemmas.has(row.lemma.toLowerCase()) ||
            currentHomFalseCorpus.rows.some(
            loanRow =>
                loanRow.lemma.toLowerCase() ===
                row.lemma.toLowerCase()
            )
        );

        console.log(
            "AMBIGUOUS LEMMAS:",
            ambiguousLemmas
        );


        // --------------------------------------------------
        // 8. Create corpus used by the charts
        // --------------------------------------------------

        currentChartCorpus =
            createChartCorpus(
                currentCorpus,
                ambiguousLemmas
            );


        // --------------------------------------------------
        // 9. Reset table page
        // --------------------------------------------------

        currentPage = 0;


        // --------------------------------------------------
        // 10. Calculate dashboard statistics
        //
        // Loanword statistics = hom=false
        // Language statistics = general corpus
        // --------------------------------------------------

        const statistics =
            calculateStatistics(
                homFalseCorpus.rows,
                currentCorpus.corpus,
                currentCorpus.rows
            );


        // --------------------------------------------------
        // 11. Update the interface
        // --------------------------------------------------

        updateDashboard(statistics);

        updateCharts(
            currentChartCorpus,
            currentMode
        );

        updateExplorer(
            homFalseCorpus.rows,
            currentCorpus.rows,
            ambiguousLemmas
        );

        renderTopWords(
            homFalseCorpus.rows,
            currentCorpus.rows
        );


        // --------------------------------------------------
        // 12. Update status
        // --------------------------------------------------

        updateStatus(
            `Loaded ${currentCorpus.rows.length.toLocaleString()} loanword types.`
        );

    } catch (error) {

        console.error(error);

        updateStatus(
            "Could not load corpus: " + error.message
        );
    }
}

// Create table of top occurring loanwords

function renderTopWords(loanwordRows, generalRows) {

    if (!currentCorpus) return;

    // Create a lookup from lemma to source language
    const languageByLemma = new Map();

    generalRows.forEach(row => {
        languageByLemma.set(
            row.lemma.toLowerCase(),
            row.language
        );
    });

    // Use ONLY hom=false rows for the top words,
    // but get their language from the general query.
    const rows = loanwordRows
        .map(row => ({
            ...row,
            language:
                languageByLemma.get(
                    row.lemma.toLowerCase()
                ) ?? "Unknown"
        }))
        .sort((a, b) => b.count - a.count);

    const start = currentPage * pageSize;
    const end = Math.min(start + pageSize, rows.length);

    tableBody.innerHTML = "";

    rows.slice(start, end).forEach((row, index) => {

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${start + index + 1}</td>

            <td>
                <button
                    class="lemma-link"
                    data-lemma="${row.lemma}">
                    ${row.lemma}
                </button>
            </td>

            <td>${row.language}</td>

            <td>${row.count.toLocaleString()}</td>
        `;

        const button = tr.querySelector(".lemma-link");

        button.addEventListener("click", () => {
            openOccurrences(
                row.lemma,
                urlInput.value.trim()
            );
        });

        tableBody.appendChild(tr);
    });

    pageInfo.textContent =
        `Resultaat ${start + 1}–${end} van ${rows.length.toLocaleString()} leenwoorden`;

    previousButton.disabled = currentPage === 0;
    nextButton.disabled = end >= rows.length;
}