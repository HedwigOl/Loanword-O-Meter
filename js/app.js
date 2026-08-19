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

async function fetchJson(url) {

    const parsedUrl = new URL(url);

    parsedUrl.pathname =
        parsedUrl.pathname.replace(/\/+/g, "/");

    const requestUrl = getRequestUrl(parsedUrl);

    const response = await fetch(requestUrl);

    if (!response.ok) {
        throw new Error(
            `${response.status} ${response.statusText}`
        );
    }

    return response.json();
}

// Load and process the selected JSON file
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

        // Get the general corpus
        console.log("ORIGINAL URL:", url);

        const json = await fetchJson(url);

        const numberOfGroups =
            await getNumberOfGroups(url);

        currentCorpus =
            parseBlackLab(json, numberOfGroups);


        // Get unambiguous loanwords (hom=false)
        const homFalseUrl =
            createHomUrl(url, "false");

        console.log(
            "HOM=FALSE URL:",
            homFalseUrl.href
        );

        const homFalseJson =
            await fetchJson(homFalseUrl);

        const homFalseCorpus =
            parseBlackLab(
                homFalseJson,
                numberOfGroups
            );

        currentHomFalseCorpus =
            homFalseCorpus;


        // Get ambiguous loanwords (hom=true)
        const homTrueUrl =
            createHomUrl(url, "true");

        console.log(
            "HOM=TRUE URL:",
            homTrueUrl.href
        );

        const homTrueJson =
            await fetchJson(homTrueUrl);

        const ambiguousLemmas =
            getAmbiguousLemmas(homTrueJson);

        console.log(
            "AMBIGUOUS LEMMAS:",
            ambiguousLemmas
        );


        // Check that the corpus contains loanwords
        if (currentCorpus.rows.length === 0) {
            throw new Error("No loanword groups found.");
        }


        // Prepare chart data
        currentChartCorpus =
            createChartCorpus(
                currentCorpus,
                ambiguousLemmas
            );


        // Reset pagination
        currentPage = 0;


        // Calculate statistics
        const statistics =
            calculateStatistics(
                homFalseCorpus.rows,
                currentCorpus.corpus,
                currentCorpus.rows
            );


        // Update interface
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

    const languageByLemma = new Map();

    generalRows.forEach(row => {
        languageByLemma.set(
            row.lemma.toLowerCase(),
            row.language
        );
    });

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