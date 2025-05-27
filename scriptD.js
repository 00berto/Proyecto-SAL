document.getElementById("fileInput").addEventListener("change", function (e) {
  const file = e.target.files[0];
  const reader = new FileReader();

  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convertir a JSON incluyendo estilos
    const json = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: "",
      raw: true,
    });

    document.getElementById(
      "fileNameTitle"
    ).textContent = `Archivo cargado: ${file.name}`;

    const container = document.getElementById("tableContainer");
    container.innerHTML = "";

    let currentTable;
    let tbody;
    let headers = [];
    let currentSection = "";

    const createTable = (titleText) => {
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

      headers.forEach((col) => {
        const th = document.createElement("th");
        th.textContent = col;
        headerRow.appendChild(th);
      });

      ["SAL %", "Importe SAL", "A FINIRE %", "Importe A FINIRE"].forEach(
        (name) => {
          const th = document.createElement("th");
          th.textContent = name;
          if (name === "SAL %") th.classList.add("col-sal");
          headerRow.appendChild(th);
        }
      );

      thead.appendChild(headerRow);
      table.appendChild(thead);

      tbody = document.createElement("tbody");
      table.appendChild(tbody);
      tableWrapper.appendChild(table);
      container.appendChild(tableWrapper);

      return { table, tbody, tableWrapper };
    };

    let totals = {
      unitario: 0,
      sal: 0,
      finire: 0,
      importeSal: 0,
      importeFinire: 0,
    };

    let colMap = {};
    let previousRowWasTitle = false;

    // Obtener estilos de las celdas
    const cellStyles = {};
    if (worksheet["!cols"]) {
      worksheet["!cols"].forEach((col, colIndex) => {
        if (col && col.width) {
          cellStyles[colIndex] = { width: col.width };
        }
      });
    }

    // Filtrar filas vacías
    const filteredJson = json.filter((row) =>
      row.some((cell) => cell !== undefined && cell !== null && cell !== "")
    );

    filteredJson.forEach((row, index) => {
      // Detectar fila de encabezados
      if (index === 0) {
        headers = row;
        colMap = {
          unitario: headers.indexOf("Importe Unitario"),
          sal: headers.indexOf("SAL %"),
          finire: headers.indexOf("A FINIRE %"),
          importeSal: headers.indexOf("Importe SAL"),
          importeFinire: headers.indexOf("Importe A FINIRE"),
        };
        currentTable = createTable();
        return;
      }

      // Detectar fila de título (primera celda no vacía y resto vacías o con formato diferente)
      const isTitleRow =
        row[0] &&
        row[1] &&
        row.slice(2).every((v, i) => {
          // Si es número o vacío, no es título
          if (typeof v === "number" || v === "") return true;
          // Si es texto pero en columnas que deberían ser numéricas, no es título
          return !(
            headers[i] &&
            (headers[i].includes("Importe") || headers[i].includes("%"))
          );
        });

      // Detectar fin de tabla (fila completamente vacía o cambio de sección)
      const isEmptyRow = row.every(
        (cell) => cell === "" || cell === undefined || cell === null
      );

      if (isEmptyRow && tbody && tbody.children.length > 0) {
        addTotalRow();
        previousRowWasTitle = true;
        return;
      }

      if (isTitleRow) {
        // Si ya hay una tabla con datos, agregar fila de totales
        if (tbody && tbody.children.length > 0) {
          addTotalRow();
        }

        // Crear nueva tabla
        currentSection = `${row[0]} ${row[1]}`.trim();
        currentTable = createTable(currentSection);
        previousRowWasTitle = true;
        return;
      }

      // Si llegamos aquí, es una fila de datos normal
      previousRowWasTitle = false;

      const tr = document.createElement("tr");

      // Aplicar estilos de fondo desde Excel si existen
      const cellAddress = XLSX.utils.encode_cell({ r: index, c: 0 });
      if (
        worksheet[cellAddress] &&
        worksheet[cellAddress].s &&
        worksheet[cellAddress].s.bgColor
      ) {
        const bgColor = worksheet[cellAddress].s.bgColor;
        tr.style.backgroundColor = `rgb(${bgColor.rgb})`;
      }

      // Agregar celdas normales
      headers.forEach((header, i) => {
        const td = document.createElement("td");
        const value = row[i];

        // Formatear números con 2 decimales
        if (typeof value === "number") {
          if (header.includes("%")) {
            td.textContent = (value * 100).toFixed(2) + "%";
          } else {
            td.textContent = value.toFixed(2);
          }
        } else {
          td.textContent = value || "";
        }

        // Alinear números a la derecha
        if (typeof value === "number") {
          td.classList.add("text-end");
        }

        tr.appendChild(td);
      });

      // Agregar controles SAL
      const importeUnitario = parseFloat(row[colMap.unitario]) || 0;

      // Celda para ingresar SAL %
      const salTd = document.createElement("td");
      const salInput = document.createElement("input");
      salInput.type = "text";
      salInput.className = "form-control text-end col-sal";
      salInput.value = "0";
      salTd.appendChild(salInput);

      // Celda para Importe SAL (calculado)
      const importeSalTd = document.createElement("td");
      importeSalTd.textContent = "0.00";
      importeSalTd.classList.add("text-end");

      // Celda para A FINIRE %
      const finirePercentTd = document.createElement("td");
      finirePercentTd.textContent = "100.00%";
      finirePercentTd.classList.add("text-end");

      // Celda para Importe A FINIRE
      const importeFinireTd = document.createElement("td");
      importeFinireTd.textContent = importeUnitario.toFixed(2);
      importeFinireTd.classList.add("text-end");

      // Evento para calcular valores al cambiar SAL %
      salInput.addEventListener("input", function () {
        let salPercent = parseFloat(this.value.replace(",", ".")) || 0;
        salPercent = Math.min(Math.max(salPercent, 0), 100); // Asegurar entre 0-100

        // Calcular valores derivados
        const salAmount = (importeUnitario * salPercent) / 100;
        const finirePercent = 100 - salPercent;
        const finireAmount = importeUnitario - salAmount;

        // Actualizar celdas
        importeSalTd.textContent = salAmount.toFixed(2);
        finirePercentTd.textContent = finirePercent.toFixed(2) + "%";
        importeFinireTd.textContent = finireAmount.toFixed(2);

        // Actualizar totales
        updateTotals();
      });

      tr.appendChild(salTd);
      tr.appendChild(importeSalTd);
      tr.appendChild(finirePercentTd);
      tr.appendChild(importeFinireTd);

      currentTable.tbody.appendChild(tr);

      // Función para agregar fila de totales
      function addTotalRow() {
        const totalRow = document.createElement("tr");
        totalRow.className = "total-row";
        totalRow.style.fontWeight = "bold";
        totalRow.style.backgroundColor = "#f0f0f0";

        headers.forEach((header, i) => {
          const td = document.createElement("td");

          if (header === "Importe Unitario") {
            td.textContent = totals.unitario.toFixed(2);
          } else if (header === "Importe SAL") {
            td.textContent = totals.importeSal.toFixed(2);
          } else if (header === "Importe A FINIRE") {
            td.textContent = totals.importeFinire.toFixed(2);
          } else {
            td.textContent = "";
          }

          td.classList.add("text-end");
          totalRow.appendChild(td);
        });

        // Agregar celdas vacías para las columnas adicionales
        for (let i = 0; i < 4; i++) {
          const td = document.createElement("td");
          if (i === 1) td.textContent = totals.importeSal.toFixed(2);
          else if (i === 3) td.textContent = totals.importeFinire.toFixed(2);
          td.classList.add("text-end");
          totalRow.appendChild(td);
        }

        currentTable.tbody.appendChild(totalRow);

        // Reiniciar totales para la próxima tabla
        totals = {
          unitario: 0,
          sal: 0,
          finire: 0,
          importeSal: 0,
          importeFinire: 0,
        };
      }

      // Función para actualizar totales
      function updateTotals() {
        // Sumar todos los valores de la tabla actual
        let newTotals = {
          unitario: 0,
          sal: 0,
          finire: 0,
          importeSal: 0,
          importeFinire: 0,
        };

        Array.from(currentTable.tbody.children).forEach((row) => {
          if (!row.classList.contains("total-row")) {
            const unitarioCell = row.cells[colMap.unitario];
            const salCell = row.cells[headers.length]; // Celda de SAL %
            const importeSalCell = row.cells[headers.length + 1];
            const importeFinireCell = row.cells[headers.length + 3];

            newTotals.unitario += parseFloat(unitarioCell.textContent) || 0;
            newTotals.sal +=
              parseFloat(salCell.querySelector("input").value) || 0;
            newTotals.importeSal += parseFloat(importeSalCell.textContent) || 0;
            newTotals.importeFinire +=
              parseFloat(importeFinireCell.textContent) || 0;
          }
        });

        totals = newTotals;
      }
    });

    // Agregar fila de totales final si hay datos
    if (tbody && tbody.children.length > 0 && !previousRowWasTitle) {
      addTotalRow();
    }
  };

  reader.readAsArrayBuffer(file);
});
