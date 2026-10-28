import { defineMcp } from "@lovable.dev/mcp-js";
import listPagesTool from "./tools/list-pages";
import getPageTool from "./tools/get-page";
import searchContentTool from "./tools/search-content";

export default defineMcp({
  name: "tcs-webseite-mcp",
  title: "TCS Webseite MCP",
  version: "0.1.0",
  instructions:
    "Nur-Lese-Tools für die TCS Unternehmenswebseite (CMS-Light). Nutze `list_pages`, um Seiten zu finden, `get_page` für Details inkl. Sections/Felder und `search_content` für Volltextsuche über Feldwerte.",
  tools: [listPagesTool, getPageTool, searchContentTool],
});
