import * as d3 from "d3";


// Define CSV file paths
const files = [
  { file: "./Sessions by landing page - 2025-01-31 - 2025-01-31.csv", date: "2025-01-31" },
  { file: "./Sessions by landing page - 2025-02-01 - 2025-02-01.csv", date: "2025-02-01" },
  { file: "./Sessions by landing page - 2025-02-02 - 2025-02-02.csv", date: "2025-02-02" },
  { file: "./Sessions by landing page - 2025-02-03 - 2025-02-03.csv", date: "2025-02-03" },
  { file: "./Sessions by landing page - 2025-02-04 - 2025-02-04.csv", date: "2025-02-04" },
  { file: "./Sessions by landing page - 2025-02-05 - 2025-02-05.csv", date: "2025-02-05" },
  { file: "./Sessions by landing page - 2025-02-06 - 2025-02-06.csv", date: "2025-02-06" },
];

// Function to load all CSVs and transform data
async function loadData() {
  let allData = [];

  for (const { file, date } of files) {
    const data = await d3.csv(file, d => {

      return {
        year: date,
        name: d["Landing page path"] || "UNKNOWN",
        n: +d["Sessions"] || 0,
        cartAdditions: +d["Sessions with cart additions"] || 0,
        cvr: +d["Conversion rate"] * 100 || 0 // Ensure it's a number
      };
    });
    allData.push(...data);
  }
  // Group by date

  const cleanData_1 = allData.filter(d => (d.cartAdditions > 100))
  const cleanData_2 = allData.filter(d => (d.cartAdditions < 100 & d.cartAdditions > 50))
  const cleanData_3 = allData.filter(d => (d.cartAdditions < 50 & d.cartAdditions > 10))
  // console.log("Transformed Data:", cleanData); // Debugging
  // Convert JSON to CSV format
  // const csvContent = d3.csvFormat(transformedData);
  drawChart(cleanData_1, '#chart_1', "n");
  drawChart(cleanData_2, '#chart_2', "n");
  drawChart(cleanData_3, '#chart_3', "n");
  // drawChart(cleanData_2, '#chart_3', "n");


  // console.log(cleanData_1)
  // drawChart(cleanData_1, '#chart_2', "cartAdditions");
  // drawChart(cleanData_2, '#chart_3', "cartAdditions");
  // drawChart(cleanData_3, '#chart_4', "cartAdditions");
}

// Run Data Transformation
loadData();


