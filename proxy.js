const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();
const PORT = 3000;

// Serve the dashboard
app.use(express.static(__dirname));

// Proxy BlackLab
app.use(
    "/blacklab",
    createProxyMiddleware({
        target: "https://corpora.ato2.ivdnt.org",
        changeOrigin: true,
        secure: true,
        logLevel: "debug",

        pathRewrite: {
            "^/blacklab": ""
        }
    })
);

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});