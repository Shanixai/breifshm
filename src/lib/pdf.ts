import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * Render an HTML element to a multi-page PDF.
 * Uses html2canvas so Hebrew text and RTL layout render exactly as on screen
 * (no jsPDF font/glyph configuration needed).
 */
export async function exportElementToPdf(element: HTMLElement, filename: string) {
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    windowWidth: element.scrollWidth,
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.95);

  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position -= pageHeight;
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(filename);
}
