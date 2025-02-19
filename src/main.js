import './style.css'
import Stats from 'stats.js'
import GUI from 'lil-gui';

const stats = new Stats()
stats.showPanel(0)
document.body.appendChild(stats.dom)

const canvas = document.createElement("canvas");
document.body.appendChild(canvas);
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const config = {
    radius: 120,
    variation: 40,
    segments: 6,
    color1: '#FE5F38',
    color2: '#6144E3',
    offset: 100, // Décalage entre les deux blobs
    animate: true,
    animationSpeed: 1,
    animationAmount: 30,
    blur: true,
    blurAmount: 120,
    grain: true,
    grainAnimate: true,
    grainOpacity: 0.2,
    grainHardness: 1,
    grainSize: 1,
    grainColor: '#ffffff',
};

// Canvas temporaire pour le grain
const grainCanvas = document.createElement('canvas');
const grainCtx = grainCanvas.getContext('2d');

// Taille fixe du motif de grain
const GRAIN_PATTERN_SIZE = 128;
grainCanvas.width = GRAIN_PATTERN_SIZE;
grainCanvas.height = GRAIN_PATTERN_SIZE;

function hexToRgb(hex) {
    // Supprime le caractère '#' si présent
    hex = hex.replace(/^#/, '');

    // Convertit les valeurs hexadécimales en entiers
    let bigint = parseInt(hex, 16);
    let r = (bigint >> 16) & 255;
    let g = (bigint >> 8) & 255;
    let b = bigint & 255;

    return [r, g, b];
}

function getGrainPixelAlpha(hardness) {
    // On génère un nombre aléatoire unique
    const r = Math.random();
    // On interpole entre la valeur continue (r * 255) et la valeur binaire (Math.round(r) * 255)
    return (1 - hardness) * (r * 255) + hardness * (Math.round(r) * 255);
}

function updateGrainCanvas() {
    const imageData = grainCtx.createImageData(GRAIN_PATTERN_SIZE, GRAIN_PATTERN_SIZE);
    const data = imageData.data;

    const color = hexToRgb(config.grainColor);

    for (let i = 0; i < data.length; i += 4) {
        data[i] = color[0];     // Rouge
        data[i + 1] = color[1]; // Vert
        data[i + 2] = color[2]; // Bleu
        data[i + 3] = getGrainPixelAlpha(config.grainHardness);   // Alpha aléatoire
    }

    grainCtx.putImageData(imageData, 0, 0);

    // Désactiver le lissage pour avoir des pixels nets
    grainCtx.imageSmoothingEnabled = false;
}

class Blob {
    constructor(timeOffset = 0) {
        this.baseVariations = [];
        this.angleOffsets = [];
        this.radiusOffsets = [];
        this.timeOffset = timeOffset;
        this.initOffsets(config.segments);
    }

    initOffsets(segments) {
        this.baseVariations = Array(segments).fill(0).map(() => Math.random() * 2 - 1);
        this.angleOffsets = Array(segments).fill(0).map(() => Math.random() * Math.PI * 2);
        this.radiusOffsets = Array(segments).fill(0).map(() => Math.random() * Math.PI * 2);
    }

    generatePoints(radius, variation, segments, time, xOffset = 0, yOffset = 0) {
        if (this.baseVariations.length !== segments) {
            this.initOffsets(segments);
        }

        time += this.timeOffset; // Applique le décalage temporel

        let points = [];
        for (let i = 0; i < segments; i++) {
            const angleFreq = 1 + i * 0.05;
            const radiusFreq = 1.5 + i * 0.05;

            const angleVariation = Math.sin(time * 0.001 * config.animationSpeed + this.angleOffsets[i]) * 0.02;
            const radiusVariation = this.baseVariations[i] * variation +
                Math.sin(time * 0.001 * config.animationSpeed + this.radiusOffsets[i]) * config.animationAmount;

            let angle = (i / segments) * Math.PI * 2 + angleVariation;
            let currentRadius = radius + radiusVariation;

            let x = canvas.width / 2 + Math.cos(angle) * currentRadius + xOffset;
            let y = canvas.height / 2 + Math.sin(angle) * currentRadius + yOffset;
            points.push({ x, y });
        }
        return points;
    }

    draw(time, color, xOffset = 0, yOffset = 0) {
        let points = this.generatePoints(config.radius, config.variation, config.segments, time, xOffset, yOffset);

        ctx.beginPath();

        let controlPoints = [];
        for (let i = 0; i < points.length; i++) {
            let curr = points[i];
            let next = points[(i + 1) % points.length];
            let prev = points[(i - 1 + points.length) % points.length];

            let dx = next.x - prev.x;
            let dy = next.y - prev.y;

            let tension = 0.33;

            controlPoints.push({
                cp1x: curr.x - dx * tension,
                cp1y: curr.y - dy * tension,
                cp2x: curr.x + dx * tension,
                cp2y: curr.y + dy * tension
            });
        }

        ctx.moveTo(points[0].x, points[0].y);

        for (let i = 0; i < points.length; i++) {
            let curr = points[i];
            let next = points[(i + 1) % points.length];
            let currControl = controlPoints[i];
            let nextControl = controlPoints[(i + 1) % points.length];

            ctx.bezierCurveTo(
                currControl.cp2x, currControl.cp2y,
                nextControl.cp1x, nextControl.cp1y,
                next.x, next.y
            );
        }

        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
    }
}

// Créer deux instances de Blob avec un décalage temporel différent
const blob1 = new Blob(0);
const blob2 = new Blob(1000); // Décalage temporel de 1000ms

function drawScene(time) {

    if(config.grainAnimate) updateGrainCanvas()

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if(config.blur) ctx.filter = `blur(${config.blurAmount}px)`

    // Dessiner le blob du fond
    blob2.draw(time, config.color2, config.offset, config.offset);
    // Dessiner le blob du dessus
    blob1.draw(time, config.color1);

    ctx.filter = 'none'

    if(config.grain) {
        // Désactiver le lissage pour le grain
        ctx.imageSmoothingEnabled = false;

        // Application du grain blanc simple en le répétant
        ctx.globalAlpha = config.grainOpacity;
        const scaledSize = GRAIN_PATTERN_SIZE * config.grainSize;
        for(let x = 0; x < canvas.width; x += scaledSize) {
            for(let y = 0; y < canvas.height; y += scaledSize) {
                ctx.drawImage(grainCanvas, x, y, scaledSize, scaledSize);
            }
        }
        ctx.globalAlpha = 1;

        // Réactiver le lissage pour le reste
        ctx.imageSmoothingEnabled = true;
    }
}

const gui = new GUI();
const blobFolder = gui.addFolder('Blob Shape');
blobFolder.add(config, 'radius', 20, 200);
blobFolder.add(config, 'variation', 0, 100);
blobFolder.add(config, 'segments', 3, 20, 1);
blobFolder.add(config, 'offset', 0, 400);

const colorFolder = gui.addFolder('Colors');
colorFolder.addColor(config, 'color1').name('Front Color');
colorFolder.addColor(config, 'color2').name('Back Color');

const effectsFolder = gui.addFolder('Effects');
effectsFolder.add(config, 'blur');
effectsFolder.add(config, 'blurAmount', 0, 500);
effectsFolder.add(config, 'grain');
effectsFolder.add(config, 'grainAnimate');
effectsFolder.add(config, 'grainOpacity', 0, 1);
effectsFolder.add(config, 'grainHardness', 0, 1).onChange(updateGrainCanvas);
effectsFolder.add(config, 'grainSize', 1, 8, 0.1).onChange(updateGrainCanvas);
effectsFolder.addColor(config, 'grainColor').onChange(updateGrainCanvas);


const animationFolder = gui.addFolder('Animation');
animationFolder.add(config, 'animate' +
    '');
animationFolder.add(config, 'animationSpeed', 0.1, 5);
animationFolder.add(config, 'animationAmount', 0, 50);

function animate(time) {
    stats.begin()
    if (config.animate) drawScene(time);
    stats.end()
    requestAnimationFrame(animate);
}

animate(0);

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});
