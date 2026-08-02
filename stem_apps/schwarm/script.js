const canvas = document.getElementById('swarmCanvas');
const ctx = canvas.getContext('2d');

const individuals = [];
let numIndividuals = 100;
let individualSize = 5;
let speed = 2;
let attractionStrength = 0.1;

document.getElementById('numIndividuals').addEventListener('input', (event) => {
    numIndividuals = parseInt(event.target.value);
    resetSimulation();
});

document.getElementById('individualSize').addEventListener('input', (event) => {
    individualSize = parseInt(event.target.value);
    resetSimulation();
});

document.getElementById('speed').addEventListener('input', (event) => {
    speed = parseInt(event.target.value);
    resetSimulation();
});

document.getElementById('attractionStrength').addEventListener('input', (event) => {
    attractionStrength = parseFloat(event.target.value);
    resetSimulation();
});

function resetSimulation() {
    individuals.length = 0;
    init();
}

class Individual {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * speed;
        this.vy = (Math.random() - 0.5) * speed;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off the walls
if (this.x <= 0 || this.x >= canvas.width) this.vx = -this.vx;
if (this.y <= 0 || this.y >= canvas.height) this.vy = -this.vy;

// Simple rule: individuals attract each other
individuals.forEach(other => {
    if (other !== this) {
        const dx = other.x - this.x;
        const dy = other.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 100) {
            this.vx += dx / distance * attractionStrength;
            this.vy += dy / distance * attractionStrength;
        }
    }
});
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, individualSize, 0, Math.PI * 2);
        ctx.fillStyle = 'blue';
        ctx.fill();
        ctx.closePath();
    }
}

function init() {
    for (let i = 0; i < numIndividuals; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        individuals.push(new Individual(x, y));
    }
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    individuals.forEach(individual => {
        individual.update();
        individual.draw();
    });

    requestAnimationFrame(animate);
}

init();
animate();
