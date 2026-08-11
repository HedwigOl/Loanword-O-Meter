// occurrences.js

import { getProductionCorpusUrl } from "./app.js";

let selectedLemma = null;
let selectedCorpusUrl = null;
let occurrencePage = 0;
const occurrencePageSize = 10;

// HTML elements
const occurrencePanel  = document.getElementById("occurrencePanel");
const occurrenceTitle  = document.getElementById("occurrenceTitle");
const occurrenceList   = document.getElementById("occurrenceList");
const closeOccurrences = document.getElementById("closeOccurrences");
const occPrev = document.getElementById("occPrev");
const occNext = document.getElementById("occNext");
const occPageInfo = document.getElementById("occPageInfo");

// Close panel
closeOccurrences.addEventListener("click", () => {
    occurrencePanel.classList.add("hidden");
});

// Navigation
occPrev.addEventListener("click", () => {
    if (occurrencePage > 0) {
        occurrencePage--;
        loadOccurrences(
            selectedLemma,
            selectedCorpusUrl
        );
    }
});

occNext.addEventListener("click", () => {
    occurrencePage++;
    loadOccurrences(
        selectedLemma,
        selectedCorpusUrl
    );
});

// Open occurrences panel
export function openOccurrences(lemma, corpusUrl) {
    selectedLemma = lemma;
    selectedCorpusUrl = corpusUrl;
    occurrencePage = 0;

    occurrenceTitle.textContent =
        `Voorkomens van "${lemma}"`;

    occurrencePanel.classList.remove("hidden");

    loadOccurrences(lemma, corpusUrl);
}

async function loadOccurrences(lemma, corpusUrl) {

    if (!corpusUrl) {
        console.error("No corpus URL provided.");
        return;
    }

    const url = new URL(corpusUrl);

    // Pagination
    url.searchParams.set(
        "first",
        String(occurrencePage * occurrencePageSize)
    );

    url.searchParams.set(
        "number",
        String(occurrencePageSize)
    );

    // Search for this lemma
    url.searchParams.set(
        "patt",
        `<term lemma="${lemma}"/>`
    );

    // Occurrence search should NOT be grouped
    url.searchParams.delete("group");
    url.searchParams.delete("sort");
    url.searchParams.delete("op");
    url.searchParams.delete("subcorpussize");

    url.searchParams.set("adjusthits", "true");
    url.searchParams.set("withspans", "false");
    url.searchParams.set("outputformat", "json");

    // Local development: use the proxy
// Production: request BlackLab directly
    const requestUrl =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
            ? "/blacklab" + url.pathname + url.search
            : url.href;

    console.log("Occurrence request:", requestUrl);

    try {
        const response = await fetch(requestUrl);

        if (!response.ok) {
            const errorText = await response.text();

            console.error(
                "Occurrence request failed:",
                response.status,
                errorText
            );

            throw new Error(
                `${response.status} ${response.statusText}`
            );
        }

        const json = await response.json();

        console.log("Occurrence JSON:", json);

        renderOccurrences(json.hits || []);

        updateOccurrenceNavigation(json.summary);

    } catch (error) {
        console.error(error);

        occurrenceList.innerHTML =
            `<p>Could not load occurrences.</p>`;
    }
}

function renderOccurrences(hits) {

    occurrenceList.innerHTML = "";

    hits.forEach(hit => {

        const left =
            (hit.left?.word || []).join(" ");

        const keyword =
            (hit.match?.word || []).join(" ");

        const right =
            (hit.right?.word || []).join(" ");

        const row =
            document.createElement("div");

        row.className = "occurrence-row";

        row.innerHTML = `
            <div class="left-context">${left}</div>
            <div class="keyword">${keyword}</div>
            <div class="right-context">${right}</div>
        `;

        occurrenceList.appendChild(row);
    });
}


// Update previous/next buttons
function updateOccurrenceNavigation(summary) {
    const total =
        summary?.numberOfHits || 0;

    const start =
        occurrencePage * occurrencePageSize + 1;

    const end =
        Math.min(
            start + occurrencePageSize - 1,
            total
        );

    occPageInfo.textContent =
        `${start}–${end} van ${total}`;

    occPrev.disabled =
        occurrencePage === 0;

    occNext.disabled =
        end >= total;
}