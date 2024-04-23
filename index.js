//dependencies
const fs = require("fs");
const https = require("https");
const url = require("url");
const cheerio = require("cheerio");
const minify = require("html-minifier").minify;

//
const fileURL = require("./input/url");
const destnation = "./input/example.html";

//Download a File from Url and save it as a input file
const downloadFile = async (fileUrl, desinationPath) => {
    return new Promise((resolve, reject) => {
        const parsedUrl = url.parse(fileUrl);
        const options = {
            hostname: parsedUrl.hostname,
            port: 443,
            path: parsedUrl.path,
            method: "GET",
        };
        const file = fs.createWriteStream(desinationPath);
        https
            .get(options, (res) => {
                res.pipe(file);
                file.on("finish", () => {
                    file.close(() => {
                        console.log(`File downloaded to ${desinationPath}`);
                        resolve();
                    });
                });
            })
            .on("error", (err) => {
                fs.unlink(desinationPath, () => {});
                console.error("Error downloading file: ", err);
            });
    });
};

const parseHtml = (source) => {
    console.log("Parse Function invoked");
    const htmlContent = fs.readFileSync(source, "utf-8");
    const originalHtml = cheerio.load(htmlContent);
    const minifiedHtml = minify(originalHtml.html(), {
        removeComments: true,
        collapseWhitespace: true,
    });
    // Using DOM parser since we are parsing html to JSON
    const $ = cheerio.load(minifiedHtml);
    const traverse = (node) => {
        let result = {};
        result.tag = node[0].name;
        if (node[0].attribs) {
            for (let key in node[0].attribs) {
                result[key] = node[0].attribs[key];
            }
        }

        result.children = [];
        node.children().each((_, child) => {
            result.children.push(traverse($(child)));
        });

        if (result.children.length === 0) {
            delete result.children;
        } else if (result.children.length === 1) {
            result.children = result.children[0];
        }

        const text = node.text();
        if (text.length && !result.children) result.text = text;

        if (!result.tag || result.tag === "html") return result.children;
        return result;
    };
    const parsedObj = traverse($.root());
    fs.writeFileSync("./output/parsedResult.json", JSON.stringify(parsedObj));
    return parsedObj;
};

const downloadAndParseHtml = async (fileUrl, destnation) => {
    try {
        await downloadFile(fileUrl, destnation);
        parseHtml(destnation);
    } catch (error) {
        console.log("ERR: ", error);
    }
};

downloadAndParseHtml(fileURL, destnation);