// Function to draw the chart
function drawChart(data, classId, typeData) {
  // Set dimensions and margins
  //  console.log(data)
  const margin = { top: 10, right: 300, bottom: 30, left: 60 },
    width = 1500 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

  // Append the SVG object to the page
  const svg = d3.select(classId)
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);


  // 1️⃣ Group the data by `name` (Landing Page Path)
  const groupedCVRData = d3.group(data, d => d.name);

  data.forEach(d => {
    d.year = new Date(d.year);  // If you want to treat it as time
    d[typeData] = +d[typeData];              // Ensure `n` is a number
    d.cvr = d.cvr;
  });

  // 3) GET ALL UNIQUE 'name' VALUES (these become stacked "keys")
  const allNames = Array.from(new Set(data.map(d => d.name)));
  const dataByYear = d3.rollups(
    data,
    (v) => {
      // v is the array of rows for this particular year
      // Build an object that has each "name" as a property
      const rowObj = {};
      v.forEach(d => {
        rowObj[d.name] = d[typeData];
      });
      rowObj.cvr = d3.mean(v, d => d.cvr);
      // We'll also store the actual date (or year string) itself
      rowObj.year = v[0].year;
      return rowObj;
    },
    d => d.year
  )
    // rollups() returns an array of [key, value], so map it to just the objects:
    .map(([year, obj]) => obj);

  // 5) SORT dataByYear by date if needed
  dataByYear.sort((a, b) => a.year - b.year);

  // 6) CREATE THE STACK GENERATOR
  const stack = d3.stack()
    .keys(allNames)                 // all the "name" fields
    .value((d, key) => d[key] || 0) // handle missing keys safely

  const stackedData = stack(dataByYear);

  // 7) CREATE SCALES
  //    X scale -> time scale from earliest to latest
  const x = d3.scaleTime()
    .domain(d3.extent(dataByYear, d => d.year))
    .range([0, width]);

  //    Y scale -> from 0 up to the max of stacked sums
  const y = d3.scaleLinear()
    .domain([0, d3.max(stackedData, layer => d3.max(layer, d => d[1]))])
    .range([height, 0]);


  // 8) ADD AXES
  svg.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x).ticks(5));

  svg.append("g")
    .call(d3.axisLeft(y));
  const myColors = [
    "#E63946", // Vibrant Red
    "#F4A261", // Orange
    "#E9C46A", // Yellow
    "#2A9D8F", // Teal
    "#264653", // Deep Blue
    "#D7263D", // Strong Red
    "#3A86FF", // Bright Blue
    "#8338EC", // Deep Purple
    "#FF006E", // Hot Pink
    "#FB5607", // Fiery Orange
    "#06D6A0", // Bright Green
    "#118AB2", // Ocean Blue
    "#73A857", // Leaf Green
    "#FFBE0B", // Golden Yellow
    "#8E44AD", // Royal Purple
    "#3498DB", // Sky Blue
    "#D81159", // Rose Red
    "#FF4500", // Strong Orange
    "#00A6ED", // Electric Blue
    "#FF4D6D"  // Soft Coral
  ];


  // 9) COLOR PALETTE FOR THE LAYERS
  const color = d3.scaleOrdinal()
    .domain(allNames)
    .range(myColors);  // or any palette you like

  // 10) DRAW THE STACKED AREAS
  svg.selectAll(".layer")
    .data(stackedData)
    .join("path")
    .attr("class", "layer")
    .style("fill", d => color(d.key))
    .attr("d", d3.area()
      .x(d => x(d.data.year))
      .y0(d => y(d[0]))
      .y1(d => y(d[1]))
    );


  // The label text

  const legend = svg.selectAll(".legend")
    .data(allNames)
    .enter()
    .append("g")
    .attr("class", "legend")
    // Shift each item downward so they don't overlap
    .attr("transform", (d, i) => `translate(30, ${i * 20})`);

  // 2) Draw a small colored square for each name
  legend.append("rect")
    .attr("x", width + 10)    // position to the right of the chart
    .attr("y", 10)            // small top margin
    .attr("width", 10)
    .attr("height", 10)
    .style("fill", d => color(d));

  // 3) Add text labels next to each colored square
  legend.append("text")
    .attr("x", width + 30)   // a bit more to the right of the rectangle
    .attr("y", 18)           // roughly in the middle of the rectangle
    .attr("text-anchor", "start")
    .style("alignment-baseline", "middle")
    .style("font-size", "12px")
    .text(d => d);





  const yRight = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.cvr) * 1.2])  // Scale up for better spacing
    .range([height, 0]);

  // 1️⃣ Append the right Y-axis for CVR
  svg.append("g")
    .attr("class", "axisRight")
    .attr("transform", `translate(${width}, 0)`)  // Moves the axis to the right side
    .call(d3.axisRight(yRight)); // Call the right-side axis


  // 1️⃣ Create a tooltip div (hidden by default)
  const tooltip = d3.select("body")
    .append("div")
    .style("position", "absolute")
    .style("background", "rgba(0, 0, 0, 0.8)")
    .style("color", "white")
    .style("padding", "8px 12px")
    .style("border-radius", "5px")
    .style("font-size", "12px")
    .style("pointer-events", "none") // Ensures it doesn't interfere with mouse events
    .style("opacity", 0); // Initially hidden

  // 2️⃣ Draw a separate line for each name
  groupedCVRData.forEach((values, name) => {

    svg.append("path")
      .datum(values)
      .attr("fill", "none")
      .attr("stroke", "black")
      .attr("stroke-width", 3)
      .attr("stroke-dasharray", "5,5")
      .attr("d", d3.line()
        .x(d => x(d.year))
        .y(d => yRight(d.cvr))
      );

    svg.append("path")
      .datum(values)
      .attr("fill", "none")
      .attr("stroke", color(name))
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5")
      .attr("d", d3.line()
        .x(d => x(d.year))
        .y(d => yRight(d.cvr))
      );

    // 3️⃣ Add Circles for Each Data Point
    svg.selectAll(`.cvr-dot-${name.replace(/\W/g, "")}`)
      .data(values)
      .enter()
      .append("circle")
      .attr("cx", d => x(d.year))
      .attr("cy", d => yRight(d.cvr))
      .attr("r", 6) // Increase radius for better hover interaction
      .attr("fill", color(name))
      .attr("stroke", "white")
      .attr("stroke-width", 1)

      // 🎯 Add tooltip event listeners
      .on("mouseover", (event, d) => {
        tooltip
          .style("opacity", 1)
          .html(`
            <strong>Page:</strong> ${name}<br>
            <strong>CVR:</strong> ${d.cvr.toFixed(2)}%
          `);
      })
      .on("mousemove", event => {
        tooltip
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 20) + "px");
      })
      .on("mouseout", () => {
        tooltip.style("opacity", 0);
      });
  });

  // 4️⃣ Legend
  const cvrLegend = svg.append("g")
    .attr("transform", `translate(${width + 20}, 20)`);

  groupedCVRData.forEach((_, name, i) => {
    const legendRow = cvrLegend.append("g")
      .attr("transform", `translate(0, ${i * 20})`);

    legendRow.append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", 20)
      .attr("y2", 0)
      .attr("stroke", color(name))
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5");
  });


}


// we first need to import the files 
const filesPages = [
  { file: "./Sessions by landing page - 2025-02-02 - 2025-02-02.csv", date: "2025-02-02" },
  { file: "./Sessions by landing page - 2025-02-03 - 2025-02-03.csv", date: "2025-02-03" },
  { file: "./Sessions by landing page - 2025-02-04 - 2025-02-04.csv", date: "2025-02-04" },
  { file: "./Sessions by landing page - 2025-02-05 - 2025-02-05.csv", date: "2025-02-05" },
];

const saleState = [
  { file: "./Total sales by shipping region - 2025-01-31 - 2025-01-31.csv", date: "2025-01-31" },
  { file: "./Total sales by shipping region - 2025-02-01 - 2025-02-01.csv", date: "2025-02-01" },
  { file: "./Total sales by shipping region - 2025-02-02 - 2025-02-02.csv", date: "2025-02-02" },
  { file: "./Total sales by shipping region - 2025-02-03 - 2025-02-03.csv", date: "2025-02-03" },
  { file: "./Total sales by shipping region - 2025-02-04 - 2025-02-04.csv", date: "2025-02-04" },
  { file: "./Total sales by shipping region - 2025-02-05 - 2025-02-05.csv", date: "2025-02-05" },
  { file: "./Total sales by shipping region - 2025-02-06 - 2025-02-06.csv", date: "2025-02-06" },
]

