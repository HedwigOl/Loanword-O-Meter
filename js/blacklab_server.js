export class BlackLabServer {

    v5 = true;
    corpora() { return this.v5?"corpora":""}


    constructor({
        proxyPrefix = "/blacklab",
        localHosts = ["localhost", "127.0.0.1"]
    } = {}) {
        this.proxyPrefix = proxyPrefix;
        this.localHosts = new Set(localHosts);
    }

    isLocalDevelopment() {
        return this.localHosts.has(window.location.hostname);
    }

    getCorpusUrl(inputUrl = "") {
        if (!this.isLocalDevelopment()) {
            //alert('no proxy:'  + this.getProductionCorpusUrl())
            const url =  new URL(this.getProductionCorpusUrl());
            url.searchParams.set("patt", "<term/>");
            url.searchParams.set("outputformat", "json");
            url.searchParams.set("withspans", "true");
            url.searchParams.set("number", "500000");
            url.searchParams.set("group", "span-attribute:with-spans[term]:language:i,context:lemma:i:H");
            return url;
        }

        const url = inputUrl.trim();

        if (!url) {
            throw new Error("Please enter a JSON URL.");
        }

        return new URL(url);
    }

    getProductionCorpusUrl() {
        const corpus = document.location.href
            .replace(/.*blacklab-frontend\//, "")
            .replace(/\/.*/, "");

        return `${window.location.origin}/blacklab-server/${this.corpora()}/${encodeURIComponent(corpus)}/hits`;
    }

    async loadCorpusData(originalUrl) {
        const [json, numberOfGroups] = await Promise.all([
            this.fetchJson(originalUrl),
            this.getNumberOfGroups(originalUrl)
        ]);

        const [homFalseJson, homTrueJson] = await Promise.all([
            this.getHomGroups(originalUrl, false),
            this.getHomGroups(originalUrl, true)
        ]);

        return {
            json,
            numberOfGroups,
            homFalseJson,
            homTrueJson
        };
    }

    async getHomGroups(originalUrl, homValue) {
        const url = this.createHomUrl(originalUrl, homValue);

        console.log(
            `HOM=${String(homValue).toUpperCase()} URL:`,
            url.href
        );

        return this.fetchJson(url);
    }

    async getNumberOfGroups(originalUrl) {
        const url = new URL(originalUrl);

        url.searchParams.set("patt", "[]");
        url.searchParams.set("group", "context:lemma:i:H");
        url.searchParams.set("withspans", "false");
        url.searchParams.set("outputformat", "json");
        url.searchParams.delete("sort");

        console.log(
            "GROUPS URL:",
            this.getRequestUrl(url)
        );

        const json = await this.fetchJson(url);
        console.log(json)
        if (this.v5) {
         return json.summary.results.stats.numberOfGroups;
        } else {
          if (json.summary?.numberOfGroups == null) {
            throw new Error(
                "Could not retrieve number of groups."
            );
          }

          return json.summary.numberOfGroups;
       }
    }

    createHomUrl(originalUrl, homValue) {
        const url = new URL(originalUrl);

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

        url.searchParams.set("first", "0");
        url.searchParams.set("number", "50000");

        url.searchParams.delete("sort");
        url.searchParams.delete("interface");

        return url;
    }

    async fetchJson(url) {
        const parsedUrl = new URL(url);

        parsedUrl.pathname =
            parsedUrl.pathname.replace(/\/+/g, "/");

        const requestUrl =
            this.getRequestUrl(parsedUrl);

        const response =
            await fetch(requestUrl);

        if (!response.ok) {
            throw new Error(
                `${response.status} ${response.statusText}`
            );
        }

        return response.json();
    }

    getRequestUrl(url) {
        if (this.isLocalDevelopment()) {
            return (
                this.proxyPrefix +
                url.pathname +
                url.search
            );
        }

        return url.href;
    }
}

export const blacklab_server =
    new BlackLabServer();