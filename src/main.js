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
    radius: 100,
    variation: 40,
    segments: 8,
    color1: '#FE5F38',
    color2: '#6144E3',
    offset: 100, // Décalage entre les deux blobs
    animationSpeed: 1,
    animationAmount: 30,
    blur: true,
    blurAmount: 120,
    grain: true,
    grainAmount: 0.5,
    grainSize: 1,
    pause: false
};

// Canvas temporaire pour le grain
const grainCanvas = document.createElement('canvas');
const grainCtx = grainCanvas.getContext('2d');

function updateGrainCanvas() {
    grainCanvas.width = window.innerWidth / config.grainSize;
    grainCanvas.height = window.innerHeight / config.grainSize;
    const imageData = grainCtx.createImageData(grainCanvas.width, grainCanvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        // Point blanc avec opacité aléatoire
        data[i] = 255;     // Rouge
        data[i + 1] = 255; // Vert
        data[i + 2] = 255; // Bleu
        data[i + 3] = Math.random() * 255;   // Alpha aléatoire
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

    updateGrainCanvas()

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if(config.blur) ctx.filter = `blur(${config.blurAmount}px)`

    // Dessiner le blob du fond
    blob2.draw(time, config.color2, config.offset, config.offset);
    // Dessiner le blob du dessus
    blob1.draw(time, config.color1);

    ctx.filter = 'none'

    // Application du grain blanc simple
    ctx.globalAlpha = config.grainAmount;
    ctx.drawImage(grainCanvas, 0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
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
effectsFolder.add(config, 'grainAmount', 0, 1);
effectsFolder.add(config, 'grainSize', 1, 8, 0.1);


const animationFolder = gui.addFolder('Animation');
animationFolder.add(config, 'animationSpeed', 0.1, 5);
animationFolder.add(config, 'animationAmount', 0, 50);
animationFolder.add(config, 'pause');

function animate(time) {
    stats.begin()
    if (!config.pause) {
        drawScene(time);
    }
    stats.end()
    requestAnimationFrame(animate);
}

animate(0);

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});
