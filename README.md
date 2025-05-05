# 00 Academy

## Description
Este proyecto es una aplicación interactiva que utiliza Three.js para renderizar gráficos 3D en el navegador. Permite la detección de manos y rostros utilizando la biblioteca MediaPipe, creando una experiencia inmersiva.

## Estructura del Proyecto
El proyecto tiene la siguiente estructura de archivos:

```
test
├── public
│   ├── app.js          # Código JavaScript principal de la aplicación.
│   └── index.html      # Página HTML principal que carga la aplicación.
├── src
│   └── main.js         # Punto de entrada de la aplicación, donde se modulariza el código.
├── package.json         # Configuración de npm, incluyendo dependencias y scripts.
├── vite.config.js       # Configuración para Vite, define opciones de construcción y desarrollo.
└── README.md            # Documentación del proyecto.
```

## Instalación
Para instalar las dependencias del proyecto, ejecuta el siguiente comando en la raíz del proyecto:

```
npm install
```

## Ejecución
Para iniciar el servidor de desarrollo, utiliza el siguiente comando:

```
npm run dev
```

Esto abrirá la aplicación en tu navegador predeterminado.

## Construcción
Para construir la aplicación para producción, ejecuta:

```
npm run build
```

Los archivos de salida se generarán en la carpeta `dist`.

## Contribuciones
Las contribuciones son bienvenidas. Si deseas contribuir, por favor abre un issue o un pull request.

## Licencia
Este proyecto está bajo la Licencia MIT.