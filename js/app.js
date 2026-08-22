// app.js

import { parseBlackLab }                      from "./parser.js";
import { calculateStatistics }                from "./statistics.js";
import { updateDashboard, updateStatus }      from "./ui.js";
import { initialiseCharts, updateCharts }     from "./charts.js";
import { initialiseExplorer, updateExplorer } from "./explorer.js";
import { openOccurrences }                    from "./occurrences.js";
import { blacklab_server }                    from "./blacklab_server.js";

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
let currentCorpusUrl = null;
let currentHomFalseCorpus = null;
let currentChartCorpus = null;
let currentMode = "token";

const pageSize = 10;
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

if (!blacklab_server.isLocalDevelopment()) {
    loaderSection.style.display = "none";
    loadCorpus();
}

// Switch to token mode
document
    .getElementById("tokenTab")
    .addEventListener("click", () => {

        if (!currentCorpus) return;

        currentMode = "token";

        setActiveTab();

        updateCharts(
            currentChartCorpus,
            currentMode
        );
    });

// Switch to type mode
document
    .getElementById("typeTab")
    .addEventListener("click", () => {

        if (!currentCorpus) return;

        currentMode = "type";

        setActiveTab();

        updateCharts(
            currentChartCorpus,
            currentMode
        );
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
        (currentHomFalseCorpus.rows.length - 1) /
        pageSize
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
        .classList.toggle(
            "active",
            currentMode === "token"
        );

    document
        .getElementById("typeTab")
        .classList.toggle(
            "active",
            currentMode === "type"
        );
}

function createChartCorpus(
    corpus,
    ambiguousLemmas
) {

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

        const lemmaProperty =
            (group.properties ?? []).find(
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

// Load and process the selected corpus
async function loadCorpus() {

    let url;

    try {

        url = blacklab_server.getCorpusUrl(
            urlInput.value
        );

        currentCorpusUrl = url;

    } catch (error) {

        updateStatus(error.message);

        return;
    }

    updateStatus("Loading corpus...");

    try {

        console.log(
            "ORIGINAL URL:",
            url
        );

        const {
            json,
            numberOfGroups,
            homFalseJson,
            homTrueJson
        } = await blacklab_server.loadCorpusData(
            url
        );


        // General corpus
        currentCorpus =
            parseBlackLab(
                json,
                numberOfGroups
            );


        // Unambiguous loanwords
        const homFalseCorpus =
            parseBlackLab(
                homFalseJson,
                numberOfGroups
            );

        currentHomFalseCorpus =
            homFalseCorpus;


        // Ambiguous loanwords
        const ambiguousLemmas =
            getAmbiguousLemmas(
                homTrueJson
            );

        console.log(
            "AMBIGUOUS LEMMAS:",
            ambiguousLemmas
        );


        // Check that the corpus contains loanwords
        if (currentCorpus.rows.length === 0) {

            throw new Error(
                "No loanword groups found."
            );
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
        updateDashboard(
            statistics
        );

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
            "Could not load corpus: " +
            error.message
        );
    }
}

// Create table of top occurring loanwords
function renderTopWords(
    loanwordRows,
    generalRows
) {

    if (!currentCorpus) return;

    const languageByLemma =
        new Map();

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
        .sort(
            (a, b) =>
                b.count - a.count
        );

    const start =
        currentPage * pageSize;

    const end =
        Math.min(
            start + pageSize,
            rows.length
        );

    tableBody.innerHTML = "";

    rows
        .slice(start, end)
        .forEach((row, index) => {

            const tr =
                document.createElement("tr");

            tr.innerHTML = `
                <td>
                    ${start + index + 1}
                </td>

                <td>
                    <button
                        class="lemma-link"
                        data-lemma="${row.lemma}">
                        ${row.lemma}
                    </button>
                </td>

                <td>
                    ${row.language}
                </td>

                <td>
                    ${row.count.toLocaleString()}
                </td>
            `;

            const button =
                tr.querySelector(
                    ".lemma-link"
                );

            button.addEventListener(
                "click",
                () => {

                    openOccurrences(
                        row.lemma,
                        currentCorpusUrl
                    );
                }
            );

            tableBody.appendChild(tr);
        });

    pageInfo.textContent =
        `Resultaat ${start + 1}–${end} van ${rows.length.toLocaleString()} leenwoorden`;

    previousButton.disabled =
        currentPage === 0;

    nextButton.disabled =
        end >= rows.length;
}