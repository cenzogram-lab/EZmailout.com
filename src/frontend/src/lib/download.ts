/** Triggers a browser download for text content. */
export function downloadText(
  filename: string,
  text: string,
  mime = "text/plain",
): void {
  const blob = new Blob([text], { type: mime });
  downloadBlob(filename, blob);
}

/** Triggers a browser download for binary content. */
export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Copies text to the clipboard, returning whether it succeeded. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
