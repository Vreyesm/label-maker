# Labela — Editor web de etiquetas

Aplicación estática en español. Sin dependencias, API, servidor ni compilación. Funciona en Cloudflare Pages.

## Cloudflare Pages con este repositorio

1. Abre **Workers & Pages → Create application → Pages → Connect to Git** en Cloudflare. Selecciona el flujo de **Pages**.
2. Conecta GitHub y autoriza el repositorio `Vreyesm/label-maker`.
3. Selecciona estos valores:

| Ajuste | Valor |
| --- | --- |
| Nombre del proyecto | `label-maker` (o un nombre disponible) |
| Rama de producción | `main` |
| Framework preset | `None` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | Raíz del repositorio (vacío) |

4. Guarda y despliega. Cada push a `main` generará un despliegue de producción; Cloudflare podrá generar previews de las ramas y PR.

No requiere variables de entorno, API keys, bindings D1/R2 ni secretos de GitHub. El archivo `wrangler.toml` declara la salida estática. El build revisa la sintaxis y ejecuta las comprobaciones, sin descargar dependencias. GitHub Actions ejecuta las mismas comprobaciones en cada push a `main` y PR.

La autorización entre Cloudflare y GitHub se completa en tu cuenta de Cloudflare. Configurar este repositorio no crea por sí solo el proyecto en Cloudflare.

### Alternativa: desplegar por CLI

Con tu cuenta autenticada en Wrangler y desde la raíz:

```sh
npm run build
npx wrangler pages project create label-maker --production-branch main
npx wrangler pages deploy dist --project-name label-maker
```

Ejecuta `project create` solamente si el proyecto no existe. Si eliges otro nombre, usa ese nombre también en `wrangler.toml` y en los comandos.

## Ejecutar localmente

Desde la raíz del proyecto:

```sh
python3 -m http.server 8080 --directory dist
```

Abre http://localhost:8080. Verificación lógica: `node verify.cjs`.

## Funciones

- Seis plantillas: solo texto, texto vertical, producto, envío, precio e inventario; diseño vacío.
- Tamaños predefinidos y personalizados de 10 a 300 mm por lado.
- Texto con tipografía, tamaño, negrita, alineación y color.
- Imágenes PNG/JPEG/WebP de hasta 3 MB; líneas y rectángulos.
- Posición y dimensiones en mm, arrastre, flechas, rotación, centrado y orden de capas.
- Deshacer, rehacer, duplicar, eliminar y zoom.
- Códigos EAN-13 (calcula/verifica dígito de control) y Code 39.
- CSV con delimitador coma o punto y coma; comillas escapadas y saltos de línea.
- Variables `{{campo}}`, vista previa de registros y consecutivo `{{numero}}`.
- Impresión por lote de hasta 500 etiquetas, con copias por registro.
- Exportación SVG, descarga/importación JSON y biblioteca local.
- Impresión del navegador y PDF mediante su diálogo de impresión.

## Datos y uso

Los diseños se guardan en localStorage, por navegador y dominio. Al borrar los datos del navegador se pierden. Usa **Guardar** para descargar copias JSON. Los datos CSV y la vista de trabajo se conservan localmente para restaurar la sesión. Las imágenes se incluyen dentro del diseño. No se envían datos a un servidor.

La impresión requiere elegir escala 100%, papel con las dimensiones de la etiqueta, sin márgenes ni encabezados. El controlador debe admitir el formato. Comprueba una muestra antes de imprimir un lote y verifica la lectura de códigos con tu escáner.

Esta versión no incluye QR, RFID, importación .btw de BarTender, conexión SQL/Excel en vivo, usuarios compartidos ni envío directo ZPL/TSPL a impresoras. Es una base funcional independiente; esas integraciones requieren trabajo adicional.

## Verificación

Se comprueban por Node la validación EAN-13, generación Code 39, lectura CSV, sustitución de variables, SVG, plantillas y validación de archivos. No se ha realizado verificación visual automatizada ni impresión física en esta sesión.

## Edición del lienzo

- Arrastra el cuadrado de la esquina inferior derecha del elemento seleccionado para cambiar el ancho y el alto. El texto se redistribuye sin modificar la tipografía.
- Haz doble clic sobre el texto, pulsa Enter/F2 con el texto seleccionado o usa **Editar en el lienzo**. Ctrl/⌘+Enter confirma; Escape cancela; hacer clic fuera guarda.
- **Ajustar al ancho del sticker** extiende el cuadro de texto al 90% del ancho de la etiqueta, dejando un 5% de margen a cada lado, y recalcula la fuente con el contenido visible. Conserva los saltos de línea y limita la altura dejando también un 5% de margen superior e inferior; conserva la rotación y, para giros de 90°/270°, ajusta el texto al alto del sticker. Con CSV se calcula sobre el registro visible.
- **Vista al ancho** ajusta el zoom al ancho disponible. **Ajustar a pantalla** encaja toda la etiqueta considerando tanto ancho como alto del área visible.
- Los botones de alineación ajustan el texto dentro de su cuadro: izquierda, centro, derecha o justificado. El justificado distribuye las palabras de las líneas completas; la última línea de cada párrafo queda a la izquierda.
- **Centrar en etiqueta** centra el cuadro completo horizontal y verticalmente.

