// parser.js

// Convert the BlackLab JSON response into a format to be used by the rest of the application.
export function parseBlackLab(json, totalTypes = 0) {

    const groups = json.hitGroups || [];

    const rows = new Array(groups.length);
    const tokenDistribution = new Map();
    const typeDistribution = new Map();

    // Determine once where the language and lemma are stored
    let languageIndex = -1;
    let lemmaIndex = -1;

    if (groups.length > 0 && groups[0].properties) {
        const firstProperties = groups[0].properties;

        for (let i = 0; i < firstProperties.length; i++) {
            const name = firstProperties[i].name;

            if (name.includes("language")) {
                languageIndex = i;
            } else if (name.includes("lemma")) {
                lemmaIndex = i;
            }
        }
    }

    // Parse all groups
    for (let i = 0; i < groups.length; i++) {

        const group = groups[i];
        const properties = group.properties;

        const language =
            languageIndex >= 0
                ? properties[languageIndex].value
                : "Unknown";

        const lemma =
            lemmaIndex >= 0
                ? properties[lemmaIndex].value
                : "";

        const occurrences = Number(group.size) || 0;

        rows[i] = {
            language,
            lemma,
            count: occurrences
        };

        // Token distribution
        const tokenCount = tokenDistribution.get(language);
        tokenDistribution.set(
            language,
            tokenCount === undefined
                ? occurrences
                : tokenCount + occurrences
        );

        // Type distribution
        const typeCount = typeDistribution.get(language);
        typeDistribution.set(
            language,
            typeCount === undefined
                ? 1
                : typeCount + 1
        );
    }

    // Extract corpus statistics
    const corpus = {
        totalTokens:
            json.summary?.subcorpusSize?.tokens ??
            json.summary?.tokensInMatchingDocuments ??
            0,

        totalDocuments:
            json.summary?.subcorpusSize?.documents ??
            0,

        totalTypes
    };

    return {
        rows,
        corpus,
        tokenDistribution: mapToArray(tokenDistribution),
        typeDistribution: mapToArray(typeDistribution)
    };
}

// Convert a Map into an array
function mapToArray(map) {
    return Array.from(
        map,
        ([language, count]) => ({
            language,
            count
        })
    );
}