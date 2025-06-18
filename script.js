// ========= VARIABLES GLOBALES Y DE ESTADO =========
let html5QrCodeFinder;
let html5QrCodeCounter;
let currentView = 'menu-view';
const lugaresConCodigos = { 

};
let codigosEscaneados = []; // Array para guardar los códigos del contador

// ========= MANEJO DE VISTAS Y NAVEGACIÓN =========

function showView(viewId) {
    stopAllScanners();
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    currentView = viewId;

    if (viewId === 'sector-finder-view') {
        iniciarBuscadorSector();
    } else if (viewId === 'qr-counter-view') {
        iniciarContadorQR();
    }
}

function stopAllScanners() {
    if (html5QrCodeFinder && html5QrCodeFinder.isScanning) {
        html5QrCodeFinder.stop().catch(err => console.error("Error al detener el escáner del buscador:", err));
    }
    if (html5QrCodeCounter && html5QrCodeCounter.isScanning) {
        html5QrCodeCounter.stop().catch(err => console.error("Error al detener el escáner del contador:", err));
    }
}


// ========= FUNCIONALIDAD: BUSCADOR DE SECTOR (Tu código adaptado) =========

function iniciarBuscadorSector() {
    const mensajesElement = document.getElementById('mensajes');
    html5QrCodeFinder = new Html5Qrcode("qr-reader-finder");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    startCamera(html5QrCodeFinder, config, onScanSuccessFinder, onScanFailure, mensajesElement)
        .then(() => {
            // Configura los controles para el buscador de sector
            setupAdvancedControls(html5QrCodeFinder, 'finder');
        });
}

function buscarManualmente() {
    const manualInput = document.getElementById('manualCodeInput');
    realizarBusquedaYMostrarResultado(manualInput.value.trim());
    manualInput.value = '';
}

function realizarBusquedaYMostrarResultado(codigo) {
    const elementoResultado = document.getElementById('resultado');
    const elementoMensajes = document.getElementById('mensajes');
    elementoResultado.innerHTML = '';
    elementoMensajes.innerHTML = '';
    if (!codigo || codigo.includes('{')) {
        elementoMensajes.innerText = 'Por favor, ingresa o escanea un código válido.';
        return;
    }
    if (isNaN(codigo)) {
        const sectorEncontrado = Object.keys(lugaresConCodigos).find(sector => sector.toLowerCase() === codigo.toLowerCase());
        if (sectorEncontrado) {
             elementoMensajes.innerText = `Sector encontrado:`;
             elementoResultado.innerHTML = `<b>${sectorEncontrado}</b><br><small>Códigos: ${lugaresConCodigos[sectorEncontrado].join(', ')}</small>`;
        } else {
             elementoMensajes.innerText = `El sector "${codigo}" no fue encontrado.`;
        }
        return;
    }
    let lugarEncontrado = null;
    for (const lugar in lugaresConCodigos) {
        if (lugaresConCodigos[lugar].includes(codigo)) {
            lugarEncontrado = lugar;
            break;
        }
    }
    if (lugarEncontrado) {
        elementoMensajes.innerText = `Código ${codigo} encontrado:`;
        elementoResultado.innerHTML = ` <b>${lugarEncontrado}</b>`;
    } else {
        elementoMensajes.innerText = `El código ${codigo} no fue encontrado.`;
    }
}

function obtenerCodigoDesdeQR(textoQR) {
    if (!textoQR) return null;
    try {
        const datosQR = JSON.parse(textoQR);
        if (datosQR && typeof datosQR.carrier_data === 'string') {
            return datosQR.carrier_data.split('|')[2].trim();
        }
    } catch (error) {}
    if (textoQR.includes('|')) {
        const partes = textoQR.split('|').filter(p => p);
        return partes.length > 0 ? partes[partes.length - 1].trim() : textoQR.trim();
    }
    return textoQR.trim();
}

function onScanSuccessFinder(decodedText, decodedResult) {
    playBeep(); 
    const codigoPostal = obtenerCodigoDesdeQR(decodedText);
    document.getElementById('manualCodeInput').value = codigoPostal; 
    realizarBusquedaYMostrarResultado(codigoPostal);
}


// ========= FUNCIONALIDAD: NUEVO CONTADOR DE QR =========

function iniciarContadorQR() {
    codigosEscaneados = [];
    actualizarContadorUI();
    
    const mensajesElement = document.getElementById('mensajes-contador');
    html5QrCodeCounter = new Html5Qrcode("qr-reader-counter");
    const config = { fps: 5, qrbox: { width: 250, height: 250 } };

    startCamera(html5QrCodeCounter, config, onScanSuccessCounter, onScanFailure, mensajesElement)
        .then(() => {
            // ¡NUEVO! Configura los controles para el contador de QR
            setupAdvancedControls(html5QrCodeCounter, 'counter');
        });
}

