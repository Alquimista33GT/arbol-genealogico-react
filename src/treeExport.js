import { jsPDF } from "jspdf";

function getTreeElement(target) {
  if (target && typeof target === "object" && "current" in target) {
    return target.current;
  }
  return target || document.querySelector(".ft-map-transform");
}

function sanitizeFileName(name = "akna-arbol-genealogico") {
  return (
    String(name)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9áéíóúñü\s_-]/gi, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-") || "akna-arbol-genealogico"
  );
}

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function copyComputedStyles(source, target) {
  const computed = window.getComputedStyle(source);
  for (const prop of computed) {
    try {
      target.style.setProperty(
        prop,
        computed.getPropertyValue(prop),
        computed.getPropertyPriority(prop)
      );
    } catch (_) {}
  }
}

function cloneCanvasElement(canvas) {
  const img = new Image();
  img.src = canvas.toDataURL("image/png");
  img.style.width = `${canvas.width}px`;
  img.style.height = `${canvas.height}px`;
  return img;
}

function cloneNodeWithStyles(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    return document.createTextNode(node.textContent || "");
  }

  if (!(node instanceof Element)) {
    return document.createElement("div");
  }

  if (node instanceof HTMLCanvasElement) {
    return cloneCanvasElement(node);
  }

  const clone = node.cloneNode(false);
  copyComputedStyles(node, clone);

  Array.from(node.childNodes).forEach((child) => {
    clone.appendChild(cloneNodeWithStyles(child));
  });

  return clone;
}

async function renderElementToCanvas(element, options = {}) {
  const scale = options.scale || 2;
  const backgroundColor = options.backgroundColor || "#f6fbf7";

  const rect = element.getBoundingClientRect();
  const width = Math.max(1, Math.ceil(rect.width));
  const height = Math.max(1, Math.ceil(rect.height));

  const cloned = cloneNodeWithStyles(element);
  const wrapper = document.createElement("div");
  wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  wrapper.style.width = `${width}px`;
  wrapper.style.height = `${height}px`;
  wrapper.style.background = backgroundColor;
  wrapper.style.overflow = "hidden";
  wrapper.appendChild(cloned);

  const serialized = new XMLSerializer().serializeToString(wrapper);
  const svgMarkup = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <foreignObject width="100%" height="100%">
        ${serialized}
      </foreignObject>
    </svg>
  `;

  const svgBlob = new Blob([svgMarkup], {
    type: "image/svg+xml;charset=utf-8",
  });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = svgUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;

    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);

    return { canvas, width, height };
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function canvasToBlob(canvas, type = "image/png", quality = 1) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("No se pudo crear el archivo."));
        return;
      }
      resolve(blob);
    }, type, quality);
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function shareFile(blob, filename, mimeType) {
  try {
    const file = new File([blob], filename, { type: mimeType });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: "Akna Árbol Genealógico",
        files: [file],
      });
      return true;
    }
  } catch (_) {}
  return false;
}

export async function exportTreeAsImage(target, fileName = "akna-arbol-genealogico") {
  const element = getTreeElement(target);

  if (!element) {
    alert("No se encontró el mapa para exportar.");
    return;
  }

  try {
    const { canvas } = await renderElementToCanvas(element, {
      scale: 2,
      backgroundColor: "#f6fbf7",
    });

    const blob = await canvasToBlob(canvas, "image/png", 1);
    const filename = `${sanitizeFileName(fileName)}.png`;

    if (isMobileDevice()) {
      const shared = await shareFile(blob, filename, "image/png");
      if (!shared) downloadBlob(blob, filename);
      return;
    }

    downloadBlob(blob, filename);
  } catch (error) {
    console.error(error);
    alert("No se pudo crear la imagen.");
  }
}

export async function exportTreeAsPdf(target, fileName = "akna-arbol-genealogico") {
  const element = getTreeElement(target);

  if (!element) {
    alert("No se encontró el mapa para exportar.");
    return;
  }

  try {
    const { canvas, width, height } = await renderElementToCanvas(element, {
      scale: 2,
      backgroundColor: "#f6fbf7",
    });

    const imageData = canvas.toDataURL("image/png");
    const orientation = width >= height ? "landscape" : "portrait";

    const pdf = new jsPDF({
      orientation,
      unit: "px",
      format: [canvas.width, canvas.height],
    });

    pdf.addImage(imageData, "PNG", 0, 0, canvas.width, canvas.height);

    const filename = `${sanitizeFileName(fileName)}.pdf`;

    if (isMobileDevice()) {
      const pdfBlob = pdf.output("blob");
      const shared = await shareFile(pdfBlob, filename, "application/pdf");
      if (!shared) pdf.save(filename);
      return;
    }

    pdf.save(filename);
  } catch (error) {
    console.error(error);
    alert("No se pudo crear el PDF.");
  }
}