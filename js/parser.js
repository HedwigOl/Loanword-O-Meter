// parser.js

// Convert the BlackLab JSON response into a format to be used by the rest of the application.
export function parseBlackLab(json) {

    const groups = json.hitGroups || [];
    const rows = [];
    const tokenDistribution = new Map();
    const typeDistribution  = new Map();

    // Loop through every language/lemma group
    for (const group of groups) {

        let language = "Unknown";
        let lemma = "";

        // Read the language and lemma from the group properties
        for (const property of group.properties || []) {
            if (property.name.includes("language")) {
                language = property.value;
            }
            if (property.name.includes("lemma")) {
                lemma = property.value;
            }
        }

        const occurrences = Number(group.size || 0);

        // Store the individual row
        rows.push({
            language,
            lemma,
            count: occurrences
        });

        // Token-based distribution (counts all occurrences)
        tokenDistribution.set(
            language,
            (tokenDistribution.get(language) || 0) + occurrences
        );

        // Type-based distribution (counts unique lemmas)
        typeDistribution.set(
            language,
            (typeDistribution.get(language) || 0) + 1
        );

    }

    // Extract corpus statistics from the JSON file
    const corpus = {
        totalTokens:
            json.summary?.subcorpusSize?.tokens ??
            json.summary?.tokensInMatchingDocuments ??
            0,
        totalDocuments:
            json.summary?.subcorpusSize?.documents ??
            0,
        totalTypes: 10000 // Placeholder until the real value is available (TODO: get real value)
    };

    // Return all parsed data
    return {
        rows,
        corpus,
        tokenDistribution: mapToSortedArray(tokenDistribution),
        typeDistribution: mapToSortedArray(typeDistribution)
    };
}

// Convert a Map into a sorted array
function mapToSortedArray(map) {
    return [...map.entries()]
        .map(([language, count]) => ({

            language,
            count
        }))
        // Sort from highest to lowest count
        .sort((a, b) => b.count - a.count);
}