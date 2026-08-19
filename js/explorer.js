// explorer.js

import { openOccurrences } from "./occurrences.js";

const PAGE_SIZE = 10;

let container;
let searchBox;
let languages = [];
let searchTerm = "";

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

export function updateExplorer(
    homFalseRows,
    generalRows,
    ambiguousLemmas
) {

    const languageMap = new Map();

    // --------------------------------------------------
    // Build lookup: lemma -> possible languages
    // from the general corpus
    // --------------------------------------------------

    const languageLookup = new Map();

    generalRows.forEach(row => {

        const lemma = row.lemma.toLowerCase();

        if (!languageLookup.has(lemma)) {
            languageLookup.set(lemma, []);
        }

        const languagesForLemma =
            languageLookup.get(lemma);

        if (
            !languagesForLemma.some(
                language => language.language === row.language
            )
        ) {
            languagesForLemma.push({
                language: row.language,
                count: row.count
            });
        }

    });


    // --------------------------------------------------
    // Normal languages
    // ONLY hom=false
    // --------------------------------------------------

    homFalseRows.forEach(row => {

        const lemma = row.lemma.toLowerCase();

        const possibleLanguages =
            languageLookup.get(lemma) ?? [];

        const language =
            possibleLanguages.length > 0
                ? possibleLanguages[0].language
                : "Unknown";

        if (!languageMap.has(language)) {
            languageMap.set(language, {
                language,
                occurrences: 0,
                loanwords: []
            });
        }

        const languageGroup =
            languageMap.get(language);

        languageGroup.occurrences += row.count;

        languageGroup.loanwords.push({
            lemma: row.lemma,
            count: row.count
        });

    });


    // --------------------------------------------------
    // Ambiguous loanwords
    // Group them by POSSIBLE LANGUAGE
    // --------------------------------------------------

    const ambiguousLanguageMap = new Map();

    generalRows.forEach(row => {

        const lemma = row.lemma.toLowerCase();

        if (!ambiguousLemmas.has(lemma)) {
            return;
        }

        const language = row.language;

        if (!ambiguousLanguageMap.has(language)) {
            ambiguousLanguageMap.set(language, {
                language,
                occurrences: 0,
                loanwords: []
            });
        }

        const languageGroup =
            ambiguousLanguageMap.get(language);

        languageGroup.occurrences += row.count;

        languageGroup.loanwords.push({
            lemma: row.lemma,
            count: row.count
        });

    });


    // --------------------------------------------------
    // Sort normal language groups
    // --------------------------------------------------

    languages = [...languageMap.values()];

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


    // --------------------------------------------------
    // Create special "Ambigue leenwoorden" category
    // --------------------------------------------------

    const ambiguousLanguages =
        [...ambiguousLanguageMap.values()];

    ambiguousLanguages.forEach(language => {

        language.loanwords.sort((a, b) =>
            b.count - a.count ||
            a.lemma.localeCompare(b.lemma)
        );

        pageIndex.set(
            `ambiguous:${language.language}`,
            0
        );

    });

    ambiguousLanguages.sort((a, b) =>
        b.occurrences - a.occurrences
    );


    const ambiguousCategory = {
        language: "Ambigue leenwoorden",
        occurrences: ambiguousLanguages.reduce(
            (sum, language) =>
                sum + language.occurrences,
            0
        ),
        loanwords: ambiguousLanguages
    };


    // Add ambiguous category LAST
    languages.push(ambiguousCategory);

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
                language.language === "Ambigue leenwoorden"
                    ? word.loanwords.some(loanword =>
                        loanword.lemma
                            .toLowerCase()
                            .includes(searchTerm)
                    )
                    : word.lemma
                        .toLowerCase()
                        .includes(searchTerm)
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
            ${language.language === "Ambigue leenwoorden"
                ? language.loanwords.length.toLocaleString() + " talen"
                : language.loanwords.length.toLocaleString() + " leenwoorden"
            }
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


    // Special rendering for ambiguous loanwords
    if (language.language === "Ambigue leenwoorden") {

        card.appendChild(
            createAmbiguousLanguages(language)
        );

    } else {

        card.appendChild(
            createLoanwordTable(
                language,
                matchesSearch
            )
        );

    }

    return card;
}

function createAmbiguousLanguages(category) {

    const wrapper = document.createElement("div");
    wrapper.className = "language-content";

    category.loanwords.forEach(language => {

        const languageKey =
            `ambiguous:${language.language}`;

        const open =
            expanded.has(languageKey);

        const matchesSearch =
            searchTerm &&
            (
                language.language
                    .toLowerCase()
                    .includes(searchTerm) ||
                language.loanwords.some(word =>
                    word.lemma
                        .toLowerCase()
                        .includes(searchTerm)
                )
            );

        const languageCard =
            document.createElement("div");

        languageCard.className =
            "language-card ambiguous-language-card";


        // Possible language header
        const header =
            document.createElement("div");

        header.className =
            "language-header";

        header.innerHTML = `
            <div class="language-title">
                ${open ? "▼" : "▶"}
                <strong>${language.language}</strong>
            </div>

            <div class="language-summary">
                ${language.occurrences.toLocaleString()}
                voorkomens
                •
                ${language.loanwords.length.toLocaleString()}
                leenwoorden
            </div>
        `;

        header.onclick = event => {

            event.stopPropagation();

            if (expanded.has(languageKey)) {
                expanded.delete(languageKey);
            } else {
                expanded.add(languageKey);
            }

            renderExplorer();

        };

        languageCard.appendChild(header);


        // Show words when language is expanded
        if (open || matchesSearch) {

            languageCard.appendChild(
                createLoanwordTable(
                    language,
                    matchesSearch
                )
            );

        }

        wrapper.appendChild(languageCard);

    });

    return wrapper;
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

                    event.stopPropagation();

                    openOccurrences(
                        word.lemma,
                        document.getElementById("jsonUrl").value.trim()
                    );

                });

            tbody.appendChild(tr);


            // --------------------------------------------------
            // For ambiguous words, show possible languages
            // --------------------------------------------------

            if (
                language.language === "Ambigue leenwoorden" &&
                word.languages?.length
            ) {

                const languageRow =
                    document.createElement("tr");

                languageRow.className =
                    "ambiguous-language-row";

                const languageCell =
                    document.createElement("td");

                languageCell.colSpan = 2;

                languageCell.innerHTML = `
                    <div class="ambiguous-languages">
                        <strong>Mogelijke talen:</strong>
                        ${word.languages
                            .map(item =>
                                `<span class="ambiguous-language">
                                    ${item.language}
                                </span>`
                            )
                            .join(" • ")}
                    </div>
                `;

                languageRow.appendChild(languageCell);

                tbody.appendChild(languageRow);
            }

        });

    wrapper.appendChild(table);

    if (!searching && words.length > PAGE_SIZE) {
        wrapper.appendChild(
            createPagination(language)
        );
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
