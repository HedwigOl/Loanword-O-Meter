const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();

// Serve your dashboard files
app.use(express.static(__dirname));

// Proxy all requests starting with /blacklab
app.use(
    "/blacklab",
    createProxyMiddleware({
        target: "https://corpora.ato2.ivdnt.org",
        changeOrigin: true,
        secure: true,
        logLevel: "debug"
    })
);

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});