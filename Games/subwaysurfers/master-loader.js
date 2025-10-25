"use strict";

var scripts = document.getElementsByTagName("script");
var scriptUrl = scripts[scripts.length - 1].src;
var root = scriptUrl.split("master-loader.js")[0];

// Supported loaders
var loaders = {
    unity: "unity.js",
    "unity-beta": "unity-beta.js",
    "unity-2020": "unity-2020.js"
};

// Check config
if (!window.config) throw Error("window.config not found");

// Get loader
var loader = loaders[window.config.loader];
if (!loader) throw Error('Loader "' + window.config.loader + '" not found');

// Pick correct Unity loader based on version
if (!window.config.unityWebglLoaderUrl) {
    var versionSplit = window.config.unityVersion ? window.config.unityVersion.split(".") : [];
    var year = versionSplit[0];
    var minor = versionSplit[1];

    switch (year) {
        case "2019":
            window.config.unityWebglLoaderUrl = (minor === "1") ? "UnityLoader.2019.1.js" : "UnityLoader.2019.2.js";
            break;
        default:
            window.config.unityWebglLoaderUrl = "UnityLoader.js";
            break;
    }
}

// ✅ Directly load Unity without SDK
var unityScript = document.createElement("script");
unityScript.src = root + loader;
document.body.appendChild(unityScript);