const salesReferrer = [
  { file: "./Total sales by referrer - 2025-01-31 - 2025-01-31.csv", date: "2025-01-31" },
  { file: "./Total sales by referrer - 2025-02-01 - 2025-02-01.csv", date: "2025-02-01" },
  { file: "./Total sales by referrer - 2025-02-02 - 2025-02-02.csv", date: "2025-02-02" },
  { file: "./Total sales by referrer - 2025-02-03 - 2025-02-03.csv", date: "2025-02-03" },
  { file: "./Total sales by referrer - 2025-02-04 - 2025-02-04.csv", date: "2025-02-04" },
  { file: "./Total sales by referrer - 2025-02-05 - 2025-02-05.csv", date: "2025-02-05" },
  { file: "./Total sales by referrer - 2025-02-06 - 2025-02-06.csv", date: "2025-02-06" },
];

const filesSales = [
  { file: "./Total sales by social referrer - 2025-02-02 - 2025-02-02.csv", date: "2025-02-02" },
  { file: "./Total sales by social referrer - 2025-02-03 - 2025-02-03.csv", date: "2025-02-03" },
];


const filesProduct = [
  { file: "./Total sales by product - 2025-02-02 - 2025-02-02.csv", date: "2025-02-02" },
  { file: "./Total sales by product - 2025-02-03 - 2025-02-03.csv", date: "2025-02-03" },
];

const fileOrders = [
  // { file: "./orders_export_5.csv", date: "2025-02-01" },
  // { file: "./orders_export_6.csv", date: "2025-02-02" },
  // { file: "./orders_export_7.csv", date: "2025-02-03" },
  { file: "./orders_export_2025-02-04.csv", date: "2025-02-04" },
  { file: "./orders_export_2025-02-05.csv", date: "2025-02-05" },
  { file: "./orders_export_2025-02-06.csv", date: "2025-02-06" },
  { file: "./orders_export_2025-02-07.csv", date: "2025-02-07" },
  { file: "./orders_export_2025-02-08.csv", date: "2025-02-08" },
  { file: "./orders_export_2025-02-09.csv", date: "2025-02-09" },
  { file: "./orders_export_2025-02-10.csv", date: "2025-02-10" },
];

