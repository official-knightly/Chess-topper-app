async function startStockfish() {
  const wasmUrl = 'https://github.com/official-knightly/Chess-topper/blob/main/engine/stockfish-19.wasm';

  // Fetch the JS glue code to avoid cross-origin Worker errors
  const response = await fetch(jsUrl);
  if (!response.ok) {
    throw new Error(`Failed to load JS wrapper: ${response.status}`);
  }
  const jsCode = await response.text();

  // Combine Module config + Stockfish JS into one Blob Worker
  const workerScript = `
    self.Module = {
      locateFile: function (path) {
        if (path.endsWith('.wasm')) {
          return '${wasmUrl}';
        }
        return path;
      }
    };
    ${jsCode}
  `;

  const blob = new Blob([workerScript], { type: 'application/javascript' });
  const worker = new Worker(URL.createObjectURL(blob));

  // Handle UCI responses from Stockfish
  worker.onmessage = (event) => {
    const line = typeof event.data === 'string' ? event.data : event.data?.data;
    console.log('Stockfish:', line);

    if (line === 'uciok') {
      worker.postMessage('isready');
    } else if (line === 'readyok') {
      console.log('Engine ready! Calculating best move...');
      worker.postMessage('position startpos');
      worker.postMessage('go depth 15');
    } else if (line && line.startsWith('bestmove')) {
      console.log('Result ->', line);
    }
  };

  worker.onerror = (err) => {
    console.error('Stockfish Worker Error:', err);
  };

  // Start UCI handshake
  worker.postMessage('uci');

  return worker;
}

// Run it
startStockfish();
