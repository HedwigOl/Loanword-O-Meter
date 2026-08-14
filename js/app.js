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
const blsApiVersion = 'v4';
// Application state
let currentCorpus = null;
let currentMode   = "token";

const pageSize  = 10;
let currentPage = 0;
let urlForOccurrences;
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
    updateCharts(currentCorpus, currentMode);
});

// Switch to type mode
document.getElementById("typeTab").addEventListener("click", () => {
    if (!currentCorpus) return;

    currentMode = "type";
    setActiveTab();
    updateCharts(currentCorpus, currentMode);
});

// Previous table page
previousButton.addEventListener("click", () => {
    if (currentPage > 0) {
        currentPage--;
        renderTopWords();
    }
});

// Next table page
nextButton.addEventListener("click", () => {
    const maxPage = Math.floor((currentCorpus.rows.length - 1) / pageSize);

    if (currentPage < maxPage) {
        currentPage++;
        renderTopWords();
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

export function getProductionCorpusUrl() {
    const corpus = document.location.href
        .replace(/.*blacklab-frontend\//, "")
        .replace(/\/.*/, "");

    return `${window.location.origin}/blacklab-server/${encodeURIComponent(corpus)}/hits`;
}

async function getNumberOfGroups(originalUrl) {
    let url = originalUrl; // new URL(originalUrl);
    url.pathname = url.pathname.replace("%3A", ':');
    url.searchParams.set("patt", "[]");
    url.searchParams.set("group", "context:lemma:i:H");
    url.searchParams.set("withspans", "false");
    url.searchParams.set("outputformat", "json");
    url.searchParams.set("rid", self.crypto.randomUUID()); 
    url.searchParams.delete("sort");

    // Make sure there are no accidental double slashes in the path
    url.pathname = url.pathname.replace(/\/+/g, "/");

    if (useProxy())
    { 
      const proxyUrl =
          "/blacklab" +
          url.pathname +
           url.search;

       url = proxyUrl;
       console.log("GROUPS URL (with proxy):", proxyUrl);
    }

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Could not retrieve number of groups.");
    }

    const json = await response.json();
    console.log(json);
    return json.summary.numberOfGroups;
}


function useProxy() {
      return  (window.location.hostname == "localhost" || window.location.hostname == "127.0.0.1")

}
// Load and process the selected JSON file
async function loadCorpus() {

    let url;

    if (!useProxy()) {
        url = new URL(getProductionCorpusUrl());
        url.searchParams.set("patt", "<term/>");
        url.searchParams.set("outputformat", "json");
        url.searchParams.set("withspans", "true");
        url.searchParams.set("number", "500000");
        url.searchParams.set("group", "span-attribute:with-spans[term]:language:i,context:lemma:i:H");
        // url.searchParams.set("adjusthits", "true");
        // url = url.toString();
    } else {
        url = urlInput.value.trim();
        url = new URL(url);
        if (!url) {
            updateStatus("Please enter a JSON URL.");
            return;
        }
    }

    urlForOccurrences = url;
    updateStatus("Loading corpus...");


    try {
        // Parse the original BlackLab URL
        const parsedUrl = url;

        // Remove accidental double slashes from the path
        parsedUrl.pathname =
            parsedUrl.pathname.replace(/\/+/g, "/");

        const requestUrl = getRequestUrl(parsedUrl);

        console.log("ORIGINAL URL:", url);
        console.log("REQUEST URL:", requestUrl);

        const response = await fetch(requestUrl);

        if (!response.ok) {
            throw new Error(
                `${response.status} ${response.statusText}`
            );
        }

        const json = await response.json();

        console.log(json);
        const numberOfGroups =
            await getNumberOfGroups(url);

        currentCorpus =
            parseBlackLab(json, numberOfGroups);

        if (currentCorpus.rows.length === 0) {
            throw new Error("No loanword groups found.");
        }

        currentPage = 0;

        // Calculate dashboard statistics
        const statistics = calculateStatistics(
            currentCorpus.rows,
            currentCorpus.corpus
        );

        // Update the interface
        updateDashboard(statistics);
        updateCharts(currentCorpus, currentMode);
        updateExplorer(currentCorpus.rows, urlForOccurrences);
        renderTopWords();

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

// Display the current page of the table
function renderTopWords() {

    if (!currentCorpus) return;

    const rows = [...currentCorpus.rows]
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
            console.log("occurrence URL:" + urlForOccurrences.toString());
            openOccurrences(row.lemma, urlForOccurrences) // urlInput.value.trim());
        });

        tableBody.appendChild(tr);

    });

    // Update page information
    pageInfo.textContent =
        `Resultaat ${start + 1}–${end} van ${rows.length.toLocaleString()} leenwoorden`;

    // Enable or disable navigation buttons
    previousButton.disabled = currentPage === 0;
    nextButton.disabled = end >= rows.length;
}
