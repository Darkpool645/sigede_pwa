const db = new PouchDB('capturists');
const apiUrl = 'http://localhost:3000/capturists'; // URL del backend

// Función para guardar o actualizar la lista de capturistas en PouchDB
const saveCapturistsList = async (capturists) => {
    try {
        console.log('Guardando lista de capturistas en PouchDB:', capturists);
        const existingDoc = await db.get('capturists_list').catch(() => null);

        if (existingDoc) {
            // Si existe el documento, actualízalo con su _rev
            await db.put({
                _id: 'capturists_list',
                _rev: existingDoc._rev,
                capturists,
                synced: true
            });
        } else {
            // Si no existe, créalo
            await db.put({
                _id: 'capturists_list',
                capturists,
                synced: true
            });
        }
        console.log('Lista de capturistas guardada localmente.');
    } catch (err) {
        console.error('Error al guardar la lista de capturistas localmente:', err);
    }
};

// Sincronizar cambios locales con el servidor
const syncDB = async () => {
    try {
        const unsyncedDocs = await db.allDocs({ include_docs: true, conflicts: false });
        console.log('Sincronizando con el servidor...');
        for (const row of unsyncedDocs.rows) {
            const doc = row.doc;
            if (!doc.synced) {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: doc.name, email: doc.email })
                });

                if (response.ok) {
                    await db.remove(doc);
                }
            }
        }
        await loadCapturists();
        console.log('Sincronización completa');
    } catch (err) {
        console.error('Error en la sincronización:', err);
    }
};

// Cargar capturistas desde el backend
const loadCapturists = async () => {
    const tableBody = document.querySelector('#capturistsTable tbody');
    tableBody.innerHTML = '';

    try {
        console.log('Cargando capturistas desde el servidor...');
        const response = await fetch(apiUrl);
        const capturists = await response.json();
        console.log('Capturistas cargados desde el servidor:', capturists);

        // Guardar la última lista en PouchDB para uso offline
        await saveCapturistsList(capturists);

        capturists.forEach(capturist => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${capturist.id}</td>
                <td>${capturist.name}</td>
                <td>${capturist.email}</td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="editCapturist(${capturist.id})">Editar</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteCapturist(${capturist.id})">Eliminar</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    } catch (err) {
        console.error('Error al cargar los capturistas desde el servidor:', err);
    }
};

// Actualizar la tabla desde datos locales
const updateTableFromLocalData = (localData) => {
    const tableBody = document.querySelector('#capturistsTable tbody');
    tableBody.innerHTML = '';  // Limpiar tabla antes de agregar datos

    console.log('Actualizando tabla con datos locales...');
    if (localData.rows && localData.rows.length > 0) {
        localData.rows.forEach(row => {
            const capturistsList = row.doc.capturists;  // Acceder al array de capturistas
            console.log('Procesando capturistas:', capturistsList);

            if (Array.isArray(capturistsList) && capturistsList.length > 0) {
                capturistsList.forEach(capturist => {
                    if (capturist.name && capturist.email) {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${capturist.id}</td>
                            <td>${capturist.name}</td>
                            <td>${capturist.email}</td>
                            <td>
                                <button class="btn btn-warning btn-sm">Editar Offline</button>
                                <button class="btn btn-danger btn-sm">Eliminar Offline</button>
                            </td>
                        `;
                        tableBody.appendChild(tr);
                    } else {
                        console.log('Capturista sin nombre o correo:', capturist); // Ver si hay capturistas sin estos datos
                    }
                });
            } else {
                console.log('No se encontraron capturistas en el array.');
            }
        });
    } else {
        console.log('No se encontraron datos locales en PouchDB.');
    }
};


// Agregar capturista
document.getElementById('capturistForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;

    if (!navigator.onLine) {
        console.log('Modo offline: Guardando capturista localmente');
        // Guardar localmente en PouchDB si estamos offline
        try {
            await db.post({
                name,
                email,
                synced: false // Indica que este documento no ha sido sincronizado
            });
            Swal.fire('Modo Offline', 'Capturista guardado localmente. Se sincronizará cuando esté en línea.', 'info');
            // Actualizar la lista local en la tabla
            const localData = await db.allDocs({ include_docs: true });
            updateTableFromLocalData(localData);
        } catch (err) {
            console.error('Error al guardar el capturista localmente:', err);
            Swal.fire('Error', 'No se pudo guardar el capturista localmente.', 'error');
        }
    } else {
        console.log('Modo online: Intentando agregar capturista en el servidor');
        // Intentar guardar en el servidor si estamos online
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email })
            });

            if (response.ok) {
                Swal.fire('Éxito', 'Capturista agregado', 'success');
                loadCapturists();
            } else {
                Swal.fire('Error', 'No se pudo agregar el capturista', 'error');
            }
        } catch (err) {
            console.error('Error al agregar el capturista:', err);
        }
    }
});

// Editar capturista
const editCapturist = async (id) => {
    const { value: name } = await Swal.fire({
        title: 'Editar nombre del capturista',
        input: 'text',
        showCancelButton: true
    });

    if (name) {
        console.log('Editando capturista con ID:', id, 'Nuevo nombre:', name);
        try {
            const response = await fetch(`${apiUrl}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });

            if (response.ok) {
                Swal.fire('Éxito', 'Capturista actualizado', 'success');
                loadCapturists();
            } else {
                Swal.fire('Error', 'No se pudo actualizar el capturista', 'error');
            }
        } catch (err) {
            console.error('Error al actualizar el capturista:', err);
        }
    }
};

// Eliminar capturista
const deleteCapturist = async (id) => {
    console.log('Eliminando capturista con ID:', id);
    try {
        const response = await fetch(`${apiUrl}/${id}`, { method: 'DELETE' });

        if (response.ok) {
            Swal.fire('Éxito', 'Capturista eliminado', 'success');
            loadCapturists();
        } else {
            Swal.fire('Error', 'No se pudo eliminar el capturista', 'error');
        }
    } catch (err) {
        console.error('Error al eliminar el capturista:', err);
    }
};

// Inicializar la aplicación
window.addEventListener('load', async () => {
    console.log('Cargando la aplicación...');
    // Si estamos offline, cargar datos de PouchDB
    if (!navigator.onLine) {
        console.log('Modo offline detectado...');
        const localData = await db.get('capturists_list').catch(() => null);
        if (localData) {
            console.log('Datos locales encontrados en PouchDB. Actualizando la tabla...');
            updateTableFromLocalData(await db.allDocs({ include_docs: true }));
        } else {
            Swal.fire('Modo Offline', 'No se pudo encontrar una lista de capturistas. Asegúrate de haber estado en línea anteriormente.', 'warning');
        }
    } else {
        // Si estamos online, sincronizar y cargar datos del servidor
        console.log('Modo online detectado...');
        await loadCapturists();
        await syncDB();
    }
});
