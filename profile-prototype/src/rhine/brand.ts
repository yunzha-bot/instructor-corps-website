import { REFERENCE_MODE } from "./corps";
// One shared mark for the interface and the printed archive label.
const paths = `<path d="M156 75C127 48 103 15 70 15C37 15 15 39 15 70S38 128 70 128C103 128 127 96 176 52M155 75C182 99 208 128 240 128C273 128 295 105 295 73S273 15 240 15C221 15 207 23 192 38" fill="none" stroke="currentColor" stroke-width="26"/><path d="M44 70h50M69 45v50M219 70h44" fill="none" stroke="currentColor" stroke-width="15"/>`;
// Local document identity. One folded sheet with three inset lines, built from native SVG.
export const documentContour = "M109 12H171L203 44V132H109Z";
export const documentSymbol = `<g class="doc-sheet">
  <path class="doc-face" fill="currentColor" fill-rule="evenodd" d="${documentContour} M123 59H186V64H123Z M123 78H186V83H123Z M123 97H166V102H123Z M172 17V43H198Z"/>
  <path class="doc-mass" fill="currentColor" opacity="0" d="${documentContour}"/>
  </g>`;
export const labelMarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 310 145" color="#171713">${REFERENCE_MODE ? paths : documentSymbol}</svg>`;
export const logo = REFERENCE_MODE ? `<svg viewBox="0 0 310 185" aria-label="Rhine Lab" role="img">${paths}<text x="165" y="174" text-anchor="middle" font-family="MiSans,sans-serif" font-size="16" font-weight="700" letter-spacing="22">RHINE·LAB</text></svg>` : `<svg class="document-mark" data-animate viewBox="0 0 310 185" aria-label="教官大队文档标识" role="img">${documentSymbol}<text class="doc-wordmark" x="156" y="172" text-anchor="middle" fill="currentColor" font-family="MiSans,sans-serif" font-size="13" font-weight="600" letter-spacing="3">INSTRUCTOR CORPS</text></svg>`;
// The same Bezier contour, continuous for the opening's moving draw/erase ends.
// Its small printed gap is animated with stroke dashes, not baked into the path.
export const bootMarkContour =
  "M295 73C295 41 273 15 240 15C221 15 207 23 192 38C186 43 181 47 176 52C127 96 103 128 70 128C38 128 15 101 15 70C15 39 37 15 70 15C103 15 127 48 156 75C182 99 208 128 240 128C273 128 295 105 295 73Z";

// Optical spacing for this fixed wordmark, measured from the reference glyphs.
const analysisPositions = [2, 28, 55, 81, 103, 129, 154, 166];
export const brandHeading = REFERENCE_MODE ? `<h1>RHINE LAB</h1><div>SYNTHESIZE INFORMATION</div><p><span class="brand-analysis" role="img" aria-label="ANALYSIS">${[..."ANALYSIS"].map((letter, i) => `<span aria-hidden="true" style="left:${analysisPositions[i]}px">${letter}</span>`).join("")}</span> <b>OS</b></p>` : `<h1>教官大队</h1><div>INSTRUCTOR CORPS</div><p><span class="brand-analysis" aria-label="ANALYSIS">${[..."ANALYSIS"].map((letter, i) => `<span aria-hidden="true" style="left:${analysisPositions[i]}px">${letter}</span>`).join("")}</span> <b>OS</b></p>`;
