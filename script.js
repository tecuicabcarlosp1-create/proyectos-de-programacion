document.addEventListener('DOMContentLoaded', () => {
    // Configuración de Ultra Alta Resolución y Visibilidad
    Chart.defaults.devicePixelRatio = 3; 
    Chart.defaults.color = '#000000'; 
    Chart.defaults.font.size = 16;    
    Chart.defaults.font.weight = 'bold'; 
    Chart.defaults.font.family = "'Segoe UI', Tahoma, sans-serif";
    
    Chart.defaults.scale.ticks.color = '#000000';
    Chart.defaults.scale.grid.color = 'rgba(0, 0, 0, 0.15)';
    Chart.defaults.scale.grid.lineWidth = 1.5;

    const dataInput = document.getElementById('dataInput');
    const calculateBtn = document.getElementById('calculateBtn');
    const generateRandomBtn = document.getElementById('generateRandomBtn');
    
    let histogramChart = null;
    let ogiveChart = null;
    let paretoChart = null;

    calculateStatistics();

    calculateBtn.addEventListener('click', calculateStatistics);
    generateRandomBtn.onclick = generateRandomData;

    function calculateStatistics() {
        const rawData = dataInput.value.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n)).sort((a, b) => a - b);
        if (rawData.length === 0) return;

        const n = rawData.length;
        const mean = rawData.reduce((a, b) => a + b, 0) / n;
        const min = rawData[0], max = rawData[n - 1], range = max - min;
        
        const freqMap = {};
        rawData.forEach(v => freqMap[v] = (freqMap[v] || 0) + 1);
        let maxF = 0, modes = [];
        for (let v in freqMap) {
            if (freqMap[v] > maxF) { maxF = freqMap[v]; modes = [v]; }
            else if (freqMap[v] === maxF) modes.push(v);
        }
        const modeText = modes.length === n ? "Sin moda" : modes.join(', ');

        document.getElementById('mean').textContent = mean.toFixed(2);
        document.getElementById('median').textContent = n % 2 !== 0 ? rawData[Math.floor(n/2)].toFixed(2) : ((rawData[n/2-1] + rawData[n/2])/2).toFixed(2);
        document.getElementById('mode').textContent = modeText;
        document.getElementById('min').textContent = min;
        document.getElementById('max').textContent = max;
        document.getElementById('range').textContent = range;

        const k = Math.round(1 + (3.322 * Math.log10(n)));
        const w = range / k || 1;
        document.getElementById('numClasses').textContent = k;
        document.getElementById('classWidth').textContent = w.toFixed(2);

        const freq = getFreqData(rawData, k, w, min, max);
        updateTable(freq, n);
        drawCharts(freq);
    }

    function getFreqData(data, k, w, min, max) {
        const labels = [], fi = new Array(k).fill(0), Fi = [], fr = [], Fr = [], midpoints = [];
        let current = min, acc = 0;
        for (let i = 0; i < k; i++) {
            let low = current, up = (i === k - 1) ? max : current + w;
            labels.push(`${low.toFixed(1)}-${up.toFixed(1)}`);
            midpoints.push(((low + up) / 2).toFixed(1));
            data.forEach(v => { if (i === k - 1 ? (v >= low && v <= up) : (v >= low && v < up)) fi[i]++; });
            acc += fi[i];
            Fi.push(acc);
            fr.push((fi[i] / data.length * 100).toFixed(1));
            Fr.push((acc / data.length * 100).toFixed(1));
            current = up;
        }
        return { labels, fi, Fi, fr, Fr, midpoints };
    }

    function updateTable(f, n) {
        const body = document.querySelector('#frequencyTable tbody');
        body.innerHTML = f.labels.map((l, i) => `<tr><td>${l}</td><td>${f.fi[i]}</td><td>${f.Fi[i]}</td><td>${f.fr[i]}%</td><td>${f.Fr[i]}%</td></tr>`).join('');
    }

    function drawCharts(f) {
        if (histogramChart) histogramChart.destroy();
        histogramChart = new Chart(document.getElementById('histogramChart'), {
            type: 'bar',
            data: { labels: f.midpoints, datasets: [{ label: 'fi', data: f.fi, backgroundColor: 'rgba(37, 99, 235, 0.5)', barPercentage: 1 }, { label: 'Polígono', data: f.fi, type: 'line', borderColor: 'red', tension: 0.4 }] }
        });
        if (ogiveChart) ogiveChart.destroy();
        ogiveChart = new Chart(document.getElementById('ogiveChart'), {
            type: 'line',
            data: { labels: f.labels, datasets: [{ label: 'Fr %', data: f.Fr, borderColor: '#10b981', fill: true, backgroundColor: 'rgba(16, 185, 129, 0.1)' }] }
        });
        if (paretoChart) paretoChart.destroy();
        const sorted = f.labels.map((l, i) => ({l, f: f.fi[i]})).sort((a,b) => b.f - a.f);
        let acc = 0, total = sorted.reduce((sum, x) => sum + x.f, 0);
        const paretoAcc = sorted.map(x => { acc += x.f; return (acc / total * 100).toFixed(1); });
        paretoChart = new Chart(document.getElementById('paretoChart'), {
            type: 'bar',
            data: { labels: sorted.map(x=>x.l), datasets: [{ label: 'fi', data: sorted.map(x=>x.f), backgroundColor: '#8b5cf6' }, { label: '% Acumulado', data: paretoAcc, type: 'line', borderColor: 'orange', yAxisID: 'y1' }] },
            options: { scales: { y1: { position: 'right', max: 100 } } }
        });
    }

    function generateRandomData() {
        dataInput.value = Array.from({length: 30}, () => Math.floor(Math.random()*100)).join(', ');
        calculateStatistics();
    }

    // --- Probabilidad P(E) ---
    document.getElementById('syncProbDataBtn').onclick = () => { document.getElementById('probDataInput').value = dataInput.value; };
    document.getElementById('randomProbDataBtn').onclick = () => { document.getElementById('probDataInput').value = Array.from({length: 20}, () => Math.floor(Math.random() * 100)).join(', '); };

    document.getElementById('calculateProbBtn').onclick = () => {
        const condition = document.getElementById('probCondition').value;
        const k = parseFloat(document.getElementById('probKValue').value);
        const data = document.getElementById('probDataInput').value.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
        if (data.length === 0 || isNaN(k)) return alert('Asegúrate de tener datos y un valor k válido.');
        let count = 0, eventSymbol = "";
        if (condition === 'equal') { count = data.filter(v => v === k).length; eventSymbol = "x = k"; }
        else if (condition === 'greaterEqual') { count = data.filter(v => v >= k).length; eventSymbol = "x ≥ k"; }
        else if (condition === 'lessEqual') { count = data.filter(v => v <= k).length; eventSymbol = "x ≤ k"; }
        document.getElementById('probResult').textContent = (count / data.length).toFixed(4);
        document.getElementById('probEventText').textContent = `${eventSymbol} con k = ${k}`;
        document.getElementById('probFavorable').textContent = `${count} valores encontrados`;
        document.getElementById('probTotal').textContent = `${data.length} valores totales`;
    };

    // --- Regla Multiplicativa ---
    document.getElementById('calculateTreeBtn').onclick = () => {
        const steps = [
            { name: document.getElementById('step1Name').value || 'Paso 1', options: document.getElementById('step1Options').value.split(',').map(s => s.trim()).filter(s => s) },
            { name: document.getElementById('step2Name').value || 'Paso 2', options: document.getElementById('step2Options').value.split(',').map(s => s.trim()).filter(s => s) },
            { name: document.getElementById('step3Name').value || 'Paso 3', options: document.getElementById('step3Options').value.split(',').map(s => s.trim()).filter(s => s) }
        ].filter(s => s.options.length > 0);
        if (steps.length < 1) return alert('Ingresa opciones en los pasos.');
        const counts = steps.map(s => s.options.length);
        const total = counts.reduce((acc, c) => acc * c, 1);
        document.getElementById('treeTotal').textContent = total;
        document.getElementById('processIdentify').textContent = steps.map(s => s.name).join(', ');
        document.getElementById('processCount').textContent = steps.map(s => `${s.name}: ${s.options.length}`).join(' | ');
        document.getElementById('processMultiply').textContent = `${counts.join(' x ')} = ${total}`;
        generateTreeSVG(steps);
    };

    document.getElementById('generateTreeDataBtn').onclick = () => {
        const examples = [
            { n1: "Moneda", o1: "Cara, Cruz", n2: "Moneda", o2: "Cara, Cruz", n3: "Moneda", o3: "Cara, Cruz" },
            { n1: "Menú", o1: "Pizza, Pasta", n2: "Bebida", o2: "Agua, Soda", n3: "Postre", o3: "Helado, Fruta" },
            { n1: "Dado", o1: "1, 2, 3, 4, 5, 6", n2: "Moneda", o2: "Cara, Cruz", n3: "", o3: "" }
        ];
        const ex = examples[Math.floor(Math.random() * examples.length)];
        document.getElementById('step1Name').value = ex.n1; document.getElementById('step1Options').value = ex.o1;
        document.getElementById('step2Name').value = ex.n2; document.getElementById('step2Options').value = ex.o2;
        document.getElementById('step3Name').value = ex.n3; document.getElementById('step3Options').value = ex.o3;
        document.getElementById('calculateTreeBtn').click();
    };

    function generateTreeSVG(steps) {
        const container = document.getElementById('treeDisplay');
        const width = 800, height = Math.max(400, steps.reduce((acc, s) => acc * s.options.length, 1) * 30), levelWidth = width / (steps.length + 1);
        let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><circle cx="20" cy="${height/2}" r="5" fill="#2563eb" /><text x="10" y="${height/2-10}">Inicio</text>`;
        function draw(level, px, py, ch) {
            if (level >= steps.length) return;
            const step = steps[level], x = px + levelWidth, sh = ch / step.options.length;
            step.options.forEach((opt, i) => {
                const y = (py - ch / 2) + (sh * (i + 0.5));
                svg += `<line x1="${px}" y1="${py}" x2="${x}" y2="${y}" stroke="#94a3b8" stroke-width="1.5" /><circle cx="${x}" cy="${y}" r="4" fill="#2563eb" /><text x="${x+8}" y="${y+5}" font-size="11">${opt}</text>`;
                draw(level + 1, x, y, sh);
            });
        }
        draw(0, 20, height / 2, height - 40);
        container.innerHTML = svg + `</svg>`;
    }

    // --- Conjuntos y Combinatoria ---
    function getS() { return { a: new Set(document.getElementById('setAInput').value.split(',').map(x=>x.trim()).filter(x=>x)), b: new Set(document.getElementById('setBInput').value.split(',').map(x=>x.trim()).filter(x=>x)) }; }
    document.getElementById('unionBtn').onclick = () => { const {a,b} = getS(); document.getElementById('setResult').textContent = `{${[...new Set([...a, ...b])].sort().join(', ')}}`; };
    document.getElementById('intersectionBtn').onclick = () => { const {a,b} = getS(); document.getElementById('setResult').textContent = `{${[...a].filter(x=>b.has(x)).sort().join(', ')}}`; };
    document.getElementById('diffABtn').onclick = () => { const {a,b} = getS(); document.getElementById('setResult').textContent = `{${[...a].filter(x=>!b.has(x)).sort().join(', ')}}`; };
    document.getElementById('diffBBtn').onclick = () => { const {a,b} = getS(); document.getElementById('setResult').textContent = `{${[...b].filter(x=>!a.has(x)).sort().join(', ')}}`; };

    const fact = n => (n <= 1) ? 1 : n * fact(n - 1);
    document.getElementById('calculatePermutationsBtn').onclick = () => {
        const n = +document.getElementById('nInput').value, r = +document.getElementById('rInput').value;
        document.getElementById('permutationsResult').textContent = r > n ? "Error" : fact(n) / fact(n - r);
    };
    document.getElementById('calculateCombinationsBtn').onclick = () => {
        const n = +document.getElementById('nInput').value, r = +document.getElementById('rInput').value;
        document.getElementById('combinationsResult').textContent = r > n ? "Error" : fact(n) / (fact(r) * fact(n - r));
    };
});