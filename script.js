document.getElementById("fileInput").addEventListener("change", function (e) {
  const file = e.target.files[0];
  const reader = new FileReader();

  reader.onload = function (e) {
    //Nombre del achivo
    document.getElementById(
      "fileNameTitle"
    ).textContent = `Archivo cargado: ${file.name}`;

    //Cargar archivo EXCEL
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    //Vaciar tablas
    const table = document.getElementById("dataTable");
    table.innerHTML = "";

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    //Cabezera real de la tabla
    const excelHeaders = json[0];
    excelHeaders.forEach((colName) => {
      const th = document.createElement("th");
      th.textContent = colName;
      headerRow.appendChild(th);
    });

    //Columnas adicionales
    ["SAL %", "Importo SAL", "A FINIRE %", "Importo A FINIRE"].forEach(
      (name) => {
        const th = document.createElement("th");
        th.textContent = name;
        if (name === "SAL %") th.classList.add("col-sal"); // Aplica ancho especial
        headerRow.appendChild(th);
      }
    );

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    json.forEach((row, index) => {
      if (index === 0) return; // Saltar la cabecera

      const tr = document.createElement("tr");

      //Mostrar solo columnas A-H (index 0-7)
      for (let i = 0; i < 8; i++) {
        const td = document.createElement("td");
        if (row[i] !== undefined && row[i] !== "") {
          const value = parseFloat(row[i]);
          td.textContent = !isNaN(value) ? value.toFixed(2) : row[i];
        } else {
          td.textContent = "";
        }
        tr.appendChild(td);
      }

      // --- SAL % input ---
      const salTd = document.createElement("td");
      // salTd.classList.add("");

      const input = document.createElement("input");
      input.type = "number";
      input.className = "form-control text-end col-sal";
      input.min = "0";
      input.max = "100";
      input.placeholder = "0.00";

      salTd.appendChild(input);

      // --- Cálculo de valores ---
      const hValue = parseFloat(row[7]) || 0;

      const salImporto = document.createElement("td");
      salImporto.textContent = "0.00";

      const finirePercent = document.createElement("td");
      finirePercent.textContent = "100.00%";

      const finireImporto = document.createElement("td");
      finireImporto.textContent = hValue.toFixed(2);

      function updateSAL() {
        let val = parseFloat(input.value);
        val = isNaN(val) ? 0 : val;
        val = Math.max(0, Math.min(val, 100)); // Clamp entre 0-100
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
      }

      input.addEventListener("input", updateSAL);

      tr.appendChild(salTd);
      tr.appendChild(salImporto);
      tr.appendChild(finirePercent);
      tr.appendChild(finireImporto);

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
  };

  reader.readAsArrayBuffer(file);
});
