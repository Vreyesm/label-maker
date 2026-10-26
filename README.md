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

- Cuatro plantillas: producto, envío, precio e inventario; diseño vacío.
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

Los diseños se guardan en localStorage, por navegador y dominio. Al borrar los datos del navegador se pierden. Usa **Guardar** para descargar copias JSON. Los CSV solo permanecen en memoria y se deben volver a importar después de recargar. Las imágenes se incluyen dentro del diseño. No se envían datos a un servidor.

La impresión requiere elegir escala 100%, papel con las dimensiones de la etiqueta, sin márgenes ni encabezados. El controlador debe admitir el formato. Comprueba una muestra antes de imprimir un lote y verifica la lectura de códigos con tu escáner.

Esta versión no incluye QR, RFID, importación .btw de BarTender, conexión SQL/Excel en vivo, usuarios compartidos ni envío directo ZPL/TSPL a impresoras. Es una base funcional independiente; esas integraciones requieren trabajo adicional.

## Verificación

Se comprueban por Node la validación EAN-13, generación Code 39, lectura CSV, sustitución de variables, SVG, plantillas y validación de archivos. No se ha realizado verificación visual automatizada ni impresión física en esta sesión.

## Edición del lienzo

- Arrastra el cuadrado de la esquina inferior derecha del elemento seleccionado para cambiar el ancho y el alto. El texto se redistribuye sin modificar la tipografía.
- Haz doble clic sobre el texto, pulsa Enter/F2 con el texto seleccionado o usa **Editar en el lienzo**. Ctrl/⌘+Enter confirma; Escape cancela; hacer clic fuera guarda.
- **Ajustar al ancho del sticker** extiende el cuadro de texto al 90% del ancho de la etiqueta, dejando un 5% de margen a cada lado, y recalcula la fuente con el contenido visible. Conserva los saltos de línea y limita la altura dejando también un 5% de margen superior e inferior; reinicia la rotación. Con CSV se calcula sobre el registro visible.
- **Vista al ancho** solo controla el zoom del área de trabajo.
- Los botones de alineación ajustan el texto dentro de su cuadro: izquierda, centro, derecha o justificado. El justificado distribuye las palabras de las líneas completas; la última línea de cada párrafo queda a la izquierda.
- **Centrar en etiqueta** centra el cuadro completo horizontal y verticalmente.

Los controles principales de texto están en una barra sobre el lienzo: A−, tamaño en puntos (pt), A+, negrita e iconos de alineación con el botón central claramente marcado. Al aumentar la fuente, el cuadro crece en altura para mostrar las nuevas líneas.

## Impresión y papel

El botón Imprimir y Ctrl/⌘+P abren la configuración de papel. La impresión usa un documento independiente que contiene únicamente los SVG de las etiquetas: sin cuadrícula, reglas, selección, tiradores ni controles del editor. El menú de impresión del navegador también prepara la misma salida mediante `beforeprint`.

- **Etiqueta / rollo**: una etiqueta por página, con las dimensiones exactas del diseño.
- **A4 o carta**: etiquetas a tamaño real en una cuadrícula, con 10 mm de margen y 3 mm entre etiquetas. La orientación cambia si es necesario para que la etiqueta quepa; no se reduce la escala. No es una plantilla para hojas adhesivas precortadas.
- En el diálogo del sistema, seleccionar el papel correspondiente, escala 100%, márgenes ninguno y desactivar encabezados y pies. La aplicación no puede modificar estos ajustes del controlador. Para PDF, elegir Guardar como PDF.
- La vista previa de la aplicación es de la etiqueta; la vista del sistema muestra su distribución en la hoja.

## Orientación de la etiqueta

En Configuración → Etiqueta, los botones **Horizontal** y **Vertical** intercambian ancho y alto. Por defecto **Girar también el diseño** rota todo el contenido 90° al pasar a vertical y lo gira de vuelta al volver a horizontal, manteniendo tamaños y posiciones relativas. Desmarca esa opción para cambiar solo el formato del lienzo y redistribuir el contenido manualmente. En etiquetas cuadradas los botones están desactivados. El cambio se puede deshacer y se conserva al guardar; SVG e impresión usan las nuevas dimensiones.