// Function to load all CSVs and transform data
async function loadDataTwo() {
  let allData = [];

  for (const { file, date } of filesPages) {
    const data = await d3.csv(file, d => {

      return {
        year: date,
        name: d["Landing page path"] || "UNKNOWN",
        n: +d["Sessions"] || 0,
        cartAdditions: +d["Sessions with cart additions"] || 0,
        cvr: +d["Conversion rate"] * 100 || 0 // Ensure it's a number
      }
    });
    allData.push(...data);
  }

  let allSaleState = [];

  for (const { file, date } of saleState) {
    const data = await d3.csv(file, d => {

      return {
        date,
        states: d["Shipping region"],
        totalSales: +d["Total sales"] || 0,
      }
    });
    allSaleState.push(...data);
  }

  let allSaleReferrer = [];

  for (const { file, date } of salesReferrer) {
    const data = await d3.csv(file, d => {

      return {
        date: new Date(date),
        name: d["Order referrer name"] || "UKNOWN",
        totalSales: +d["Net sales"] || 0,
      }
    });
    allSaleReferrer.push(...data);
  }

  let allFileOrders = [];

  const productNames = [
    "All Day Balconette",
    "Relief Bra",
    "Mesh Bralette",
    "3D Precision Bra",
    "Bralette"
  ];
  
function parseName(fullName) {
  // 1) First, check for the most specific product types (excluding "Bralette")
  for (let product of productNames) {
    if (product !== "Bralette" && fullName.endsWith(product)) {
      const color = fullName.slice(0, fullName.length - product.length).trim();
      return { product, color };
    }
  }

  // 2) Then, check for "Mesh Bralette" specifically
  if (fullName.endsWith("Mesh Bralette")) {
    const color = fullName.slice(0, fullName.length - "Mesh Bralette".length).trim();
    return { product: "Mesh Bralette", color };
  }

  // 3) Finally, if nothing else matches, assume it's just "Bralette"
  if (fullName.endsWith("Bralette")) {
    const color = fullName.slice(0, fullName.length - "Bralette".length).trim();
    return { product: "Bralette", color };
  }

  // 4) If nothing matched, return the full name as a fallback (to prevent errors)
  return { product: fullName, color: "" };
}


  for (const { file, date } of fileOrders) {
    const data = await d3.csv(file, d => {
      if (d["Lineitem name"]?.includes("Extender")) return null;
      if (d["Lineitem name"]?.includes("Subscription")) return null;
      if (d["Name"]?.includes("EXC")) return null;
      // console.log(new Date( d["Created at"]), d["Created at"]  )
      // console.log(d)
      // if(d["Name"]?.includes("EXC"))console.log(d["Name"])
      let variant;
      let name;
      if (d["Lineitem name"]) {
        const parts = d["Lineitem name"].split(" - ");
        name = parts[0] || "Unknown";
        variant = parts[1]?.toLowerCase();
      }

      return {
        // Convert the passed-in 'date' to a Date object
        date: new Date(date),
        name,
        variant,
        quantity: +d["Lineitem quantity"] || 0,
      };
    });
    // Flatten everything into one array
    allFileOrders.push(...data);
  }


  const groupedData = d3.rollup(
    allFileOrders,
    v => d3.sum(v, d => d.quantity),  // Sum the quantity per variant
    d => d.date,
    d => d.name,  // Group by product name
    d => d.variant, // Then group by variant
  );

  // Convert the Map into a structured array
  const groupedArray = [];

  for (const [date, nameMap] of groupedData) {
    for (const [name, variantMap] of nameMap) {
      // Build an array of { variant, totalQuantity }
      const variantsArr = Array.from(variantMap, ([variant, totalQuantity]) => ({
        variant,
        totalQuantity
      }));

      // Push the new object into finalData
      groupedArray.push({
        date,
        name,
        variants: variantsArr
      });
    }
  }

  const filteredProducts = groupedArray.filter(product =>
    /Balconette|Bra|Bralette/i.test(product.name) // Case-insensitive regex match
  );

  // (2) Convert your data so each entry has { product, color }
  function preprocessData(data) {
    return data.map(d => {
      const { product, color } = parseName(d.name);
      return {
        ...d,
        product,
        color,
      };
    });
  }

  // 6) Create a new dataset with product/color fields
  const originalData = preprocessData(filteredProducts);

  // 7) Identify unique products & colors from the data
  //    (We'll use these to build the checkboxes)
  window.allProducts = Array.from(new Set(originalData.map(d => d.product)));
  window.allColors = Array.from(new Set(originalData.map(d => d.color)));
  // (Using window.* is just one way to make them accessible in your updateChart function. 
  //  You could also define them in an outer scope.)

  // 8) Build the UI (the checkboxes), passing updateChart as the callback
  createCheckboxes("#product-filters", allProducts, updateChart);
  createCheckboxes("#color-filters", allColors, updateChart);
  // 4) Build date filter
  d3.select("#daysSelector").on("change", updateChart);

  console.log(filteredProducts);
  console.log(originalData)


  const cleanData_1 = allData.filter(d => (d.cartAdditions > 100))
  const cleanData_2 = allSaleReferrer.filter(d => (d.totalSales > 500))
  // console.log('landing pages', cleanData_1)
  // console.log('Sales by state', allSaleState)
  // console.log('Sales by referrer', allSaleReferrer)
  console.log(allFileOrders)
  drawHeatMap(allSaleState)
  // drawAreaChannel(cleanData_2, "#marketing", "totalSales")
  simpleLineChart(allSaleReferrer);
  // drawMultipleLines(filteredProducts, "#products");
  drawMultipleStackedBars(originalData)

   // 10) The actual update function that reacts to checkboxes:
   function updateChart() {
    // 1) which products are selected?
    const selectedProducts = [];
    d3.selectAll("#product-filters input[type=checkbox]")
      .each(function(d) {
        if (d3.select(this).property("checked")) {
          selectedProducts.push(d3.select(this).attr("value"));
        }
      });
    // 2) which colors are selected?
    const selectedColors = [];
    d3.selectAll("#color-filters input[type=checkbox]")
      .each(function(d) {
        if (d3.select(this).property("checked")) {
          selectedColors.push(d3.select(this).attr("value"));
        }
      });

    // 3) if nothing is checked, interpret as "all selected"
    const productsFilter = selectedProducts.length ? selectedProducts : allProducts;
    const colorsFilter = selectedColors.length ? selectedColors : allColors;

    // 4) read the #daysSelector value
  const selectedDays = +d3.select("#daysSelector").node().value; 
  // e.g. 1, 3, 6, 30, or 9999

  // figure out the maximum date among all data
  // (We assume originalData is the preprocessed array you already have)
  const maxDate = d3.max(originalData, d => d.date);
  // if there's no data, bail out
  if (!maxDate) {
    drawMultipleStackedBars([]); 
    return;
  }

  // compute the cutoff date (today's max - selectedDays)
  // If "9999" is chosen => user wants "All", so we won't filter by date
  let cutoff = null;
  if (selectedDays !== 9999) {
    cutoff = new Date(maxDate.getTime() - (selectedDays * 24 * 60 * 60 * 1000));
  }

  // 5) Filter the originalData by product, color, and date
  const filteredData = originalData.filter(d => {
    // must match the product filter
    const productMatch = productsFilter.includes(d.product);
    // must match the color filter
    const colorMatch = colorsFilter.includes(d.color);
    // must be on or after cutoff date (if we have a cutoff)
    const dateMatch = cutoff ? (d.date >= cutoff) : true;
    return productMatch && colorMatch && dateMatch;
  });

    // 5) Re‐draw the stacked bars with the filtered subset
    drawMultipleStackedBars(filteredData);
  }
}
//  shop, online store, fc instagram.
loadDataTwo()