Los controles principales de texto están en una barra sobre el lienzo: A−, tamaño en puntos (pt), A+, negrita e iconos de alineación con el botón central claramente marcado. Al aumentar la fuente, el cuadro crece en altura para mostrar las nuevas líneas.

## Impresión

El botón Imprimir y Ctrl/⌘+P muestran una vista previa limpia y abren el diálogo del sistema. La impresora, el papel y su orientación se eligen allí: la aplicación no tiene selector de papel ni fuerza un tamaño de página. Se mantiene una etiqueta por página y el tamaño físico del diseño en mm. Selecciona escala 100% para conservar esas medidas. Para PDF, elige Guardar como PDF en el diálogo del sistema.

## Orientación de la etiqueta

En Configuración → Etiqueta, los botones **Horizontal** y **Vertical** intercambian ancho y alto. Por defecto **Girar también el diseño** rota todo el contenido 90° al pasar a vertical y lo gira de vuelta al volver a horizontal, manteniendo tamaños y posiciones relativas. Desmarca esa opción para cambiar solo el formato del lienzo y redistribuir el contenido manualmente. En etiquetas cuadradas los botones están desactivados. El cambio se puede deshacer y se conserva al guardar; SVG e impresión usan las nuevas dimensiones.

## Texto y tablas

- La barra sobre el lienzo permite alinear el texto arriba, al centro vertical o abajo dentro del cuadro. Esta alineación también se respeta en el SVG, al editar sobre el lienzo y al imprimir.
- En Elementos → Tabla se inserta una cuadrícula de 3 filas y 2 columnas. Cambia las filas/columnas (1 a 10), el encabezado, tamaño de fuente, alineación y contenido en el panel de propiedades. Doble clic en una celda permite escribir directamente sobre la tabla del lienzo. Tab/Mayús+Tab cambia de celda; Ctrl/⌘+Enter confirma y Escape cancela.
- Las tablas se pueden mover, redimensionar, girar, duplicar, deshacer, guardar y exportar. Las celdas admiten campos CSV `{{campo}}` y consecutivos `{{numero}}`.

## Plantillas básicas

En Plantillas → Básicas puedes elegir **Solo texto** (100 × 60 mm) o **Texto vertical** (60 × 100 mm, con el texto girado 90°). Ambas contienen un único cuadro de texto centrado, editable, con margen y sin códigos ni imágenes. Las medidas y el contenido se pueden cambiar como en los demás diseños.

Las divisiones interiores de una tabla seleccionada se pueden arrastrar para ajustar el ancho de columnas y el alto de filas. Los tamaños relativos se conservan al guardar, redimensionar el cuadro completo, girar, exportar e imprimir. La cuadrícula visible dentro del sticker representa pasos de 5 mm y es únicamente una guía de edición. El color predeterminado de texto y bordes es negro; los diseños con el antiguo tono verde predeterminado se convierten a negro al abrirse.

## Formato por celda

Haz clic en una celda de la tabla para seleccionarla y usa la misma barra del texto: tipografía, tamaño en pt, A−/A+, negrita, color, alineación horizontal, vertical y ajuste de texto al espacio de la celda. El rótulo de la barra indica la fila y columna. Doble clic permite editar el contenido directamente. Cada celda conserva su formato al guardar, redimensionar, exportar e imprimir.

El botón **Toda la tabla** permite aplicar el formato a todas las celdas. Los formatos de celda que se establecen después prevalecen sobre el formato base. Al aplicar una propiedad a toda la tabla se eliminan las excepciones de esa propiedad. El ajuste de texto de una tabla calcula el tamaño para cada celda, sin cambiar las dimensiones de sus filas o columnas.

## Girar texto

La barra tiene botones para girar 90° a izquierda o derecha y un indicador del ángulo que restablece el giro a 0°. En un cuadro de texto se gira el cuadro; en una celda se gira únicamente su texto, manteniendo la cuadrícula. **Toda la tabla** permite girar el texto de todas las celdas. El editor de la celda y el ajuste de tamaño usan sus dimensiones giradas. El giro se conserva al guardar, exportar e imprimir.

## Elementos fuera de la etiqueta

El área de edición muestra el contenido, la selección y los tiradores que sobresalen del sticker. El espacio de trabajo incluye los límites de los elementos girados, con margen para recuperar sus controles. Se pueden mover libremente, incluso con coordenadas negativas, para corregir su posición. **Ajustar a pantalla** incluye esos elementos en el encaje. El borde blanco sigue indicando el área imprimible: SVG e impresión recortan al tamaño físico de la etiqueta.

