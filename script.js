// Escucha el evento de carga de archivo Excel

// Requiere que tengas la librería SheetJS (XLSX) cargada
// y un contenedor con id="tableContainer" donde insertar las tablas

document.getElementById("fileInput").addEventListener("change", function (e) {
  const file = e.target.files[0];
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
    container.innerHTML = "";

    let currentTable;
    let tbody;
    let headers = [];

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

      tbody = document.createElement("tbody");
      table.appendChild(tbody);
      tableWrapper.appendChild(table);
      container.appendChild(tableWrapper);

      return { table, tbody };
    };

    let totals = { G: 0, H: 0, J: 0, L: 0 };
    let colMap = {};

    json.forEach((row, index) => {
      if (index === 0) {
        headers = row;
        colMap = {
          G: headers.indexOf("G"),
          H: headers.indexOf("H"),
          J: headers.indexOf("Importo SAL"),
          L: headers.indexOf("Importo A FINIRE"),
        };
        currentTable = createTable();
        return;
      }

      const isTitleRow = row[0] && row[1] && row.slice(2).every((v) => !v);

      if (isTitleRow) {
        // Insertar fila de totales
        if (tbody && tbody.children.length > 0) {
          const totalRow = document.createElement("tr");
          totalRow.classList.add("total-row");

          headers.forEach((_, i) => {
            const td = document.createElement("td");
            if (i === colMap.G) td.textContent = totals.G.toFixed(2);
            else if (i === colMap.H) td.textContent = totals.H.toFixed(2);
            else if (i === colMap.J) td.textContent = totals.J.toFixed(2);
            else if (i === colMap.L) td.textContent = totals.L.toFixed(2);
            else td.textContent = "";
            totalRow.appendChild(td);
          });

          // Columnas SAL extra vacías
          for (let i = 0; i < 4; i++) {
            totalRow.appendChild(document.createElement("td"));
          }

          tbody.appendChild(totalRow);
        }

        // Resetear totales y crear nueva tabla
        totals = { G: 0, H: 0, J: 0, L: 0 };
        currentTable = createTable(`${row[0]} ${row[1]}`);
        return;
      }

      const tr = document.createElement("tr");

      headers.forEach((_, i) => {
        const td = document.createElement("td");
        const value = row[i];
        td.textContent =
          typeof value === "number" ? value.toFixed(2) : value || "";
        tr.appendChild(td);
      });

      const hValue = parseFloat(row[colMap.H]) || 0;

      const salTd = document.createElement("td");
      const input = document.createElement("input");
      input.type = "text";
      input.className = "form-control text-end col-sal";
      input.placeholder = "0.00";
      salTd.appendChild(input);

      const salImporto = document.createElement("td");
      salImporto.textContent = "0.00";

      const finirePercent = document.createElement("td");
      finirePercent.textContent = "100.00%";

      const finireImporto = document.createElement("td");
      finireImporto.textContent = hValue.toFixed(2);

      input.addEventListener("input", () => {
        let val = parseFloat(input.value.replace(",", "."));
        val = isNaN(val) ? 0 : Math.min(Math.max(val, 0), 100);
        input.value = val.toFixed(2);

        if (val > 100 || val < 0) {
          input.classList.add("error");
        } else {
          input.classList.remove("error");
        }

        const percent = val / 100;
        salImporto.textContent = (hValue * percent).toFixed(2);
        finirePercent.textContent = ((1 - percent) * 100).toFixed(2) + "%";
        finireImporto.textContent = (hValue * (1 - percent)).toFixed(2);

        // Actualizar totales
        totals.J += parseFloat(salImporto.textContent);
        totals.L += parseFloat(finireImporto.textContent);
      });

      tr.appendChild(salTd);
      tr.appendChild(salImporto);
      tr.appendChild(finirePercent);
      tr.appendChild(finireImporto);

      totals.G += parseFloat(row[colMap.G]) || 0;
      totals.H += hValue;

      currentTable.tbody.appendChild(tr);
    });

    // Añadir última fila total si hay datos
    if (tbody && tbody.children.length > 0) {
      const totalRow = document.createElement("tr");
      totalRow.classList.add("total-row");
      headers.forEach((_, i) => {
        const td = document.createElement("td");
        if (i === colMap.G) td.textContent = totals.G.toFixed(2);
        else if (i === colMap.H) td.textContent = totals.H.toFixed(2);
        else if (i === colMap.J) td.textContent = totals.J.toFixed(2);
        else if (i === colMap.L) td.textContent = totals.L.toFixed(2);
        else td.textContent = "";
        totalRow.appendChild(td);
      });
      for (let i = 0; i < 4; i++)
        totalRow.appendChild(document.createElement("td"));
      tbody.appendChild(totalRow);
    }
  };

  reader.readAsArrayBuffer(file);
});