function drawHeatMap(data) {


  // Increase left margin to allow space for longer x-axis labels
  const margin = { top: 30, right: 30, bottom: 60, left: 100 }, // Increased left and bottom margin
    width = 1000 - margin.left - margin.right,
    height = 700 - margin.top - margin.bottom;

  // Append the svg object
  const svg = d3.select("#my_dataviz")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Build X scales and axis:
  const x = d3.scaleBand()
    .range([0, width])
    .domain(data.map(d => d.date))
    .padding(0.01);

  const xAxis = svg.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text") // Select x-axis labels
    .attr("dx", "0.5em") // Move right
    .attr("dy", "1.5em"); // Move down slightly

  // Build Y scales and axis:
  const y = d3.scaleBand()
    .range([height, 0]) // Y-axis goes from bottom to top
    .domain(data.map(d => d.states)) // Extracts all state names
    .padding(0.01);

  svg.append("g")
    .call(d3.axisLeft(y));



  // Define a color scale for total sales
  const myColor = d3.scaleSequential(d3.interpolateBlues)
    .domain([d3.min(data, d => d.totalSales), d3.max(data, d => d.totalSales)]);

  // Draw the heat map
  svg.selectAll("rect")
    .data(data, function (d) { return d.date + ':' + d.states; }) // Unique key
    .join("rect")
    .attr("x", function (d) { return x(d.date); }) // Map date to x-axis
    .attr("y", function (d) { return y(d.states); }) // Map state to y-axis
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .style("fill", function (d) { return myColor(d.totalSales); }); // Use total sales for color


  // Create a tooltip div
  const tooltip = d3.select("#my_dataviz")
    .append("div")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("background", "white")
    .style("border", "1px solid #ccc")
    .style("padding", "8px")
    .style("border-radius", "5px")
    .style("font-size", "12px")
    .style("pointer-events", "none");

  // Add tooltip interactions to the heatmap
  svg.selectAll("rect")
    .on("mouseover", function (event, d) {
      tooltip.style("visibility", "visible")
        .html(`<strong>Date:</strong> ${d.date}<br><strong>State:</strong> ${d.states}<br><strong>Sales:</strong> $${d.totalSales.toFixed(2)}`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 20) + "px");
      d3.select(this).style("stroke", "#000").style("stroke-width", "1px"); // Highlight the hovered cell
    })
    .on("mousemove", function (event) {
      tooltip.style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 20) + "px");
    })
    .on("mouseout", function () {
      tooltip.style("visibility", "hidden");
      d3.select(this).style("stroke", "none"); // Remove highlight
    });
}

function drawAreaChannel(data, classId, typeData = "totalSales") {

  // set the dimensions and margins of the graph
  const margin = { top: 10, right: 100, bottom: 100, left: 100 },
    width = 1300 - margin.left - margin.right,
    height = 700 - margin.top - margin.bottom;

  // append the svg object to the body of the page
  const svg = d3.select(classId)
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  data.forEach(d => {
    d.date = new Date(d.date);
  });

  // 2) Group data by `date`
  const groupedData = d3.rollups(
    data,
    (values) => {
      const row = { date: d3.timeFormat("%Y-%m-%d")(values[0].date) }; // Format date
      values.forEach(d => {
        row[d.name] = d.totalSales; // Set channel as key, sales as value
      });
      return row;
    },
    d => d.date // Group by date
  ).map(d => d[1]); // Extract the second element (the grouped object)


  // Now `wideData` looks like:
  // console.log("data", groupedData);
  // List of groups (here I have one group per column)
  const allGroup = data.map(d => d.name)//["valueA", "valueB", "valueC"]

  // Reformat the data: we need an array of arrays of {x, y} tuples
  const dataReady = allGroup.map(function (grpName) { // .map allows to do something for each element of the list
    return {
      name: grpName,
      values: groupedData.map(function (d) {
        return { date: new Date(d.date), value: d[grpName] = d[grpName] ? +d[grpName] : 0 };
      })
    };
  });

  // console.log('clean data', dataReady)

  // d3.csv("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/data_connectedscatter.csv").then(function (data) {
  //   console.log(data)
  // })
  // I strongly advise to have a look to dataReady with
  // console.log(dataReady)

  // A color scale: one color for each group
  const myColor = d3.scaleOrdinal()
    .domain(allGroup)
    .range(d3.schemeSet2);

  const xScale = d3.extent(groupedData, d => new Date(d.date))
  // Add X axis --> it is a date format
  // console.log("x scale", xScale)

  const x = d3.scaleTime()
    .domain(xScale)
    .range([0, width]);

  svg.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x));

  const yScale = d3.extent(data, d => +d.totalSales)

  // console.log("yscale", yScale)
  // Add Y axis
  const y = d3.scaleLinear()
    .domain(yScale)
    .range([height, 0]);
  svg.append("g")
    .call(d3.axisLeft(y));

  // Add the lines
  const line = d3.line()
    .x(d => x((d.date)))
    .y(d => y(+d.value))

  svg.selectAll("myLines")
    .data(dataReady)
    .join("path")
    .attr("d", d => {
      // console.log("Line data:", d.values); // Check the data
      // console.log("Mapped x:", d.values.map(v => x((v.date)))); // Debug X
      // console.log("Mapped y:", d.values.map(v => y(v.value))); // Debug Y

      return line(d.values)
    })
    .attr("stroke", d => myColor(d.name))
    .style("stroke-width", 4)
    .style("fill", "none")

  // Add the points
  svg
    // First we need to enter in a group
    .selectAll("myDots")
    .data(dataReady)
    .join('g')
    .style("fill", d => myColor(d.name))
    // Second we need to enter in the 'values' part of this group
    .selectAll("myPoints")
    .data(d => d.values)
    .join("circle")
    .attr("cx", d => x(d.date))
    .attr("cy", d => y(d.value))
    .attr("r", 5)
    .attr("stroke", "white")


  // console.log("dataReady:", dataReady);
  // console.log("dataReady values sample:", dataReady[0]?.values);



  // Add a legend at the end of each line
  svg
    .selectAll("myLabels")
    .data(dataReady)
    .join('g')
    .append("text")
    .datum(d => { return { name: d.name, value: d.values[d.values.length - 1] }; }) // keep only the last value of each time series
    .attr("transform", d => `translate(${x(d.value.date)},${y(d.value.value)})`) // Put the text at the position of the last point
    .attr("x", 12) // shift the text a bit more right
    .text(d => d.name)
    .style("fill", d => myColor(d.name))
    .style("font-size", 15)
}

