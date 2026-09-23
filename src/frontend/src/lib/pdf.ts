/**
 * Minimal PDF 1.4 writer: one JPEG image per page, sized to the physical
 * print dimensions (points = inches * 72). No external dependencies.
 */
export interface PdfImagePage {
  jpeg: Uint8Array;
  widthPx: number;
  heightPx: number;
}

const encoder = new TextEncoder();

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function pad10(n: number): string {
  return n.toString().padStart(10, "0");
}

export function buildPdfFromJpegs(
  pages: PdfImagePage[],
  widthInches: number,
  heightInches: number,
): Uint8Array {
  if (pages.length === 0) throw new Error("PDF needs at least one page");
  const wPt = (widthInches * 72).toFixed(2);
  const hPt = (heightInches * 72).toFixed(2);
  const objects: Uint8Array[] = [];
  const pageObjectIds: number[] = [];
  // Object numbering: 1 catalog, 2 pages, then per page: image, content, page.
  let nextId = 3;
  const perPage = pages.map((p) => {
    const imageId = nextId++;
    const contentId = nextId++;
    const pageId = nextId++;
    pageObjectIds.push(pageId);
    return { ...p, imageId, contentId, pageId };
  });
  const kids = pageObjectIds.map((id) => `${id} 0 R`).join(" ");
  objects.push(
    encoder.encode("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"),
  );
  objects.push(
    encoder.encode(
      `2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>\nendobj\n`,
    ),
  );
  for (const p of perPage) {
    const imageHeader = encoder.encode(
      `${p.imageId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${p.widthPx} /Height ${p.heightPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`,
    );
    objects.push(
      concat([imageHeader, p.jpeg, encoder.encode("\nendstream\nendobj\n")]),
    );
    const content = `q ${wPt} 0 0 ${hPt} 0 0 cm /Im${p.imageId} Do Q`;
    objects.push(
      encoder.encode(
        `${p.contentId} 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`,
      ),
    );
    objects.push(
      encoder.encode(
        `${p.pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${wPt} ${hPt}] /Resources << /XObject << /Im${p.imageId} ${p.imageId} 0 R >> >> /Contents ${p.contentId} 0 R >>\nendobj\n`,
      ),
    );
  }
  const header = encoder.encode("%PDF-1.4\n%âãÏÓ\n");
  const offsets: number[] = [];
  let position = header.length;
  for (const obj of objects) {
    offsets.push(position);
    position += obj.length;
  }
  const xrefStart = position;
  const count = objects.length + 1;
  let xref = `xref\n0 ${count}\n0000000000 65535 f \n`;
  for (const off of offsets) xref += `${pad10(off)} 00000 n \n`;
  const trailer = `trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return concat([header, ...objects, encoder.encode(xref + trailer)]);
}
