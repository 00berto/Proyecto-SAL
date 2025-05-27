// PdfGenerator.js

class PdfGenerator {
  constructor() {
    // Asegúrate de que jspdf y jspdf-autotable estén cargados globalmente
    if (
      typeof window.jspdf === "undefined" ||
      typeof window.jspdf.AutoTable === "undefined"
    ) {
      console.error(
        "Error: Las librerías jsPDF o jspdf-autotable no están cargadas. Asegúrate de incluirlas antes de PdfGenerator.js"
      );
      return; // Detener la ejecución si las librerías no están disponibles
    }
    this.doc = new window.jspdf.jsPDF();
  }

  /**
   * Genera un documento PDF a partir de las tablas HTML en un contenedor.
   * Incluye solo las columnas especificadas y los totales de cada tabla.
   *
   * @param {string} containerId - El ID del contenedor que contiene las tablas (ej. "tableContainer").
   * @param {Array<number>} columnsToExtractIndices - Un array de índices de las columnas HTML a incluir.
   * Ej: [0, 1, 2, 3, 4, 5, htmlHeaders.indexOf("SAL %"), htmlHeaders.indexOf("Importo SAL")]
   * @param {string} outputFileName - El nombre del archivo PDF a descargar (ej. "Reporte_SAL.pdf").
   */
  generatePdf(
    containerId,
    columnsToExtractIndices,
    outputFileName = "Reporte_SAL.pdf"
  ) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Contenedor con ID '${containerId}' no encontrado.`);
      return;
    }

    const tableWrappers = container.querySelectorAll(".table-wrapper");
    if (tableWrappers.length === 0) {
      console.warn("No se encontraron tablas para imprimir en el PDF.");
      return;
    }

    let yOffset = 10; // Posición inicial vertical en el PDF

    tableWrappers.forEach((wrapper, index) => {
      const tableTitle = wrapper.querySelector("h4")
        ? wrapper.querySelector("h4").textContent.trim()
        : "";
      const tableElement = wrapper.querySelector("table");
      const tbody = tableElement.querySelector("tbody");

      if (!tbody || tbody.children.length === 0) {
        return; // Saltar tablas vacías
      }

      // Extraer las cabeceras de la tabla HTML (las originales + las SAL)
      const htmlHeaders = Array.from(
        tableElement.querySelectorAll("thead th")
      ).map((th) => th.textContent.trim());

      // Filtrar las cabeceras para el PDF basándose en los índices proporcionados
      const pdfHeaders = columnsToExtractIndices
        .filter((idx) => idx !== -1 && idx < htmlHeaders.length) // Asegurarse de que el índice es válido
        .map((idx) => htmlHeaders[idx]);

      // Excluir la fila de totales del cuerpo de datos, se añade al final
      const rowsToProcess = Array.from(tbody.children).filter(
        (tr) => !tr.classList.contains("total-row")
      );
      const totalRowElement = tbody.querySelector(".total-row");

      const pdfBody = rowsToProcess.map((rowElement) => {
        const rowData = [];
        const cells = rowElement.querySelectorAll("td");
        columnsToExtractIndices.forEach((colIndex) => {
          if (cells[colIndex]) {
            rowData.push(cells[colIndex].textContent.trim());
          } else {
            rowData.push("");
          }
        });
        return rowData;
      });

      // Añadir la fila de totales al final del cuerpo del PDF, si existe
      if (totalRowElement) {
        const totalRowData = [];
        const totalCells = totalRowElement.querySelectorAll("td");
        columnsToExtractIndices.forEach((colIndex) => {
          if (totalCells[colIndex]) {
            totalRowData.push(totalCells[colIndex].textContent.trim());
          } else {
            totalRowData.push("");
          }
        });
        pdfBody.push(totalRowData);
      }

      // Añadir título de la tabla si existe
      if (tableTitle) {
        this.doc.setFontSize(14);
        this.doc.text(tableTitle, 10, yOffset);
        yOffset += 10; // Espacio después del título
      }

      // Generar la tabla en el PDF
      this.doc.autoTable({
        startY: yOffset,
        head: [pdfHeaders],
        body: pdfBody,
        theme: "grid",
        styles: {
          fontSize: 8,
          cellPadding: 2,
          valign: "middle",
          // Considera que las columnas numéricas deben estar a la derecha
          halign: "right", // Por defecto a la derecha
        },
        headStyles: {
          fillColor: [200, 200, 200],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          halign: "center",
        },
        columnStyles: {
          // Puedes ajustar esto para alinear columnas específicas a la izquierda si son texto
          // o para que las columnas "SAL %" e "Importo SAL" siempre estén a la derecha
          // Esto requeriría saber los índices de estas columnas *dentro de pdfHeaders*
        },
        didDrawPage: (data) => {
          // Paginación si la tabla es demasiado larga para la página actual
          if (
            data.cursor.y > this.doc.internal.pageSize.height - 20 &&
            index < tableWrappers.length - 1
          ) {
            this.doc.addPage();
            yOffset = 10; // Reset offset for new page
          }
        },
      });

      // Actualizar el offset para la siguiente tabla
      yOffset = this.doc.autoTable.previous.finalY + 10; // Espacio entre tablas

      // Añadir una nueva página si la próxima tabla no cabe, dejando un margen
      if (
        index < tableWrappers.length - 1 &&
        yOffset > this.doc.internal.pageSize.height - 40
      ) {
        this.doc.addPage();
        yOffset = 10; // Reset yOffset for new page
      }
    });

    // Guardar el PDF
    this.doc.save(outputFileName);
  }
}