function simpleLineChart(data, classId) {
  // set the dimensions and margins of the graph
  const margin = { top: 10, right: 30, bottom: 30, left: 60 },
    width = 1100 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

  // append the svg object to the body of the page
  const svg = d3.select("#my_dataviz2")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // console.clear()
  const newData = data.filter(d => d.name == 'instagram');

  const groupedData = Object.values(newData.reduce((acc, entry) => {
    const dateKey = new Date(entry.date); // Normalize to only the date part
    if (!acc[dateKey]) {
      acc[dateKey] = { date: dateKey, name: entry.name, totalSales: 0 };
    }
    acc[dateKey].totalSales += entry.totalSales;
    return acc;
  }, {}));

  // console.log("group data", groupedData);

  // console.log(newData);
  // const newData = data.map

  //Read the data
  // d3.csv("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/connectedscatter.csv",
  //   // When reading the csv, I must format variables:
  //   function (d) {
  //     return { date: d3.timeParse("%Y-%m-%d")(d.date), value: d.value }
  //   }).then(
  //     // Now I can use this dataset:
  //     function (data) {
  // Add X axis --> it is a date format
  const x = d3.scaleTime()
    .domain(d3.extent(groupedData, d => d.date))
    .range([0, width]);
  svg.append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x));
  // Add Y axis
  const y = d3.scaleLinear()
    .domain([0, d3.max(groupedData, (d => d.totalSales))])
    .range([height, 0]);
  svg.append("g")
    .call(d3.axisLeft(y));
  // Add the line
  svg.append("path")
    .datum(groupedData)
    .attr("fill", "none")
    .attr("stroke", "#69b3a2")
    .attr("stroke-width", 1.5)
    .attr("d", d3.line()
      .x(d => x(d.date))
      .y(d => y(d.totalSales))
    )
  // Add the points
  svg
    .append("g")
    .selectAll("dot")
    .data(groupedData)
    .join("circle")
    .attr("cx", d => x(d.date))
    .attr("cy", d => y(d.totalSales))
    .attr("r", 5)
    .attr("fill", "#69b3a2")
  // })
}


function drawMultipleLines(newData, classId) {


  const xDomain = [
    "xs",
    "sm",
    "md",
    "lg",
    "xl",
    "sdd",
    "mdd",
    "ldd",
    "xldd",
    "2xldd"
  ];


  const data = newData
    .map(product => ({
      ...product,
      totalQuantity: product.variants.reduce((sum, v) => sum + v.totalQuantity, 0) // Sum all variant quantities
    }))
    .sort((a, b) => b.totalQuantity - a.totalQuantity) // Sort descending by totalQuantity
    .map(({ totalQuantity, ...rest }) => rest); // Remove totalQuantity from final output

  console.log("product", data);
  // A color scale (you can replace schemeSet2 with any other D3 palette)
  const color = d3.scaleOrdinal(d3.schemeSet2);
  // 2) Chart dimensions
  const width = 400;
  const height = 300;
  const margin = { top: 30, right: 20, bottom: 50, left: 40 };

  // 3) Select the container
  const container = d3.select("#products");

  // 4) Create a chart for each product
  data.forEach(product => {

    // A) Append a new <svg> for this product
    const svg = container.append("svg")
      .attr("width", width)
      .attr("height", height);

    // B) Prepare scales

    // X-scale: each variant on the x-axis (band scale)
    const x = d3.scaleBand()
      .domain(xDomain)
      .range([margin.left, width - margin.right])
      .padding(0.1);

    // Y-scale: quantity on the y-axis (linear scale)
    // We find the max quantity among all variants to define the domain
    const maxQuantity = d3.max(product.variants, d => d.totalQuantity);
    const y = d3.scaleLinear()
      .domain([0, maxQuantity])  // from 0 up to the max quantity
      .range([height - margin.bottom, margin.top])  // invert so 0 is at bottom

    // C) Draw bars
    svg.selectAll("rect")
      .data(product.variants)
      .enter()
      .append("rect")
      .attr("x", d => x(d.variant))
      .attr("y", d => y(d.totalQuantity))
      .attr("width", x.bandwidth())
      .attr("height", d => (height - margin.bottom) - y(d.totalQuantity))
      .attr("fill", "steelblue");

    // D) Add X-axis (variant labels)
    svg.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0, ${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .selectAll("text")  // optional: rotate labels if needed
      .style("text-anchor", "end")
      .attr("dx", "-0.5em")
      .attr("dy", "-0.2em")
      .attr("transform", "rotate(-30)");

    // E) Add Y-axis (quantities)
    svg.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(y).ticks(6)); // adjust ticks as desired

    // F) Add product title at the top
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", margin.top / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .text(product.name);
  });
}

