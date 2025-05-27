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
     * @param {Object} columnMap - Mapeo de nombres de columnas originales a índices.
     */
    const createAndAppendTable = (
      titleText,
      dataRows,
      tableHeaders,
      columnMap
    ) => {
      const tableWrapper = document.createElement("div");
      tableWrapper.className = "table-wrapper";

      if (titleText) {
        const title = document.createElement("h4");
        title.textContent = titleText;
        tableWrapper.appendChild(title);
      }

      const table = document.createElement("table");
      table.className = "table table-bordered table-sm mb-4";

      const thead = document.createElement("thead");
      const headerRow = document.createElement("tr");

      // Añadir cabeceras originales
      tableHeaders.forEach((col) => {
        const th = document.createElement("th");
        th.textContent = col;
        headerRow.appendChild(th);
      });

      // Añadir las nuevas columnas SAL a la cabecera
      ["SAL %", "Importo SAL", "A FINIRE %", "Importo A FINIRE"].forEach(
        (name) => {
          const th = document.createElement("th");
          th.textContent = name;
          if (name === "SAL %") th.classList.add("col-sal");
          headerRow.appendChild(th);
        }
      );

      thead.appendChild(headerRow);
      table.appendChild(thead);

      const tbody = document.createElement("tbody");
      table.appendChild(tbody);
      tableWrapper.appendChild(table);
      container.appendChild(tableWrapper);

      // --- Selector de columna a totalizar por tabla ---
      const totalSelectorDiv = document.createElement("div");
      totalSelectorDiv.className = "d-flex align-items-center mb-3"; // Flexbox para alinear
      const totalLabel = document.createElement("label");
      totalLabel.htmlFor = `totalColSelect-${Date.now()}`; // ID único
      totalLabel.textContent = "Totalizar columna: ";
      totalLabel.className = "form-label me-2 mb-0"; // Clase de Bootstrap

      const totalColSelect = document.createElement("select");
      totalColSelect.className = "form-select total-col-select";
      totalColSelect.id = totalLabel.htmlFor; // Vincular label y select

      // Rellenar el selector con las columnas disponibles para totalizar
      globalTotalableColumns.forEach((colName, index) => {
        const option = document.createElement("option");
        option.value = index; // Usar el índice original de la columna
        option.textContent = colName;
        totalColSelect.appendChild(option);
      });
      // Seleccionar por defecto la columna "H" (Importo Unitario) si existe
      const defaultTotalColIndex = globalTotalableColumns.indexOf("H"); // O "Importo Unitario"
      if (defaultTotalColIndex !== -1) {
        totalColSelect.value = defaultTotalColIndex;
      } else {
        totalColSelect.value = "0"; // Por defecto la primera columna si no encuentra H
      }

      totalSelectorDiv.appendChild(totalLabel);
      totalSelectorDiv.appendChild(totalColSelect);
      tableWrapper.appendChild(totalSelectorDiv);
      // --- Fin Selector de columna a totalizar por tabla ---

      // Inicializar totales para esta tabla específica
      let currentTableTotals = {}; // Ahora dinámico según el select

      // Función para actualizar los totales de la fila de totales de esta tabla
      const updateTableTotals = () => {
        let tempTotals = {};
        const selectedColIndex = parseInt(totalColSelect.value); // Columna seleccionada para totalizar

        // Inicializar tempTotals para la columna seleccionada
        if (
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
          if (selectedColIndex !== -1 && cells[selectedColIndex]) {
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
          if (selectedColIndex !== -1 && totalCells[selectedColIndex]) {
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
          td.textContent =
            typeof value === "number" ? value.toFixed(2) : value || "";
          tr.appendChild(td);
        });

        // Obtener el valor de la columna 'Importo Unitario' para los cálculos
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
        input.value = "0.00"; // Inicializar SAL % a 0.00
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
          input.value = val.toFixed(2); // Formatear el input a 2 decimales

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

    // Filtrar filas completamente vacías
    const filteredJson = json.filter((row) =>
      row.some(
        (cell) =>
          cell !== undefined && cell !== null && String(cell).trim() !== ""
      )
    );

    // Iterar sobre las filas filtradas
    filteredJson.forEach((row, originalIndex) => {
      // La primera fila (después de filtrar las vacías) siempre son las cabeceras globales
      if (originalIndex === 0) {
        globalHeaders = row.map((header) =>
          header === undefined ? "" : String(header).trim()
        );
        // Llenar el mapeo de columnas. Ajusta "Importo Unitario" al nombre real de tu columna H.
        colMap = {
          ImportoUnitario: globalHeaders.indexOf("H"), // Asume que "H" es el nombre de la columna en tu Excel
          // Si se llama "IMPORTE UNITARIO", usa: globalHeaders.indexOf("IMPORTE UNITARIO")
        };
        // Validar que la columna 'Importo Unitario' existe
        if (colMap.ImportoUnitario === -1) {
          console.warn(
            "Columna 'H' (Importo Unitario) no encontrada en las cabeceras de Excel. Asegúrate de que la cabecera es 'H' o el nombre correcto."
          );
        }

        // Identificar qué columnas se pueden totalizar
        // Puedes ajustar esta lógica para incluir/excluir columnas específicas
        globalTotalableColumns = globalHeaders.filter((header) => {
          // Ejemplo: solo columnas con nombres que puedan ser numéricas, o las que tú elijas
          return (
            header === "G" ||
            header === "H" ||
            header.includes("Importe") ||
            header.includes("Cantidad")
          );
        });
        // Si no se encuentran columnas específicas, tomar las primeras 6 como totalizables
        if (globalTotalableColumns.length === 0 && globalHeaders.length >= 6) {
          globalTotalableColumns = globalHeaders.slice(0, 6);
        } else if (
          globalTotalableColumns.length === 0 &&
          globalHeaders.length > 0
        ) {
          globalTotalableColumns = globalHeaders; // Si no hay criterio, todas
        }

        return; // No procesar la fila de cabeceras como datos de tabla
      }

      // Detección de fila de título/corte: Si la celda 0 tiene un valor y el resto de la fila está vacía o es diferente a un número/cadena
      const isCutoffRow =
        row[0] &&
        String(row[0]).trim() !== "" &&
        row
          .slice(1)
          .every(
            (cell) =>
              cell === undefined || cell === null || String(cell).trim() === ""
          );

      // Si es una fila de corte y hay datos acumulados, renderizar la tabla anterior
      if (isCutoffRow) {
        if (currentTableData.length > 0) {
          createAndAppendTable(
            currentSectionTitle,
            currentTableData,
            globalHeaders, // Usar las cabeceras globales para esta tabla
            colMap
          );
        }
        // La primera tabla no tiene título (o su título es el de la primera fila de datos)
        // La lógica dice "si hay datos en la columna 0, allí es nuestro corte".
        // La primera tabla se generará cuando se encuentre la primera fila de corte (si no hay un título inicial).
        // Si el EXCEL empieza con una fila de datos directamente, la primera tabla no tendrá un título de sección explícito.
        // Solo las tablas subsiguientes tendrán un título si la fila de corte es "A1 B1..."

        // Actualizar el título de la sección para la nueva tabla (si aplica)
        // La primera tabla no tendrá un título explícito aquí.
        // Si quieres que la primera tabla SIEMPRE tenga un título si el archivo Excel no empieza con una sección clara,
        // tendríamos que ajustar la lógica de `currentSectionTitle` o cómo se inicializa.
        currentSectionTitle = `${row[0] || ""} ${row[1] || ""}`.trim();
        currentTableData = []; // Limpiar datos para la nueva tabla
        return; // Pasar a la siguiente fila
      }

      // Añadir la fila actual a los datos de la tabla actual
      currentTableData.push(row);
    });

    // Después de procesar todas las filas, renderizar la última tabla si hay datos pendientes
    if (currentTableData.length > 0) {
      // Si la primera tabla no tuvo un título de sección explícito en el Excel
      // y empieza directamente con datos, su título será una cadena vacía.
      // Si quieres un título por defecto para la primera tabla, lo manejaríamos aquí.
      createAndAppendTable(
        currentSectionTitle, // Será vacío si la primera tabla empieza sin fila de corte
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
  // Esto es necesario para obtener los índices de 'SAL %' e 'Importo SAL'
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

  // Definir las columnas a incluir en el PDF.
  // Columnas 1 a 6 (índices 0 a 5) y luego 'SAL %' e 'Importo SAL'.
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
