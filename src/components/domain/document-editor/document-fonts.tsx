"use client";

import { useEffect } from "react";
import { DOCUMENT_GOOGLE_FONTS_HREF } from "./fonts";

const LINK_ID = "elevates-document-editor-fonts";

/** Loads the Document Editor Google Fonts pack once into document head. */
export function DocumentFonts() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(LINK_ID)) return;
    const link = document.createElement("link");
    link.id = LINK_ID;
    link.rel = "stylesheet";
    link.href = DOCUMENT_GOOGLE_FONTS_HREF;
    document.head.appendChild(link);
  }, []);

  return null;
}