function drawMultipleStackedBars(data) {

  const newData = data
    .map(product => ({
      ...product,
      totalQuantity: product.variants.reduce((sum, v) => sum + v.totalQuantity, 0) // Sum all variant quantities
    }))
    .sort((a, b) => b.totalQuantity - a.totalQuantity) // Sort descending by totalQuantity
    .map(({ totalQuantity, ...rest }) => rest); // Remove totalQuantity from final output

  // 1) Identify all product names by grouping
  const productsMap = d3.group(newData, d => d.name);
  // productsMap is a Map: { "Nude Bralette" -> [ {date, name, variants: [...]}, ... ] }

  // 2) Set up chart dimensions and container
  const width = 400;
  const height = 300;
  const margin = { top: 30, right: 20, bottom: 50, left: 40 };

  const container = d3.select("#products_two").html(""); // clear or use .select() as needed

  // 3) For each product, build a stacked-bar chart
  for (const [productName, entries] of productsMap) {
    // A) Gather & sort all unique dates present in this product’s entries
    const dateKeys = Array.from(
      new Set(entries.map(d => +d.date)) // +d.date => numeric timestamp for sorting
    ).sort((a, b) => a - b);

    // B) Gather all possible variants
    //    Some dates might not have every variant, so we check them all

    const allVariants = [
      "xs",
      "sm",
      "md",
      "lg",
      "xl",
      "sdd",
      "mdd",
      "ldd",
      "xldd",
      "2xldd"
    ];



    // C) Pivot the data so each object has structure:
    //    { variant: "xs", [date1]: qty, [date2]: qty, ... }
    const pivotedData = allVariants.map(variant => {
      const row = { variant };
      // Initialize all date columns to 0
      for (const dateVal of dateKeys) {
        row[dateVal] = 0;
      }
      // Fill in actual quantities from each entry
      for (const entry of entries) {
        const varData = entry.variants.find(v => v.variant === variant);
        if (varData) {
          row[+entry.date] = varData.totalQuantity;
        }
      }
      return row;
    });

    // D) Prepare the stack generator
    //    Each date is a separate layer in the stack
    const stack = d3.stack()
      .keys(dateKeys); // your "layers" are the different dates

    // Generate the stacked layers
    const series = stack(pivotedData);
    // 'series' is an array of layers (one layer per date).
    // Each layer is an array of points ([y0, y1]) for each variant row.

    // E) Compute max stacked value to define y-scale
    const maxStackedValue = d3.max(series, layer =>
      d3.max(layer, d => d[1])
    );

    // F) Create scales
    const x = d3.scaleBand()
      .domain(allVariants) // each variant on x-axis
      .range([margin.left, width - margin.right])
      .padding(0.1);

    const y = d3.scaleLinear()
      .domain([0, maxStackedValue])
      .range([height - margin.bottom, margin.top]);

    // A color scale for the "layers" (i.e. each date)
    const color = d3.scaleOrdinal()
      .domain(dateKeys.map(String))
      .range(d3.schemeSet2);

    // G) Create an <svg> for this product
    const svg = container.append("svg")
      .attr("width", width)
      .attr("height", height);

    // H) Draw stacked bars
    //    One <g> per layer (date), then rectangles for each variant row
    // svg.selectAll("g.layer")
    //   .data(series)
    //   .enter().append("g")
    //     .attr("class", "layer")
    //     .attr("fill", (d, i) => color(String(dateKeys[i])))
    //   .selectAll("rect")
    //   .data(d => d) // each sub-array for the variants
    //   .enter().append("rect")
    //     .attr("x", d => x(d.data.variant))
    //     .attr("y", d => y(d[1]))
    //     .attr("height", d => y(d[0]) - y(d[1]))
    //     .attr("width", x.bandwidth());

    // 1) Create a tooltip (often appended to <body> or the container)
    const tooltip = d3.select("body")
      .append("div")
      .style("position", "absolute")
      .style("pointer-events", "none")
      .style("background", "#fff")
      .style("border", "1px solid #999")
      .style("border-radius", "4px")
      .style("padding", "5px 8px")
      .style("font-size", "12px")
      .style("opacity", 0); // start hidden

    // H) Draw stacked bars with a "layer reveal" animation.
    const bar = svg.selectAll("g.layer")
      .data(series)
      .enter().append("g")
      .attr("class", "layer")
      .attr("fill", (d, i) => color(String(dateKeys[i])));

    // First, append <rect> elements with y= y(0) and height=0
    // so they are "collapsed."
    bar.selectAll("rect")
      .data(d => d)
      .enter().append("rect")
      .attr("x", d => x(d.data.variant))
      .attr("width", x.bandwidth())
      .attr("y", y(0))       // start from the bottom
      .attr("height", 0)    // no initial height
      // 4) Add tooltip events
      .on("mouseover", function (event, dRect) {
        // 'this' is the rect; 'dRect' is the stacked point [y0, y1],
        // plus dRect.data for the row data (which includes `variant`).

        // The parent group has data for the entire layer:
        //   each barGroups node has the form: [ [y0,y1], [y0,y1], ... ]
        // But we actually need the date index from the parent's data index.
        // Easiest is to do the “each” layering approach shown below,
        // or simply store the date inside a local variable.
        // If we structured it using barGroups.each(...) see next code block.

        tooltip.style("opacity", 1);

        // Quantity is (y1 - y0)
        const quantity = dRect[1] - dRect[0];
        // The layer index is the parent <g>’s datum index:
        const layerIndex = d3.select(this.parentNode).datum().index;
        // (But in standard d3.stack output, the .index property may vary 
        //  depending on your d3 version. You can also pass it around manually.)

        // If your stack data doesn’t have .index, you can do:
        //   const g = d3.select(this.parentNode);
        //   const i = barGroups.nodes().indexOf(g.node());
        //   const dateVal = dateKeys[i];
        // OR just do the barGroups.each(...) approach (shown below).

        // For demonstration, let's assume "layerIndex" gives the correct date index:
        const dateVal = dateKeys[layerIndex];
        // Convert dateVal (timestamp) to a nice string
        const dateStr = d3.timeFormat("%Y-%m-%d")(new Date(dateVal));

        tooltip.html(`
        <strong>Date:</strong> ${dateStr}<br/>
        <strong>Variant:</strong> ${dRect.data.variant}<br/>
        <strong>Qty:</strong> ${quantity}
      `);
      })
      .on("mousemove", function (event) {
        // Move tooltip near the mouse
        tooltip
          .style("left", (event.pageX + 12) + "px")
          .style("top", (event.pageY + 12) + "px");
      })
      .on("mouseout", function () {
        tooltip.style("opacity", 0);
      });
    // Now, for each layer, transition the rectangles to their
    // correct stacked heights, adding a delay so that each date
    // appears in sequence. i * 1000 => wait 1s per layer index.
    bar.each(function (d, i) {
      d3.select(this).selectAll("rect")
        .transition()
        .delay(i * 1000)       // delay each layer i by i*1000 ms
        .duration(800)         // how long the animation lasts
        .attr("y", d => y(d[1]))
        .attr("height", d => y(d[0]) - y(d[1]));
    });


    // I) Add X-axis (variants)
    svg.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0, ${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-0.5em")
      .attr("dy", "-0.2em")
      .attr("transform", "rotate(-30)");

    // J) Add Y-axis (stacked quantity)
    svg.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(y).ticks(6));

    // K) Add product name as a title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", margin.top / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .text(productName);
  }
}


