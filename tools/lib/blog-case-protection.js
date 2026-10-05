export function maskCaseBlocks(html) {
  // Normalize only line endings and the insertion seam surrounding case sections.
  return html.replace(/\r\n/g, "\n")
    .replace(/\s*<section\b[^>]*class="[^"]*\b(?:blog-case-section|home-work-case-section|work-case-list-section)\b[^"]*"[\s\S]*?<\/section>/g, "\n")
    .replace(/\n[ \t]*\n(?:[ \t]*\n)*/g, "\n");
}
