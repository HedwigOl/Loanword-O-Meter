// occurrences.js

let selectedLemma = null;
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
        loadOccurrences(selectedLemma);
    }
});

occNext.addEventListener("click", () => {
    occurrencePage++;
    loadOccurrences(selectedLemma);
});

// Open occurrences panel
export function openOccurrences(lemma) {

    selectedLemma = lemma;
    occurrencePage = 0;

    occurrenceTitle.textContent =
        `Voorkomens van "${lemma}"`;

    occurrencePanel.classList.remove("hidden");

    loadOccurrences(lemma);
}


// Load occurrences from BlackLab
async function loadOccurrences(lemma) {

    const baseUrl =
        "https://corpora.ato2.ivdnt.org/blacklab-server/leenwoorden/hits";

    const url = new URL(baseUrl);

    url.searchParams.set(
        "first",
        occurrencePage * occurrencePageSize
    );

    url.searchParams.set(
        "number",
        occurrencePageSize
    );

    url.searchParams.set(
        "patt",
        `<term lemma="${lemma}"/>`
    );

    url.searchParams.set(
        "adjusthits",
        "true"
    );

    url.searchParams.set(
        "withspans",
        "false"
    );

    url.searchParams.set(
        "outputformat",
        "json"
    );

    // Use local proxy
    const proxyUrl = url.toString().replace(
        "https://corpora.ato2.ivdnt.org",
        "/blacklab"
    );

    console.log("Occurrence request:", proxyUrl);

    try {
        const response = await fetch(proxyUrl);

        if (!response.ok) {
            throw new Error(
                `${response.status} ${response.statusText}`
            );
        }

        const json = await response.json();

        console.log("Occurrence JSON:", json);

        renderOccurrences(json.hits || []);

        updateOccurrenceNavigation(
            json.summary
        );


    } catch (error) {

        console.error(error);

        occurrenceList.innerHTML =
            `<p>Could not load occurrences.</p>`;
    }
}

function renderOccurrences(hits) {

    occurrenceList.innerHTML = "";

    hits.forEach(hit => {

        const left = (hit.left?.word || []).join(" ");
        const keyword = (hit.match?.word || []).join(" ");
        const right = (hit.right?.word || []).join(" ");
        const row = document.createElement("div");

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