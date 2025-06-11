// js/PdfGenerator.js (Ejemplo adaptado para html2pdf.js)
class PdfGenerator {
  /**
   * Genera un PDF a partir de uno o varios elementos HTML.
   * @param {HTMLElement|HTMLElement[]} elementsOrIds - Un elemento HTML, su ID (string), o un array de elementos HTML (o sus IDs).
   * @param {number[]} [columnsToInclude=[]] - Índices de las columnas a incluir si se procesa una tabla directa. (Puede que necesite lógica más compleja si los tipos de tabla son variados).
   * @param {string} fileName - Nombre del archivo PDF.
   */
  generatePdf(elementsOrIds, columnsToInclude = [], fileName) {
    let elements = [];

    if (Array.isArray(elementsOrIds)) {
      elements = elementsOrIds
        .map((el) =>
          typeof el === "string" ? document.getElementById(el) : el
        )
        .filter(Boolean);
    } else if (typeof elementsOrIds === "string") {
      elements.push(document.getElementById(elementsOrIds));
    } else if (elementsOrIds instanceof HTMLElement) {
      elements.push(elementsOrIds);
    }

    if (elements.length === 0) {
      console.warn("No hay elementos válidos para generar el PDF.");
      alert("No hay tablas seleccionadas para imprimir.");
      return;
    }

    // Crear un contenedor temporal para todas las tablas
    const tempContainer = document.createElement("div");
    tempContainer.style.width = "fit-content"; // Ajustar ancho al contenido
    tempContainer.style.margin = "0 auto"; // Centrar
    tempContainer.style.padding = "10mm"; // Un poco de padding

    elements.forEach((el) => {
      // Clonar el elemento para no afectar el DOM original
      const clonedEl = el.cloneNode(true);

      // Eliminar los inputs SAL % para que no aparezcan en el PDF
      clonedEl.querySelectorAll(".sal-input").forEach((input) => {
        input.parentNode.textContent = input.value + "%"; // Reemplazar input con su valor
      });
      // Asegurar que las columnas 'A FINIRE %' y 'Importo A FINIRE' no tengan 'input' si no es necesario

      tempContainer.appendChild(clonedEl);

      // Añadir un salto de página después de cada tabla para que no se superpongan
      const pageBreak = document.createElement("div");
      pageBreak.style.pageBreakAfter = "always";
      tempContainer.appendChild(pageBreak);
    });

    // Eliminar el último salto de página innecesario
    if (
      tempContainer.lastChild &&
      tempContainer.lastChild.style.pageBreakAfter === "always"
    ) {
      tempContainer.removeChild(tempContainer.lastChild);
    }

    // html2pdf Options
    const opt = {
      margin: [10, 10, 10, 10], // top, left, bottom, right
      filename: fileName,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, logging: false, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "landscape" }, // o 'portrait'
      pagebreak: { mode: ["avoid-all", "css", "legacy"] },
    };

    html2pdf().from(tempContainer).set(opt).save();
  }
}
