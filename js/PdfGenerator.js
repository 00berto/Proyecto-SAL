// js/PdfGenerator.js

class PdfGenerator {
  /**
   * Genera un PDF a partir de una lista de elementos de tabla (wrappers).
   * @param {HTMLElement[]} tableElementsToPrint Un array de elementos div.table-wrapper a imprimir.
   * @param {string} filename El nombre del archivo PDF a generar.
   */
  static async generatePdf(tableElementsToPrint, filename) {
    const tempContainer = document.createElement("div");
    tempContainer.style.width = "100%";
    tempContainer.style.padding = "10px";
    tempContainer.style.boxSizing = "border-box";

    tableElementsToPrint.forEach((tableWrapper) => {
      // Clonamos directamente el elemento wrapper de la tabla
      const clonedTableWrapper = tableWrapper.cloneNode(true);

      // Importante: html2pdf trabaja con el DOM, no necesitas la lógica de `selectedSalTableIds` aquí
      // porque `tableElementsToPrint` ya contiene solo las tablas que se eligieron.
      // La lógica de selección se maneja en App.js.

      // Limpiar inputs (solo para tablas originales con inputs SAL%)
      clonedTableWrapper
        .querySelectorAll("input.sal-input")
        .forEach((input) => {
          const span = document.createElement("span");
          span.textContent = input.value;
          input.parentNode.replaceChild(span, input);
        });

      // ESTILO CRÍTICO PARA EL PDF: Asegurarse de que no haya transformaciones o márgenes raros
      clonedTableWrapper.style.transform = "none";
      clonedTableWrapper.style.margin = "0 auto 20px auto"; // Control de margen en el PDF
      clonedTableWrapper.style.width = "fit-content"; // Ajusta el ancho para que el contenido quepa
      clonedTableWrapper.style.maxWidth = "100%"; // No exceda el ancho del contenedor del PDF

      tempContainer.appendChild(clonedTableWrapper);
    });

    const opt = {
      margin: [10, 10, 10, 10],
      filename: filename, // Usamos el nombre de archivo pasado por parámetro
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, logging: false, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"] },
    };

    html2pdf().from(tempContainer).set(opt).save();
    tempContainer.remove();
  }
}
