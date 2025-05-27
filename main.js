// main.js

document.getElementById("fileInput").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) {
    document.getElementById("fileNameTitle").textContent = "";
    document.getElementById("tableContainer").innerHTML = "";
    document.getElementById("printPdfBtn").style.display = "none";
    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    document.getElementById(
      "fileNameTitle"
    ).textContent = `Archivo cargado: ${file.name}`;
    const container = document.getElementById("tableContainer");
    container.innerHTML = ""; // Limpiar tablas anteriores
    document.getElementById("printPdfBtn").style.display = "block"; // Mostrar botón de PDF

    let currentTableData = []; // Filas de datos para la tabla actual
    let globalHeaders = []; // Cabeceras de la primera fila del Excel
    let colMap = {}; // Mapeo de nombres de cabeceras a índices
    let currentSectionTitle = ""; // Título de la sección actual
    let globalTotalableColumns = []; // Nombres de columnas que se pueden totalizar (para el select)

    /**
     * Crea y añade una tabla HTML al contenedor.
     * @param {string} titleText - Título de la tabla.
     * @param {Array<Array<any>>} dataRows - Filas de datos para la tabla.
     * @param {Array<string>} tableHeaders - Cabeceras de la tabla (originales + SAL).
     * @param {number} baseCalcColIndex - El índice de la columna base para los cálculos SAL.
     * @param {Array<string>} totalableCols - Nombres de las columnas que pueden ser totalizadas (para el selector por tabla).
     */
    const createAndAppendTable = (
      titleText,
      dataRows,
      tableHeaders,
      baseCalcColIndex,
      totalableCols
    ) => {
      // ... (parte de creación de la tabla, cabeceras, tbody, sin cambios relevantes para este punto) ...

      // --- Selector de columna a totalizar por tabla (para columnas originales) ---
      // Este selector sigue controlando solo la columna original que el usuario quiere totalizar
      const totalSelectorDiv = document.createElement("div");
      totalSelectorDiv.className = "d-flex align-items-center mb-3";
      const totalLabel = document.createElement("label");
      totalLabel.htmlFor = `totalColSelect-${Date.now()}`;
      totalLabel.textContent = "Totalizar columna original: ";
      totalLabel.className = "form-label me-2 mb-0";

      const totalColSelect = document.createElement("select");
      totalColSelect.className = "form-select total-col-select";
      totalColSelect.id = totalLabel.htmlFor;

      totalableCols.forEach((colName) => {
        const option = document.createElement("option");
        option.value = tableHeaders.indexOf(colName);
        option.textContent = colName;
        totalColSelect.appendChild(option);
      });

      if (totalableCols.includes(tableHeaders[baseCalcColIndex])) {
        totalColSelect.value = baseCalcColIndex;
      } else if (totalableCols.length > 0) {
        totalColSelect.value = tableHeaders.indexOf(totalableCols[0]);
      } else {
        totalColSelect.disabled = true;
      }

      totalSelectorDiv.appendChild(totalLabel);
      totalSelectorDiv.appendChild(totalColSelect);
      tableWrapper.appendChild(totalSelectorDiv);
      // --- Fin Selector de columna a totalizar por tabla ---

      // Función para actualizar los totales de la fila de totales de esta tabla
      const updateTableTotals = () => {
        let tempTotals = {
          "Importo SAL": 0, // Siempre inicializado a 0
          "Importo A FINIRE": 0, // Siempre inicializado a 0
        };
        const selectedColIndex = parseInt(totalColSelect.value); // Columna original seleccionada para totalizar

        // Inicializar tempTotals para la columna original seleccionada
        if (
          !isNaN(selectedColIndex) &&
          selectedColIndex !== -1 &&
          selectedColIndex < tableHeaders.length
        ) {
          tempTotals[tableHeaders[selectedColIndex]] = 0;
        }

        // Iterar sobre todas las filas de datos en el tbody (excluyendo la fila de totales)
        tbody.querySelectorAll("tr:not(.total-row)").forEach((rowElement) => {
          const cells = rowElement.querySelectorAll("td");

          // Sumar el valor de la columna original seleccionada dinámicamente
          if (
            !isNaN(selectedColIndex) &&
            selectedColIndex !== -1 &&
            cells[selectedColIndex]
          ) {
            tempTotals[tableHeaders[selectedColIndex]] +=
              parseFloat(cells[selectedColIndex]?.textContent) || 0;
          }

          // --- ESTOS TOTALES SIEMPRE SE SUMAN, INDEPENDIENTEMENTE DEL SELECTOR ---
          tempTotals["Importo SAL"] +=
            parseFloat(cells[tableHeaders.length + 1]?.textContent) || 0;
          tempTotals["Importo A FINIRE"] +=
            parseFloat(cells[tableHeaders.length + 3]?.textContent) || 0;
        });

        // Actualizar los textos en la fila de totales visible
        const totalRowElement = tbody.querySelector(".total-row");
        if (totalRowElement) {
          const totalCells = totalRowElement.querySelectorAll("td");

          // Limpiar todos los totales antes de actualizar para evitar residuos
          totalCells.forEach((cell) => (cell.textContent = ""));

          // Poner el texto "Total" en la primera celda
          if (totalCells.length > 0) {
            totalCells[0].textContent = "Total:";
          }

          // Actualizar la columna original seleccionada para totalizar
          if (
            !isNaN(selectedColIndex) &&
            selectedColIndex !== -1 &&
            totalCells[selectedColIndex]
          ) {
            totalCells[selectedColIndex].textContent =
              tempTotals[tableHeaders[selectedColIndex]]?.toFixed(2) || "0.00";
          }

          // --- ESTOS TOTALES SIEMPRE SE MUESTRAN EN LA FILA DE TOTALES ---
          if (totalCells[tableHeaders.length + 1])
            totalCells[tableHeaders.length + 1].textContent =
              tempTotals["Importo SAL"].toFixed(2);
          if (totalCells[tableHeaders.length + 3])
            totalCells[tableHeaders.length + 3].textContent =
              tempTotals["Importo A FINIRE"].toFixed(2);
        }
      };
      /**
       * Helper para verificar si una celda está vacía.
       */
      const isCellEmpty = (cell) =>
        cell === undefined || cell === null || String(cell).trim() === "";

      // Inicializar totales para esta tabla específica
      let currentTableTotals = {}; // Ahora dinámico según el select

      // Función para actualizar los totales de la fila de totales de esta tabla

        //partes en txt


        // Inicializar tempTotals para la columna seleccionada
        if (
          !isNaN(selectedColIndex) &&
          selectedColIndex !== -1 &&
          globalTotalableColumns[selectedColIndex]
        ) {
          tempTotals[globalTotalableColumns[selectedColIndex]] = 0;
        }

        // También inicializar para Importo SAL y Importo A FINIRE
        tempTotals["Importo SAL"] = 0;
        tempTotals["Importo A FINIRE"] = 0;

        // Iterar sobre todas las filas de datos en el tbody (excluyendo la fila de totales)
        tbody.querySelectorAll("tr:not(.total-row)").forEach((rowElement) => {
          const cells = rowElement.querySelectorAll("td");

          // Sumar el valor de la columna seleccionada dinámicamente
          if (
            !isNaN(selectedColIndex) &&
            selectedColIndex !== -1 &&
            cells[selectedColIndex]
          ) {
            tempTotals[globalTotalableColumns[selectedColIndex]] +=
              parseFloat(cells[selectedColIndex]?.textContent) || 0;
          }

          // Sumar los valores calculados de Importo SAL y Importo A FINIRE
          // Estos están en las columnas añadidas dinámicamente.
          // La columna "Importo SAL" estará en el índice `tableHeaders.length + 1`
          // La columna "Importo A FINIRE" estará en el índice `tableHeaders.length + 3`
          tempTotals["Importo SAL"] +=
            parseFloat(cells[tableHeaders.length + 1]?.textContent) || 0;
          tempTotals["Importo A FINIRE"] +=
            parseFloat(cells[tableHeaders.length + 3]?.textContent) || 0;
        });
        currentTableTotals = tempTotals; // Actualizar los totales de la tabla

        // Actualizar los textos en la fila de totales visible
        const totalRowElement = tbody.querySelector(".total-row");
        if (totalRowElement) {
          const totalCells = totalRowElement.querySelectorAll("td");

          // Limpiar todos los totales antes de actualizar para evitar residuos
          totalCells.forEach((cell) => (cell.textContent = ""));

          // Poner el texto "Total" en la primera celda
          if (totalCells.length > 0) {
            totalCells[0].textContent = "Total:";
          }

          // Actualizar la columna seleccionada para totalizar
          if (
            !isNaN(selectedColIndex) &&
            selectedColIndex !== -1 &&
            totalCells[selectedColIndex]
          ) {
            totalCells[selectedColIndex].textContent =
              currentTableTotals[
                globalTotalableColumns[selectedColIndex]
              ]?.toFixed(2) || "0.00";
          }

          // Actualizar los totales de Importo SAL y Importo A FINIRE
          if (totalCells[tableHeaders.length + 1])
            totalCells[tableHeaders.length + 1].textContent =
              currentTableTotals["Importo SAL"].toFixed(2);
          if (totalCells[tableHeaders.length + 3])
            totalCells[tableHeaders.length + 3].textContent =
              currentTableTotals["Importo A FINIRE"].toFixed(2);
        }
      };

      // Listener para el selector de columna de total
      totalColSelect.addEventListener("change", updateTableTotals);

      // Llenar el tbody con los datos de las filas
      dataRows.forEach((row) => {
        const tr = document.createElement("tr");

        // Añadir las celdas con los datos originales
        tableHeaders.forEach((_, i) => {
          const td = document.createElement("td");
          const value = row[i];
          // Formatear números a 2 decimales para las celdas de datos originales si son números
          td.textContent =
            typeof value === "number" ? value.toFixed(2) : value || "";
          tr.appendChild(td);
        });

        // Obtener el valor de la columna 'Importo Unitario' para los cálculos
        // Aquí colMap.ImportoUnitario es el índice de la columna "H" o "IMPORTO UNITARIO"
        const importoUnitarioValue =
          colMap.ImportoUnitario !== -1 &&
          !isNaN(parseFloat(row[colMap.ImportoUnitario]))
            ? parseFloat(row[colMap.ImportoUnitario])
            : 0;

        // Celda de entrada SAL %
        const salTd = document.createElement("td");
        const input = document.createElement("input");
        input.type = "text";
        input.className = "form-control text-end col-sal";
        input.value = "0"; // Inicializar SAL % a 0, sin decimales por defecto
        salTd.appendChild(input);

        // Celda Importo SAL (calculado)
        const salImportoTd = document.createElement("td");
        salImportoTd.className = "text-end";
        salImportoTd.textContent = "0.00"; // Inicializar a 0.00

        // Celda A FINIRE % (calculado)
        const finirePercentTd = document.createElement("td");
        finirePercentTd.className = "text-end";
        finirePercentTd.textContent = "100.00%"; // Inicializar a 100.00%

        // Celda Importo A FINIRE (calculado)
        const finireImportoTd = document.createElement("td");
        finireImportoTd.className = "text-end";
        finireImportoTd.textContent = importoUnitarioValue.toFixed(2); // Inicializar con el valor de 'Importo Unitario'

        input.addEventListener("input", () => {
          let val = parseFloat(input.value.replace(",", "."));
          val = isNaN(val) ? 0 : Math.min(Math.max(val, 0), 100);
          input.value = val; // Mantener el formato del usuario, sin forzar decimales

          if (val > 100 || val < 0) {
            input.classList.add("is-invalid");
          } else {
            input.classList.remove("is-invalid");
          }

          const percent = val / 100;
          salImportoTd.textContent = (importoUnitarioValue * percent).toFixed(
            2
          );
          finirePercentTd.textContent = ((1 - percent) * 100).toFixed(2) + "%";
          finireImportoTd.textContent = (
            importoUnitarioValue *
            (1 - percent)
          ).toFixed(2);

          updateTableTotals(); // Actualizar los totales de la tabla después de cada cambio
        });

        tr.appendChild(salTd);
        tr.appendChild(salImportoTd);
        tr.appendChild(finirePercentTd);
        tr.appendChild(finireImportoTd);

        tbody.appendChild(tr);
      });

      // Añadir la fila de totales al final de la tabla
      const totalRow = document.createElement("tr");
      totalRow.classList.add("total-row", "table-info"); // Clase Bootstrap para resaltar

      // Crear celdas para los totales. Se rellenarán en updateTableTotals.
      // Serán el número de columnas originales + las 4 nuevas
      for (let i = 0; i < tableHeaders.length + 4; i++) {
        totalRow.appendChild(document.createElement("td"));
      }
      tbody.appendChild(totalRow);

      // Calcular y mostrar los totales iniciales
      updateTableTotals();
    };

    // Filtrar filas completamente vacías al principio del procesamiento
    // Esto asegura que `json` no empieza con muchas filas en blanco
    const filteredJson = json.filter((row) =>
      row.some((cell) => !isCellEmpty(cell))
    );

    let isFirstTable = true; // Bandera para la primera tabla (no tiene título)

    // Iterar sobre las filas filtradas
    filteredJson.forEach((row, indexInFiltered) => {
      // La primera fila (después de filtrar las vacías) siempre son las cabeceras globales
      if (indexInFiltered === 0) {
        globalHeaders = row.map((header) =>
          header === undefined ? "" : String(header).trim()
        );
        // Llenar el mapeo de columnas. Ajusta "Importo Unitario" al nombre real de tu columna H.
        colMap = {
          ImportoUnitario: globalHeaders.indexOf("H"), // O "IMPORTO UNITARIO"
        };
        // Validar que la columna 'Importo Unitario' existe
        if (colMap.ImportoUnitario === -1) {
          console.warn(
            "Columna 'H' (Importo Unitario) no encontrada en las cabeceras de Excel. Asegúrate de que la cabecera es 'H' o el nombre correcto."
          );
        }

        // Identificar qué columnas se pueden totalizar
        globalTotalableColumns = globalHeaders.filter((header) => {
          return (
            header.includes("Importo") ||
            header.includes("Cantidad") ||
            header === "G" ||
            header === "H"
          );
        });
        // Si no se encuentran columnas específicas, tomar todas las cabeceras no vacías como totalizables
        if (globalTotalableColumns.length === 0) {
          globalTotalableColumns = globalHeaders.filter(
            (header) => header !== ""
          );
        }

        return; // No procesar la fila de cabeceras como datos de tabla
      }

      // --- Lógica de corte de tabla revisada ---
      // Una fila es un "corte de tabla" si sus celdas 0 Y 1 no están vacías
      // Consideramos que esto es un título de sección
      const isNewSectionHeader = !isCellEmpty(row[0]) && !isCellEmpty(row[1]);

      // Si es un nuevo encabezado de sección, o si es una fila completamente vacía
      // Y ya tenemos datos acumulados para la tabla actual, la creamos.
      if (
        (isNewSectionHeader || row.every((cell) => isCellEmpty(cell))) &&
        currentTableData.length > 0
      ) {
        createAndAppendTable(
          currentSectionTitle,
          currentTableData,
          globalHeaders,
          colMap
        );
        currentTableData = []; // Reset para la nueva tabla
        isFirstTable = false; // Ya no es la primera tabla
      }

      // Si es un nuevo encabezado de sección, actualizamos el título para la próxima tabla
      if (isNewSectionHeader) {
        currentSectionTitle = `${row[0] || ""} ${row[1] || ""}`.trim();
      } else if (row.every((cell) => isCellEmpty(cell))) {
        // Si es una fila completamente vacía, no tiene título para la siguiente sección
        currentSectionTitle = "";
      } else {
        // Si no es un corte ni una fila vacía, es una fila de datos.
        // Añádela a los datos de la tabla actual.
        currentTableData.push(row);
        // Si es la primera tabla y no hubo título de sección, su título se mantiene vacío.
        if (isFirstTable && currentSectionTitle === "") {
          currentSectionTitle = ""; // Asegurarse de que no toma título de una fila de datos
        }
      }
    });

    // Después de procesar todas las filas, renderizar la última tabla si hay datos pendientes
    if (currentTableData.length > 0) {
      createAndAppendTable(
        currentSectionTitle,
        currentTableData,
        globalHeaders,
        colMap
      );
    }
  };

  reader.readAsArrayBuffer(file);
});

