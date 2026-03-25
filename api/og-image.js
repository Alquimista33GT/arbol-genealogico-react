function svgEscape(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export default function handler(req, res) {
  const { name = "Árbol familiar", profile = "usuario" } = req.query || {};

  const title = svgEscape(`${profile} acaba de crear su árbol`);
  const subtitle = svgEscape(`Mira si eres su familiar en ${name}`);
  const badge = svgEscape("Akna Árbol Genealógico");

  const svg = `
  <svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="630" rx="32" fill="#F3FBF6"/>
    <rect x="34" y="34" width="1132" height="562" rx="28" fill="#FFFFFF" stroke="#D9EBDD" stroke-width="4"/>
    <rect x="72" y="72" width="270" height="66" rx="33" fill="#EAF7EE"/>
    <text x="207" y="114" text-anchor="middle" font-size="30" font-family="Arial, sans-serif" font-weight="700" fill="#177545">${badge}</text>

    <text x="72" y="220" font-size="62" font-family="Arial, sans-serif" font-weight="800" fill="#163A27">${title}</text>
    <text x="72" y="300" font-size="34" font-family="Arial, sans-serif" font-weight="500" fill="#5F7A69">${subtitle}</text>

    <rect x="760" y="120" width="150" height="110" rx="24" fill="#F7FBF8" stroke="#DCEADE"/>
    <rect x="930" y="120" width="170" height="110" rx="24" fill="#F7FBF8" stroke="#DCEADE"/>
    <rect x="845" y="315" width="170" height="110" rx="24" fill="#F7FBF8" stroke="#DCEADE"/>

    <path d="M835 175 C875 175, 890 175, 930 175" stroke="#21A45D" stroke-width="8" stroke-linecap="round"/>
    <path d="M930 175 C930 235, 930 255, 930 315" stroke="#21A45D" stroke-width="8" stroke-linecap="round"/>
    <path d="M930 315 C900 315, 885 315, 860 315" stroke="#21A45D" stroke-width="8" stroke-linecap="round"/>

    <circle cx="810" cy="175" r="24" fill="#DFF3E5"/>
    <circle cx="980" cy="175" r="24" fill="#DFF3E5"/>
    <circle cx="895" cy="370" r="24" fill="#DFF3E5"/>

    <text x="810" y="183" text-anchor="middle" font-size="24" font-family="Arial, sans-serif" font-weight="800" fill="#177545">A</text>
    <text x="980" y="183" text-anchor="middle" font-size="24" font-family="Arial, sans-serif" font-weight="800" fill="#177545">K</text>
    <text x="895" y="378" text-anchor="middle" font-size="24" font-family="Arial, sans-serif" font-weight="800" fill="#177545">N</text>

    <text x="72" y="520" font-size="26" font-family="Arial, sans-serif" font-weight="700" fill="#177545">Comparte tu historia familiar con miniatura social</text>
  </svg>
  `;

  res.setHeader("Content-Type", "image/svg+xml");
  res.status(200).send(svg);
}