function createCheckboxes(containerSelector, items, changeHandler) {
  // Remove anything that might be in the container first 
  d3.select(containerSelector).html("");

  d3.select(containerSelector)
    .selectAll("label")
    .data(items)
    .enter()
    .append("label")
    .each(function(d) {
      // Each label has text + an <input> inside
      const label = d3.select(this);

      label
        .append("input")
        .attr("type", "checkbox")
        .attr("value", d) // use the string name
        // If you want them default-checked, do: .property("checked", true)
        .on("change", changeHandler);

      // Then the label text
      label.append("span")
           .text(" " + d + " "); 
    });
}


function drawMultipleStackedBarsCopy(data) {

  const newData = data
    .map(product => ({
      ...product,
      totalQuantity: product.variants.reduce((sum, v) => sum + v.totalQuantity, 0) // Sum all variant quantities
    }))
    .sort((a, b) => b.totalQuantity - a.totalQuantity) // Sort descending by totalQuantity
    .map(({ totalQuantity, ...rest }) => rest); // Remove totalQuantity from final output

  console.log('-----------')
  console.log(newData)
  // 1) Identify all product names by grouping
  const productsMap = d3.group(newData, d => d.name);
  // productsMap is a Map: { "Nude Bralette" -> [ {date, name, variants: [...]}, ... ] }

  // 2) Set up chart dimensions and container
  const width = 400;
  const height = 300;
  const margin = { top: 30, right: 20, bottom: 50, left: 40 };

  const container = d3.select("#products_two").html(""); // clear or use .select() as needed

  // 3) For each product, build a stacked-bar chart
  for (const [productName, entries] of productsMap) {
    // A) Gather & sort all unique dates present in this product’s entries
    const dateKeys = Array.from(
      new Set(entries.map(d => +d.date)) // +d.date => numeric timestamp for sorting
    ).sort((a, b) => a - b);

    // B) Gather all possible variants
    //    Some dates might not have every variant, so we check them all

    const allVariants = [
      "xs",
      "sm",
      "md",
      "lg",
      "xl",
      "sdd",
      "mdd",
      "ldd",
      "xldd",
      "2xldd"
    ];



    // C) Pivot the data so each object has structure:
    //    { variant: "xs", [date1]: qty, [date2]: qty, ... }
    const pivotedData = allVariants.map(variant => {
      const row = { variant };
      // Initialize all date columns to 0
      for (const dateVal of dateKeys) {
        row[dateVal] = 0;
      }
      // Fill in actual quantities from each entry
      for (const entry of entries) {
        const varData = entry.variants.find(v => v.variant === variant);
        if (varData) {
          row[+entry.date] = varData.totalQuantity;
        }
      }
      return row;
    });

    // D) Prepare the stack generator
    //    Each date is a separate layer in the stack
    const stack = d3.stack()
      .keys(dateKeys); // your "layers" are the different dates

    // Generate the stacked layers
    const series = stack(pivotedData);
    // 'series' is an array of layers (one layer per date).
    // Each layer is an array of points ([y0, y1]) for each variant row.

    // E) Compute max stacked value to define y-scale
    const maxStackedValue = d3.max(series, layer =>
      d3.max(layer, d => d[1])
    );

    // F) Create scales
    const x = d3.scaleBand()
      .domain(allVariants) // each variant on x-axis
      .range([margin.left, width - margin.right])
      .padding(0.1);

    const y = d3.scaleLinear()
      .domain([0, maxStackedValue])
      .range([height - margin.bottom, margin.top]);

    // A color scale for the "layers" (i.e. each date)
    const color = d3.scaleOrdinal()
      .domain(dateKeys.map(String))
      .range(d3.schemeSet2);

    // G) Create an <svg> for this product
    const svg = container.append("svg")
      .attr("width", width)
      .attr("height", height);

    // H) Draw stacked bars
    //    One <g> per layer (date), then rectangles for each variant row
    svg.selectAll("g.layer")
      .data(series)
      .enter().append("g")
      .attr("class", "layer")
      .attr("fill", (d, i) => color(String(dateKeys[i])))
      .selectAll("rect")
      .data(d => d) // each sub-array for the variants
      .enter().append("rect")
      .attr("x", d => x(d.data.variant))
      .attr("y", d => y(d[1]))
      .attr("height", d => y(d[0]) - y(d[1]))
      .attr("width", x.bandwidth());

    // I) Add X-axis (variants)
    svg.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0, ${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-0.5em")
      .attr("dy", "-0.2em")
      .attr("transform", "rotate(-30)");

    // J) Add Y-axis (stacked quantity)
    svg.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(y).ticks(6));

    // K) Add product name as a title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", margin.top / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .text(productName);
  }
}
