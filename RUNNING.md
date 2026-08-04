# Ejecutar la aplicación (Frontend + Backend)

Este archivo describe los pasos exactos y los comandos utilizados para ejecutar localmente el monorepo **AplicativoPedidosGas** en Windows.

IMPORTANTE: No incluyas secretos en tu repositorio. En este documento se usan `PLACEHOLDER` donde corresponde la cadena de conexión a la base de datos.

## Requisitos
- Node 18+ (recomendado)
- pnpm instalado globalmente (`npm install -g pnpm`)
- (Opcional) Docker si quieres levantar una base de datos local

## Resumen de lo que se hizo

- Instalé dependencias del monorepo con `pnpm install`.
- Solucioné bindings nativos faltantes instalando estos paquetes en la raíz del workspace (devDependencies):
  - `@rollup/rollup-win32-x64-msvc`
  - `lightningcss-win32-x64-msvc`
  - `@tailwindcss/oxide-win32-x64-msvc`
- En un paso se eliminó `node_modules` y se usó `npm install` para forzar la resolución de algunas optional native deps en Windows.
- El frontend (Vite) se ejecuta en `http://localhost:5173/`.
- El backend (Express) se ejecuta en `http://localhost:3000/` y expone rutas bajo el prefijo `/api`.

## Comandos reproducibles (PowerShell)

1) Instalar dependencias del monorepo

```powershell
pnpm install
```

2) Si encuentras errores por bindings nativos (Windows), limpiar e intentar reinstalar:

```powershell
# Opcional: limpiar instalación si hay errores
Remove-Item -Recurse -Force .\node_modules
Remove-Item -Force .\package-lock.json
pnpm install
```

3) Añadir binarios nativos (ejecutar en la raíz del proyecto)

```powershell
# Añadir al workspace root (devDeps)
pnpm add -Dw @rollup/rollup-win32-x64-msvc -w
pnpm add -Dw lightningcss-win32-x64-msvc -w
pnpm add -Dw @tailwindcss/oxide-win32-x64-msvc -w
```

4) (Si aún falla) Reinstalar con `npm` para que npm descargue las optional native artifacts

```powershell
Remove-Item -Recurse -Force .\node_modules
npm install
```

5) Arrancar el backend (build + start)

> Sustituye `MYSQL_URL` por la cadena de conexión correcta (no la incluyas en el repo).

```powershell
$env:NODE_ENV='development'
$env:MYSQL_URL='mysql://USER:PASS@HOST:PORT/DBNAME'  # reemplazar
pnpm --filter @workspace/api-server run build
$env:PORT='3000'
pnpm --filter @workspace/api-server run start
```

6) Arrancar el frontend (Vite) y apuntarlo al backend local

```powershell
#$env:API_URL indica a Vite a dónde proxyear /api
$env:API_URL='http://localhost:3000'
pnpm dev
```

## Endpoints útiles

- Salud: `GET http://localhost:3000/api/healthz`
- Lista clientes: `GET http://localhost:3000/api/customers`
- Crear pedido: `POST http://localhost:3000/api/orders`

## Notas y recomendaciones
- Los errores 500 que aparecían en Windows se debían a módulos nativos faltantes. En muchos casos añadir la variante `-win32-x64-msvc` solucionó el problema.
- Alternativa recomendada: usar WSL2 o Docker (Linux) para evitar problemas con bindings nativos en Windows.
- Si compartes la aplicación o la ejecutas en CI, evita incluir binarios nativos en el control de versiones; documenta la plataforma objetivo en la guía de contribución.

---

Archivo creado automáticamente por soporte para ejecutar localmente. Guarda este fichero y reemplaza `MYSQL_URL` por la URL real cuando ejecutes en tu máquina.