## Diseños guardados y sesión

- En **Mis diseños**, edita el nombre directamente en su campo. El nombre de la cabecera también actualiza el diseño guardado que está abierto.
- Los diseños guardados aparecen en **Plantillas → Mis diseños**, con su nombre y miniatura, y se incluyen en la búsqueda de plantillas.
- Una vez guardado un diseño, sus cambios se actualizan en esa misma entrada. **Guardar como copia** crea una entrada independiente.
- Al volver a abrir la página en el mismo navegador y dominio, se restaura el diseño de trabajo y su última vista: pestaña, filtro, zoom/encaje, cuadrícula, desplazamiento, selección y datos CSV. Los cambios de edición en curso se confirman al salir de la página.
- El guardado es local al navegador. Para mover diseños entre dispositivos o dominios, descarga e importa el archivo JSON. Al importar un archivo se abre como una copia de trabajo independiente.

## Filas y columnas en el lienzo

Al seleccionar una tabla aparecen cabeceras con letras para columnas y números para filas. Haz clic en una cabecera para aplicar los formatos de la barra a toda esa fila o columna. Arrastra el extremo de la cabecera o introduce su tamaño en mm para redimensionarla completa sin cambiar las demás; la tabla crece o se reduce. Las divisiones interiores siguen permitiendo redistribuir dos filas/columnas vecinas conservando el tamaño total.

Cada cabecera tiene un **+** que inserta una columna a su derecha o una fila debajo. La barra también permite añadir o eliminar la fila/columna seleccionada. Se mantienen contenido, formatos y tamaños de las demás celdas; la tabla admite de 1 a 10 filas/columnas. Los controles son guías de edición y no se imprimen.

## Campos automáticos

Escribe estos campos en textos o celdas; no requieren CSV:

| Campo | Resultado |
| --- | --- |
| `{{fecha}}` | Fecha local, DD/MM/AAAA |
| `{{fecha_iso}}` | Fecha local, AAAA-MM-DD |
| `{{hora}}` | Hora local, HH:mm |
| `{{fecha_hora}}` | Fecha y hora local |
| `{{dia}}`, `{{mes}}`, `{{anio}}` / `{{año}}` | Componentes de la fecha |
| `{{numero}}` | Consecutivo existente: 0001, 0002… |

Elementos incluye botones para insertar Fecha actual y Hora actual. El lote de impresión toma una sola fecha/hora al generarse para que todas sus etiquetas sean consistentes. Si el CSV contiene una columna con el mismo nombre que un campo de fecha/hora, se usa su valor; `{{numero}}` conserva su comportamiento de consecutivo reservado.

## Editor en teléfonos y tablets

Hasta 1050 px, el lienzo ocupa todo el ancho y la altura disponible. Las pestañas abren las herramientas en un panel modal; **Listo** vuelve al diseño. **Ajustes** permanece visible para cambiar las medidas, orientación, propiedades y copias. Al añadir un elemento o abrir una plantilla/diseño se vuelve al lienzo.

Las barras de acciones y formato se desplazan horizontalmente. Selecciona un texto o celda y usa **Editar texto**; **Terminar edición** confirma el contenido sin necesitar un teclado físico. Se mantienen el arrastre, los controles de tablas y los botones de encaje/zoom. En escritorio se restauran las dos columnas laterales con los mismos controles y estado, sin duplicarlos.

## Ajuste al cuadro y transformaciones en el lienzo

- **Ancho del cuadro** ajusta la letra al ancho disponible sin mover ni redimensionar el cuadro. Respeta los saltos de línea y el alto disponible para evitar recortes. Resuelve campos automáticos/CSV antes de medir. En tablas se aplica a las celdas o al rango seleccionado. **Ajustar texto** conserva su ajuste al ancho del sticker con margen.
- Al seleccionar un elemento aparece **↻**: un toque gira 90°; arrastrarlo permite elegir el ángulo. Con Shift, el arrastre encaja cada 15°. Con el control enfocado, las flechas izquierda/derecha giran 15° y Home vuelve a 0°. En tablas el control está a la derecha para dejar libres las cabeceras.
- Durante el resize se muestran **ancho × alto en mm** junto al puntero. Los tiradores de filas/columnas muestran además la medida de la fila/columna. La rotación muestra el ángulo. Estos indicadores son de edición y no aparecen al imprimir o exportar.

## Bordes en cuadros de texto

Selecciona un texto y abre sus propiedades (**Ajustes** en móvil). En **Borde del cuadro**, activa **Mostrar borde** y elige grosor de 0,1 a 3 mm y color independiente de la letra. El borde queda dentro del cuadro y deja separación interior para el texto. Los ajustes al cuadro/sticker y la edición directa respetan ese espacio.

El borde se conserva al guardar, duplicar, importar/exportar y deshacer cambios; usa el mismo SVG en el canvas y la impresión. Los diseños anteriores se abren sin borde.
