// explorer.js

import { openOccurrences } from "./occurrences.js";

const PAGE_SIZE = 10;

let container;
let searchBox;
let languages = [];
let searchTerm = "";
let urlForOccurrences;
const expanded = new Set();
const pageIndex = new Map();

/* initialise */
export function initialiseExplorer() {
    container = document.getElementById("languageTree");
    searchBox = document.getElementById("languageSearch");

    searchBox.addEventListener("input", () => {
        searchTerm = searchBox.value.trim().toLowerCase();
        renderExplorer();
    });
}

/* Build data */

export function updateExplorer(rows, _urlForOccurrences) {

    urlForOccurrences = _urlForOccurrences;
    const map = new Map();

    rows.forEach(row => {

        if (!map.has(row.language)) {
            map.set(row.language, {
                language: row.language,
                occurrences: 0,
                loanwords: []
            });
        }

        const language = map.get(row.language);

        language.occurrences += row.count;

        language.loanwords.push({
            lemma: row.lemma,
            count: row.count
        });

    });

    languages = [...map.values()];

    languages.forEach(language => {

        language.loanwords.sort((a, b) =>
            b.count - a.count ||
            a.lemma.localeCompare(b.lemma)
        );

        pageIndex.set(language.language, 0);

    });

    languages.sort((a, b) =>
        b.occurrences - a.occurrences
    );

    expanded.clear();

    renderExplorer();
}

/* Render */

function renderExplorer() {

    container.innerHTML = "";

    const visibleLanguages = languages.filter(language => {

        if (!searchTerm) return true;

        return (
            language.language.toLowerCase().includes(searchTerm) ||
            language.loanwords.some(word =>
                word.lemma.toLowerCase().includes(searchTerm)
            )
        );

    });

    visibleLanguages.forEach(language => {
        container.appendChild(createLanguage(language));
    });

}

/* Language card*/

function createLanguage(language) {

    const card = document.createElement("div");
    card.className = "language-card";

    const matchesSearch =
        searchTerm &&
        (
            language.language.toLowerCase().includes(searchTerm) ||
            language.loanwords.some(word =>
                word.lemma.toLowerCase().includes(searchTerm)
            )
        );

    const open =
        expanded.has(language.language) ||
        matchesSearch;

    const header = document.createElement("div");
    header.className = "language-header";

    header.innerHTML = `
        <div class="language-title">
            ${open ? "▼" : "▶"}
            <strong>${language.language}</strong>
        </div>

        <div class="language-summary">
            ${language.occurrences.toLocaleString()} voorkomens
            •
            ${language.loanwords.length.toLocaleString()} leenwoorden
        </div>
    `;

    header.onclick = () => {

        if (expanded.has(language.language)) {
            expanded.delete(language.language);
        } else {
            expanded.add(language.language);
        }

        renderExplorer();

    };

    card.appendChild(header);

    if (!open) return card;

    card.appendChild(
        createLoanwordTable(language, matchesSearch)
    );

    return card;
}

/* Loanword table */

function createLoanwordTable(language, searching = false) {

    const wrapper = document.createElement("div");
    wrapper.className = "language-content";

    const words = searching
        ? language.loanwords.filter(word =>
            word.lemma.toLowerCase().includes(searchTerm)
        )
        : language.loanwords;

    const page = searching
        ? 0
        : (pageIndex.get(language.language) ?? 0);

    const start = page * PAGE_SIZE;
    const end = Math.min(start + PAGE_SIZE, words.length);

    const table = document.createElement("table");

    table.innerHTML = `
        <thead>
            <tr>
                <th>Leenwoord</th>
                <th>Aantal voorkomens</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");

    words
        .slice(start, end)
        .forEach(word => {

            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td>
                    <button
                        class="lemma-link"
                        data-lemma="${word.lemma}">
                        ${word.lemma}
                    </button>
                </td>

                <td>${word.count.toLocaleString()}</td>
            `;

            tr.querySelector(".lemma-link")
                .addEventListener("click", event => {

                    // Prevent collapsing/expanding the language card
                    event.stopPropagation();

                    openOccurrences(
                        word.lemma,
 			urlForOccurrences
                        //document.getElementById("jsonUrl").value.trim()
                    );

                });

            tbody.appendChild(tr);

        });

    wrapper.appendChild(table);

    if (!searching && words.length > PAGE_SIZE) {
        wrapper.appendChild(createPagination(language));
    }

    if (searching && words.length === 0) {

        wrapper.innerHTML += `
            <p class="muted">
                No matching loanwords.
            </p>
        `;

    }

    return wrapper;

}

/* pagination*/

function createPagination(language) {

    const controls = document.createElement("div");
    controls.className = "language-pagination";

    const page = pageIndex.get(language.language) ?? 0;
    const maxPage = Math.ceil(language.loanwords.length / PAGE_SIZE) - 1;

    const previous = document.createElement("button");
    previous.className = "page-button";
    previous.textContent = "◀ Vorige";
    previous.disabled = page === 0;

    previous.onclick = event => {

        event.stopPropagation();

        pageIndex.set(
            language.language,
            page - 1
        );

        renderExplorer();

    };

    const info = document.createElement("span");
    info.className = "page-info";

    info.textContent =
        `${page * PAGE_SIZE + 1}–${Math.min(
            (page + 1) * PAGE_SIZE,
            language.loanwords.length
        )} van ${language.loanwords.length}`;

    const next = document.createElement("button");
    next.className = "page-button";
    next.textContent = "Volgende ▶";
    next.disabled = page >= maxPage;

    next.onclick = event => {

        event.stopPropagation();

        pageIndex.set(
            language.language,
            page + 1
        );

        renderExplorer();

    };

    controls.append(
        previous,
        info,
        next
    );

    return controls;

}

export function clearExplorerSearch() {

    searchTerm = "";

    if (searchBox) {
        searchBox.value = "";
    }

    renderExplorer();

}

export function collapseAllLanguages() {

    expanded.clear();

    renderExplorer();

}

export function expandAllLanguages() {

    languages.forEach(language => {

        expanded.add(language.language);

    });

    renderExplorer();

}

export function getLanguageCount() {

    return languages.length;

}

export function getOccurrenceCount(languageName) {

    const language = languages.find(
        language => language.language === languageName
    );

    return language
        ? language.occurrences
        : 0;

}

export function getLoanwordCount(languageName) {

    const language = languages.find(
        language => language.language === languageName
    );

    return language
        ? language.loanwords.length
        : 0;

}