// Listener para el botón de impresión de PDF
document.getElementById("printPdfBtn").addEventListener("click", function () {
  const pdfGen = new PdfGenerator();

  // Obtener las cabeceras de la primera tabla generada en el DOM
  const firstTableElement = document.querySelector(
    "#tableContainer .table-wrapper table"
  );
  if (!firstTableElement) {
    alert(
      "No hay tablas generadas para imprimir. Carga un archivo Excel primero."
    );
    return;
  }
  const firstTableHtmlHeaders = Array.from(
    firstTableElement.querySelectorAll("thead th")
  ).map((th) => th.textContent.trim());

  // Definir las columnas a incluir en el PDF: 1 a 6 (índices 0 a 5) y luego 'SAL %' e 'Importo SAL'.
  const columnsToInclude = [0, 1, 2, 3, 4, 5]; // Columnas originales (índices en el array de fila)

  const salPercentIndex = firstTableHtmlHeaders.indexOf("SAL %");
  const importoSalIndex = firstTableHtmlHeaders.indexOf("Importo SAL");

  if (salPercentIndex !== -1) columnsToInclude.push(salPercentIndex);
  if (importoSalIndex !== -1) columnsToInclude.push(importoSalIndex);

  pdfGen.generatePdf(
    "tableContainer",
    columnsToInclude,
    "Reporte_Proyecto_SAL.pdf"
  );
});
