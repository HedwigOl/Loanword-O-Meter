// app.js

import { parseBlackLab } from "./parser.js";
import { calculateStatistics } from "./statistics.js";
import { updateDashboard, updateStatus } from "./ui.js";
import { initialiseCharts, updateCharts } from "./charts.js";
import { initialiseExplorer, updateExplorer } from "./explorer.js";

// Main interface elements
const loadButton = document.getElementById("loadBtn");
const urlInput = document.getElementById("jsonUrl");
const tableBody = document.getElementById("topWordsTable");
const previousButton = document.getElementById("showLessBtn");
const nextButton = document.getElementById("showMoreBtn");
const pageInfo = document.getElementById("tablePageInfo");

// Application state
let currentCorpus = null;
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

// Load and process the selected JSON file
async function loadCorpus() {

    const url = urlInput.value.trim();

    if (!url) {
        updateStatus("Please enter a JSON URL.");
        return;
    }

    updateStatus("Loading corpus...");

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`${response.status} ${response.statusText}`);
        }

        const json = await response.json();

        // Parse the BlackLab response
        currentCorpus = parseBlackLab(json);

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
        updateExplorer(currentCorpus.rows);
        renderTopWords();

        updateStatus(
            `Loaded ${currentCorpus.rows.length.toLocaleString()} loanword types.`
        );

    } catch (error) {
        console.error(error);
        updateStatus("Could not load corpus: " + error.message);
    }
}

// Create table of top occuring loanwords

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
            <td>${row.lemma}</td>
            <td>${row.language}</td>
            <td>${row.count.toLocaleString()}</td>
        `;

        tableBody.appendChild(tr);
    });

    // Update page information
    pageInfo.textContent =
        `Resultaat ${start + 1}–${end} van ${rows.length.toLocaleString()} leenwoorden`;

    // Enable or disable navigation buttons
    previousButton.disabled = currentPage === 0;
    nextButton.disabled = end >= rows.length;
}