# Snake Test

Proyecto sencillo de Snake hecho con Vue 3 y Vite. El juego se renderiza en un `canvas` y permite mover la serpiente con las flechas del teclado para comer animalitos, sumar puntos y evitar chocar con las paredes o con su propio cuerpo.

## Que tiene implementado

- Interfaz hecha con Vue 3.
- Tablero renderizado con `canvas`.
- Movimiento de la serpiente con flechas del teclado.
- Sistema de puntaje.
- Guardado local del mejor puntaje.
- Aumento progresivo de velocidad cada 5 puntos.
- Opcion para pausar y reanudar la partida.
- Deteccion de colisiones con bordes y cuerpo.
- Comida aleatoria con emojis de animalitos.
- Reinicio de partida desde un boton.
- Estados visuales de espera, jugando y game over.
- Sonidos simples al comer y al perder.
- Diseno responsive para escritorio y movil.

## Scripts

- `npm run dev`: inicia el proyecto en desarrollo.
- `npm run build`: genera la version de produccion.
- `npm run preview`: abre la vista previa del build.

## Despliegue en GitHub Pages

El proyecto esta configurado para publicarse en GitHub Pages desde la rama `main` usando GitHub Actions.

Pasos:

- En GitHub, abre `Settings > Pages`.
- En `Source`, selecciona `GitHub Actions`.
- Haz push a la rama `main`.
- GitHub ejecutara el workflow y publicara la carpeta `dist`.
