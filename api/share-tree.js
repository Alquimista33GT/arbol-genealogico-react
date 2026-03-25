function htmlEscape(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default function handler(req, res) {
  const { data = "", name = "Árbol familiar", profile = "usuario" } = req.query || {};

  const baseUrl = `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`;
  const safeName = htmlEscape(name);
  const safeProfile = htmlEscape(profile);
  const imageUrl = `${baseUrl}/api/og-image?name=${encodeURIComponent(name)}&profile=${encodeURIComponent(profile)}`;
  const appUrl = `${baseUrl}/?view=map#tree=${encodeURIComponent(data)}`;

  const title = `${safeProfile} acaba de crear su árbol familiar`;
  const description = `Mira si eres su familiar en ${safeName} dentro de Akna Árbol Genealógico.`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(`<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${baseUrl}${req.url}" />
    <meta property="og:site_name" content="Akna Árbol Genealógico" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="Vista previa del árbol compartido de ${safeProfile}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${imageUrl}" />
    <meta http-equiv="refresh" content="0; url=${appUrl}" />
    <script>window.location.replace(${JSON.stringify(appUrl)});</script>
  </head>
  <body style="font-family: Arial, sans-serif; padding: 24px;">
    <h1>${title}</h1>
    <p>${description}</p>
    <p>Abriendo árbol compartido...</p>
  </body>
</html>`);
}
