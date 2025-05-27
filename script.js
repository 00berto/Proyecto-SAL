document.getElementById("fileInput").addEventListener("change", function (e) {
  const file = e.target.files[0];
  const reader = new FileReader();

  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheetName = workbook.SheetNames[0]; // Asumiendo que los datos están en la primera hoja
    const worksheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    document.getElementById(
      "fileNameTitle"
    ).textContent = `Archivo cargado: ${file.name}`;

    const container = document.getElementById("tableContainer");
    container.innerHTML = ""; // Limpiar tablas anteriores

    let currentTableData = []; // Almacena las filas de la tabla actual
    let headers = [];
    let colMap = {}; // Mapea los nombres de las cabeceras a sus índices de columna

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

      let currentTableTotals = { G: 0, H: 0, J: 0, L: 0 }; // J para Importo SAL, L para Importo A FINIRE

      dataRows.forEach((row) => {
        const tr = document.createElement("tr");

        tableHeaders.forEach((_, i) => {
          const td = document.createElement("td");
          const value = row[i];
          td.textContent =
            typeof value === "number" ? value.toFixed(2) : value || "";
          tr.appendChild(td);
        });

        const hValue = parseFloat(row[columnMap.H]) || 0; // Asumiendo que H es el 'IMPORTE UNITARIO'

        // Celda de entrada SAL %
        const salTd = document.createElement("td");
        const input = document.createElement("input");
        input.type = "text";
        input.className = "form-control text-end col-sal";
        input.value = "0.00"; // Inicializar SAL % a 0
        salTd.appendChild(input);

        // Celda Importo SAL
        const salImportoTd = document.createElement("td");
        salImportoTd.className = "text-end";
        salImportoTd.textContent = "0.00"; // Valor inicial

        // Celda A FINIRE %
        const finirePercentTd = document.createElement("td");
        finirePercentTd.className = "text-end";
        finirePercentTd.textContent = "100.00%";

        // Celda Importo A FINIRE
        const finireImportoTd = document.createElement("td");
        finireImportoTd.className = "text-end";
        finireImportoTd.textContent = hValue.toFixed(2);

        input.addEventListener("input", () => {
          let val = parseFloat(input.value.replace(",", "."));
          val = isNaN(val) ? 0 : val; // Permitir valores fuera de 0-100 temporalmente para resaltar errores

          if (val > 100 || val < 0) {
            input.classList.add("is-invalid"); // Clase Bootstrap para error
          } else {
            input.classList.remove("is-invalid");
          }

          const percent = val / 100;
          const currentSalImporto = hValue * percent;
          const currentFinireImporto = hValue * (1 - percent);

          salImportoTd.textContent = currentSalImporto.toFixed(2);
          finirePercentTd.textContent = ((1 - percent) * 100).toFixed(2) + "%";
          finireImportoTd.textContent = currentFinireImporto.toFixed(2);

          // Recalcular totales para esta tabla
          updateTableTotals();
        });

        tr.appendChild(salTd);
        tr.appendChild(salImportoTd);
        tr.appendChild(finirePercentTd);
        tr.appendChild(finireImportoTd);

        tbody.appendChild(tr);

        // Inicialización de los totales (antes de cualquier entrada)
        currentTableTotals.G += parseFloat(row[columnMap.G]) || 0;
        currentTableTotals.H += hValue;
        // J y L se actualizarán por el listener de entrada si se establece el SAL %.
        // Para la carga inicial, dependen del SAL % inicial (0)
        currentTableTotals.J += 0; // Importo SAL inicial es 0
        currentTableTotals.L += hValue; // Importo A FINIRE inicial es hValue
      });

      // Función para actualizar los totales de la tabla actual
      const updateTableTotals = () => {
        // Reiniciar los totales para recalculación
        let tempTotals = { G: 0, H: 0, J: 0, L: 0 };
        tbody.querySelectorAll("tr:not(.total-row)").forEach((rowElement) => {
          // Excluir la fila de totales
          const cells = rowElement.querySelectorAll("td");
          tempTotals.G += parseFloat(cells[columnMap.G].textContent) || 0;
          tempTotals.H += parseFloat(cells[columnMap.H].textContent) || 0;
          // Asumiendo que Importo SAL es la 2ª columna añadida (índice `tableHeaders.length + 1`)
          tempTotals.J +=
            parseFloat(cells[tableHeaders.length + 1].textContent) || 0;
          // Asumiendo que Importo A FINIRE es la 4ª columna añadida (índice `tableHeaders.length + 3`)
          tempTotals.L +=
            parseFloat(cells[tableHeaders.length + 3].textContent) || 0;
        });
        currentTableTotals = tempTotals; // Actualizar los totales de la tabla

        // Actualizar la fila de totales
        const totalRow = tbody.querySelector(".total-row");
        if (totalRow) {
          const totalCells = totalRow.querySelectorAll("td");
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

      // Añadir la fila de totales al final de la creación de la tabla
      const totalRow = document.createElement("tr");
      totalRow.classList.add("total-row", "table-info"); // Añadir una clase Bootstrap para resaltado
      tableHeaders.forEach((_, i) => {
        const td = document.createElement("td");
        if (i === columnMap.G) td.textContent = currentTableTotals.G.toFixed(2);
        else if (i === columnMap.H)
          td.textContent = currentTableTotals.H.toFixed(2);
        else td.textContent = "";
        totalRow.appendChild(td);
      });

      // Añadir celdas vacías para las columnas SAL en la fila de totales
      // Aquí necesitas mapear correctamente qué celda de total va a qué columna SAL
      // El orden es "SAL %", "Importo SAL", "A FINIRE %", "Importo A FINIRE"
      const salTotalTd = document.createElement("td"); // Para SAL % (vacío)
      salTotalTd.textContent = "";
      totalRow.appendChild(salTotalTd);

      const importoSalTotalTd = document.createElement("td"); // Para Importo SAL
      importoSalTotalTd.textContent = currentTableTotals.J.toFixed(2);
      totalRow.appendChild(importoSalTotalTd);

      const aFinirePercentTotalTd = document.createElement("td"); // Para A FINIRE % (vacío)
      aFinirePercentTotalTd.textContent = "";
      totalRow.appendChild(aFinirePercentTotalTd);

      const importoAFinireTotalTd = document.createElement("td"); // Para Importo A FINIRE
      importoAFinireTotalTd.textContent = currentTableTotals.L.toFixed(2);
      totalRow.appendChild(importoAFinireTotalTd);

      tbody.appendChild(totalRow);

      // Adjuntar la función updateTableTotals a la tabla para llamadas externas si es necesario
      table.updateTotals = updateTableTotals;
    };

    const filteredJson = json.filter((row) =>
      row.some((cell) => cell !== undefined && cell !== null && cell !== "")
    );

    filteredJson.forEach((row, index) => {
      if (index === 0) {
        // Esta es la fila de cabecera para la primera tabla
        headers = row.map((header) => (header === undefined ? "" : header)); // Manejar cabeceras potencialmente indefinidas
        colMap = {
          G: headers.indexOf("G"),
          H: headers.indexOf("H"),
        };
        // Asegurarse de que los valores de colMap sean índices válidos, si no, manejarlo
        for (const key in colMap) {
          if (colMap[key] === -1) {
            console.warn(
              `Columna '${key}' no encontrada en las cabeceras de Excel.`
            );
            // Puedes establecer un índice predeterminado o lanzar un error aquí.
            colMap[key] = 0; // Retroceso o manejo de errores específico.
          }
        }
        return; // Omitir el procesamiento de la fila de cabecera como datos
      }

      const isTitleRow = row[0] && row[1] && row.slice(2).every((v) => !v);

      if (isTitleRow) {
        // Una nueva sección/tabla está comenzando. Renderizar la tabla anterior si tiene datos.
        if (currentTableData.length > 0) {
          createAndAppendTable(
            `${currentTableData[0][0]} ${currentTableData[0][1]}`, // Usar el título de la fila de título anterior
            currentTableData.slice(1), // Excluir la propia fila de título de los datos
            headers,
            colMap
          );
        }
        // Reiniciar para la nueva tabla
        currentTableData = [row]; // Comenzar los datos de la nueva tabla con esta fila de título
      } else {
        // Es una fila de datos regular
        currentTableData.push(row);
      }
    });

    // Después del bucle, crear la última tabla si queda algún dato
    if (currentTableData.length > 1) {
      // Más que solo la fila de título
      createAndAppendTable(
        `${currentTableData[0][0]} ${currentTableData[0][1]}`,
        currentTableData.slice(1),
        headers,
        colMap
      );
    } else if (
      currentTableData.length === 1 &&
      currentTableData[0] &&
      !currentTableData[0].slice(2).every((v) => !v)
    ) {
      // Manejar el caso en que solo hay una "tabla" y no es una fila de título
      createAndAppendTable(
        "", // Sin título
        currentTableData,
        headers,
        colMap
      );
    }
  };

  reader.readAsArrayBuffer(file);
});
