document.getElementById("fileInput").addEventListener("change", function (e) {
  const file = e.target.files[0];
  const reader = new FileReader();

  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheetName = workbook.SheetNames[0]; // Asumiendo que los datos están en la primera hoja
    const worksheet = workbook.Sheets[sheetName]; // Se mantiene el worksheet para el intento de colores
    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    document.getElementById(
      "fileNameTitle"
    ).textContent = `Archivo cargado: ${file.name}`;

    const container = document.getElementById("tableContainer");
    container.innerHTML = ""; // Limpiar tablas anteriores

    let currentTableData = []; // Almacena las filas de datos para la tabla actual
    let globalHeaders = []; // Almacena las cabeceras de la primera fila del Excel
    let colMap = {}; // Mapea los nombres de las cabeceras originales a sus índices de columna
    let currentSectionTitle = ""; // Para almacenar el título de la sección actual (título de la tabla)
    let currentRowIndex = 0; // Para rastrear el índice de la fila original del Excel (para el intento de estilos)

    /**
     * Crea y añade una tabla HTML al contenedor.
     * @param {string} titleText - Título de la tabla.
     * @param {Array<Array<any>>} dataRows - Filas de datos para la tabla.
     * @param {Array<string>} tableHeaders - Cabeceras de la tabla (incluyendo las originales y las nuevas SAL).
     * @param {Object} columnMap - Mapeo de nombres de columnas originales a índices.
     * @param {Object} currentWorksheet - La hoja de cálculo de SheetJS para intentar extraer estilos.
     */
    const createAndAppendTable = (
      titleText,
      dataRows,
      tableHeaders,
      columnMap,
      currentWorksheet
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

      // Inicializar totales para esta tabla específica
      let currentTableTotals = { G: 0, H: 0, J: 0, L: 0 }; // J para Importo SAL, L para Importo A FINIRE

      // Función para actualizar los totales de la fila de totales de esta tabla
      const updateTableTotals = () => {
        let tempTotals = { G: 0, H: 0, J: 0, L: 0 };

        // Iterar sobre todas las filas de datos en el tbody (excluyendo la fila de totales)
        tbody.querySelectorAll("tr:not(.total-row)").forEach((rowElement) => {
          const cells = rowElement.querySelectorAll("td");
          // Sumar los valores originales de las columnas G y H
          tempTotals.G += parseFloat(cells[columnMap.G]?.textContent) || 0;
          tempTotals.H += parseFloat(cells[columnMap.H]?.textContent) || 0;

          // Sumar los valores calculados de Importo SAL y Importo A FINIRE
          // Estos están en las columnas añadidas dinámicamente
          // La columna "Importo SAL" estará en el índice `tableHeaders.length + 1`
          // La columna "Importo A FINIRE" estará en el índice `tableHeaders.length + 3`
          tempTotals.J +=
            parseFloat(cells[tableHeaders.length + 1]?.textContent) || 0;
          tempTotals.L +=
            parseFloat(cells[tableHeaders.length + 3]?.textContent) || 0;
        });
        currentTableTotals = tempTotals; // Actualizar los totales de la tabla

        // Actualizar los textos en la fila de totales visible
        const totalRowElement = tbody.querySelector(".total-row");
        if (totalRowElement) {
          const totalCells = totalRowElement.querySelectorAll("td");
          if (totalCells[columnMap.G])
            totalCells[columnMap.G].textContent =
              currentTableTotals.G.toFixed(2);
          if (totalCells[columnMap.H])
            totalCells[columnMap.H].textContent =
              currentTableTotals.H.toFixed(2);
          if (totalCells[tableHeaders.length + 1])
            totalCells[tableHeaders.length + 1].textContent =
              currentTableTotals.J.toFixed(2);
          if (totalCells[tableHeaders.length + 3])
            totalCells[tableHeaders.length + 3].textContent =
              currentTableTotals.L.toFixed(2);
        }
      };

      // Llenar el tbody con los datos de las filas
      dataRows.forEach((row, rowIndexInTable) => {
        // rowIndexInTable para el cálculo de filas originales
        const tr = document.createElement("tr");

        // *** Intento de aplicar estilos de fondo desde Excel (no soportado por SheetJS directamente) ***
        // Esta parte del código NO funcionará para extraer colores de fondo.
        // SheetJS no expone directamente los estilos de celda a través de `worksheet[cellAddress].s`.
        // Mantenerlo aquí puede dar una idea de cómo se haría si la librería lo soportara.
        const originalExcelRowIndex =
          currentRowIndex - dataRows.length + rowIndexInTable; // Caluclo para la fila original del excel
        const cellAddress = XLSX.utils.encode_cell({
          r: originalExcelRowIndex,
          c: 0,
        });
        if (
          currentWorksheet[cellAddress] &&
          currentWorksheet[cellAddress].s &&
          currentWorksheet[cellAddress].s.bgColor
        ) {
          const bgColor = currentWorksheet[cellAddress].s.bgColor;
          // bgColor.rgb será en formato 'AARRGGBB' donde AA es alfa, RR es rojo, etc.
          // Necesitas extraer RR, GG, BB y convertir a rgb(r,g,b) o usar #RRGGBB.
          // Esto es un ejemplo y requeriría una lógica de parseo de color.
          // tr.style.backgroundColor = `#${bgColor.rgb.substring(2)}`; // Ignora el alfa si es AARRGGBB
        }
        // *********************************************************************************************

        // Agregar celdas originales
        tableHeaders.forEach((_, i) => {
          const td = document.createElement("td");
          const value = row[i];
          td.textContent =
            typeof value === "number" ? value.toFixed(2) : value || "";
          tr.appendChild(td);
        });

        // Asegurarse de que colMap.H sea un índice válido antes de usarlo
        const hValue =
          colMap.H !== -1 && !isNaN(parseFloat(row[colMap.H]))
            ? parseFloat(row[colMap.H])
            : 0;

        // Celda de entrada SAL %
        const salTd = document.createElement("td");
        const input = document.createElement("input");
        input.type = "text";
        input.className = "form-control text-end col-sal";
        input.value = "0";
        salTd.appendChild(input);

        // Celda Importo SAL (calculado)
        const salImportoTd = document.createElement("td");
        salImportoTd.className = "text-end";
        salImportoTd.textContent = "0";

        // Celda A FINIRE % (calculado)
        const finirePercentTd = document.createElement("td");
        finirePercentTd.className = "text-end";
        finirePercentTd.textContent = "100.00%"; // Inicializar a 100.00%

        // Celda Importo A FINIRE (calculado)
        const finireImportoTd = document.createElement("td");
        finireImportoTd.className = "text-end";
        finireImportoTd.textContent = hValue.toFixed(2); // Inicializar con el valor de H

        input.addEventListener("input", () => {
          let val = parseFloat(input.value.replace(",", "."));
          val = isNaN(val) ? 0 : Math.min(Math.max(val, 0), 100); // Limitar entre 0 y 100
          input.value = val;

          if (val > 100 || val < 0) {
            input.classList.add("is-invalid");
          } else {
            input.classList.remove("is-invalid");
          }

          const percent = val / 100;
          salImportoTd.textContent = (hValue * percent).toFixed(2);
          finirePercentTd.textContent = ((1 - percent) * 100).toFixed(2) + "%";
          finireImportoTd.textContent = (hValue * (1 - percent)).toFixed(2);

          updateTableTotals(); // Actualizar los totales de la tabla
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

      // Crear celdas para los totales originales (G, H, etc.)
      tableHeaders.forEach(() => {
        totalRow.appendChild(document.createElement("td"));
      });

      // Crear celdas para los totales de las columnas SAL añadidas
      totalRow.appendChild(document.createElement("td")); // SAL % (vacío)
      totalRow.appendChild(document.createElement("td")); // Importo SAL
      totalRow.appendChild(document.createElement("td")); // A FINIRE % (vacío)
      totalRow.appendChild(document.createElement("td")); // Importo A FINIRE
      tbody.appendChild(totalRow);

      // Calcular y mostrar los totales iniciales (cuando la tabla se carga por primera vez)
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
      currentRowIndex = originalIndex; // Actualizar el índice de la fila original de Excel

      // Detección de fila de encabezados (siempre la primera fila después del filtro)
      if (originalIndex === 0) {
        globalHeaders = row.map((header) =>
          header === undefined ? "" : header
        );
        // Ajustar colMap a tus nuevos nombres de cabecera si "Importe Unitario" es "H"
        colMap = {
          unitario: globalHeaders.indexOf("H"),
          // Asumo "H" es tu "Importe Unitario"
          // Las otras columnas "SAL %", "A FINIRE %", etc. son añadidas dinámicamente,
          // por lo que no se buscan en las cabeceras originales del Excel.
          // Mantén G y H si son columnas originales que necesitas para los totales.
          //G: globalHeaders.indexOf("G"),
          G: globalHeaders.indexOf("IMPORTE unitario"),
          H: globalHeaders.indexOf("IMPORTE totale CONTRACTO"),
          //H: globalHeaders.indexOf("H"),
        };
        // Validar que las columnas G y H existen
        if (colMap.G === -1)
          console.warn("Columna 'G' no encontrada en las cabeceras de Excel.");
        if (colMap.H === -1)
          console.warn(
            "Columna 'H' (Importe Unitario) no encontrada en las cabeceras de Excel."
          );
        return; // No procesar la fila de cabeceras como datos de tabla
      }

      // Detección de fila de título: celdas 0 y 1 con valor, el resto vacío o con formato diferente
      // Tu lógica de `isTitleRow` es buena para detectar esto.
      const isTitleRow =
        row[0] &&
        row[1] &&
        row.slice(2).every((v) => {
          // Si el valor es undefined, null o una cadena vacía/espacios, se considera vacío
          if (v === undefined || v === null || String(v).trim() === "")
            return true;
          // Si no es vacío, no es una fila de título
          return false;
        });

      // Detección de fin de tabla (fila completamente vacía o cambio de sección)
      // Usaremos una fila completamente vacía como separador de tabla, si tiene datos antes
      const isEmptyRow = row.every(
        (cell) =>
          cell === "" ||
          cell === undefined ||
          cell === null ||
          String(cell).trim() === ""
      );

      if (isEmptyRow) {
        // Si la fila actual está vacía y tenemos datos acumulados para una tabla, renderizarla
        if (currentTableData.length > 0) {
          createAndAppendTable(
            currentSectionTitle,
            currentTableData,
            globalHeaders,
            colMap,
            worksheet
          );
          currentTableData = []; // Limpiar para la próxima tabla
          currentSectionTitle = ""; // Limpiar título
        }
        return; // No procesar la fila vacía como dato
      }

      if (isTitleRow) {
        // Si hay datos acumulados de la tabla anterior, renderizarla
        if (currentTableData.length > 0) {
          createAndAppendTable(
            currentSectionTitle,
            currentTableData,
            globalHeaders,
            colMap,
            worksheet
          );
        }
        // Reiniciar para la nueva sección/tabla
        currentSectionTitle = `${row[0] || ""} ${row[1] || ""}`.trim();
        currentTableData = []; // Limpiar datos para la nueva tabla
      } else {
        // Es una fila de datos normal, añadirla a la data de la tabla actual
        currentTableData.push(row);
      }
    });

    // Después de procesar todas las filas, renderizar la última tabla si hay datos pendientes
    if (currentTableData.length > 0) {
      createAndAppendTable(
        currentSectionTitle,
        currentTableData,
        globalHeaders,
        colMap,
        worksheet
      );
    }
  };

  reader.readAsArrayBuffer(file);
});
