import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "b", "i", "u", "s",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "blockquote", "code", "pre",
  "a", "span", "div",
  "input", // for TipTap task list checkboxes
];

const ALLOWED_ATTR = ["href", "target", "rel", "class", "data-type", "data-checked", "type", "checked", "disabled"];

export function useSanitizeHtml() {
  function sanitize(dirty: string | null | undefined): string {
    if (!dirty) return "";
    return DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
    });
  }

  return { sanitize };
}