function onScanSuccessCounter(decodedText, decodedResult) {
    try {
        const datosQR = JSON.parse(decodedText);
        if (datosQR && typeof datosQR.carrier_data === 'string') {
            const codigoExtraido = datosQR.carrier_data.split('|')[0].trim();
            
            if (codigoExtraido && !codigosEscaneados.includes(codigoExtraido)) {
                playBeep();
                codigosEscaneados.push(codigoExtraido);
                actualizarContadorUI();
            }
        }
    } catch (e) { /* Ignora QR con formato incorrecto */ }
}

function actualizarContadorUI() {
    const contadorDisplay = document.getElementById('contador-display');
    const listaCodigos = document.getElementById('lista-codigos');
    
    contadorDisplay.innerText = codigosEscaneados.length;
    
    listaCodigos.innerHTML = '';
    codigosEscaneados.forEach(codigo => {
        const li = document.createElement('li');
        li.textContent = codigo;
        listaCodigos.appendChild(li);
    });
    listaCodigos.scrollTop = listaCodigos.scrollHeight;
}

function enviarPorCorreo() {
    if (codigosEscaneados.length === 0) {
        alert("No se ha escaneado ningún código para enviar.");
        return;
    }
    const asunto = "Listado de Guías Escaneadas";
    const cuerpo = "Se adjunta el listado de guías escaneadas:\n\n" + codigosEscaneados.join("\n");
    const mailtoLink = `mailto:?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
    window.location.href = mailtoLink;
}


// ========= FUNCIONES AUXILIARES COMUNES (Cámara, Sonido, Controles) =========
let audioContext;
function playBeep() {
    try {
        if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const o = audioContext.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(750, audioContext.currentTime);
        o.connect(audioContext.destination);
        o.start();
        o.stop(audioContext.currentTime + 0.15);
    } catch (e) {}
}

function onScanFailure(error) { /* Se ignora */ }

function startCamera(scannerInstance, config, scanSuccessCallback, scanFailureCallback, messageElement) {
    return Html5Qrcode.getCameras().then(cameras => {
        if (!cameras || cameras.length === 0) {
            messageElement.innerText = "No se encontró ninguna cámara.";
            return Promise.reject("No hay cámaras");
        }
        const rearCamera = cameras.find(c => c.label.toLowerCase().includes('back')) || cameras[0];
        return scannerInstance.start(rearCamera.id, config, scanSuccessCallback, scanFailureCallback);
    }).catch(err => {
        messageElement.innerText = "No se pudo iniciar la cámara. Revisa los permisos.";
    });
}

// -- FUNCIÓN DE CONTROLES MODIFICADA PARA SER REUTILIZABLE --
function setupAdvancedControls(scannerInstance, suffix) {
    const qrReaderId = `qr-reader-${suffix}`;
    const zoomControlsId = `zoom-controls-${suffix}`;
    
    try {
        const capabilities = scannerInstance.getRunningTrackCapabilities();
        const qrReaderElement = document.getElementById(qrReaderId);

        // Control de Linterna
        if (capabilities.torch && !qrReaderElement.querySelector('.torch-button')) {
            const torchButton = document.createElement('button');
            torchButton.className = 'torch-button';
            torchButton.innerHTML = '🔦 Linterna';
            qrReaderElement.appendChild(torchButton);
            let torchOn = false;
            torchButton.addEventListener('click', () => {
                torchOn = !torchOn;
                scannerInstance.applyVideoConstraints({ advanced: [{ torch: torchOn }] });
                torchButton.classList.toggle('torch-on', torchOn);
            });
        }

        // Control de Zoom
        if (capabilities.zoom) {
            const zoomControls = document.getElementById(zoomControlsId);
            zoomControls.style.display = 'flex';
            [1, 1.5, 2].forEach(level => {
                // Construye el ID del botón dinámicamente usando el sufijo
                const zoomButton = document.getElementById(`zoom-${level}x-${suffix}`);
                zoomButton.addEventListener('click', () => {
                    scannerInstance.applyVideoConstraints({ advanced: [{ zoom: level }] });
                    document.querySelectorAll(`#${zoomControlsId} .zoom-button`).forEach(btn => btn.classList.remove('active'));
                    zoomButton.classList.add('active');
                });
            });
        }
    } catch (e) {
        console.error("Error al configurar controles avanzados: ", e);
    }
}
