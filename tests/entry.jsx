import React from "react";
import { createRoot } from "react-dom/client";
import App from "../proj/nibraas-al-madaaris-main/src/App.jsx";
import { installDomTranslator } from "../proj/nibraas-al-madaaris-main/src/lib/i18n.js";
import { translate, localizeHtml } from "../proj/nibraas-al-madaaris-main/src/lib/i18n.js";
window.__tr = translate; window.__lh = localizeHtml;
installDomTranslator();
createRoot(document.getElementById("root")).render(<App />);
