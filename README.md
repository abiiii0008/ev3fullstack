
# Mi Tienda React - Entrega Parcial

Este proyecto es una migración del template HTML original a React. Incluye:
- Componentes React para Header/Footer
- Páginas: Home, Nosotros, Contacto, Productos, Carrito, Checkout, Admin, Ofertas
- Archivo de datos local con CRUD (src/data/data.js) usando localStorage
- Pruebas unitarias con Jasmine + Karma (src/tests)
- Documentos ERS y cobertura de testing (en /docs)

## Requisitos para ejecutar (en tu máquina)
1. Tener Node.js y npm instalados.
2. En la carpeta del proyecto ejecutar:
   ```
   npm install
   npm run start
   ```
   Esto lanzará el dev server en http://localhost:3000

3. Para ejecutar pruebas:
   ```
   npm run test
   ```

> Nota: Karma lanzará ChromeHeadless; asegúrate de tener Chrome instalado localmente.
