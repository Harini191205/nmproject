const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const vehicleStatus = document.getElementById('vehicleStatus');
const vehiclePosition = document.getElementById('vehiclePosition');
const vehicleVelocity = document.getElementById('vehicleVelocity');
const obstacleDetected = document.getElementById('obstacleDetected');
const canvas = document.getElementById('vehicleCanvas');
const ctx = canvas.getContext('2d');

let simulationInterval = null;
let alertAudio = null;
let alertPlaying = false;

function loadAlertSound() {
    alertAudio = new Audio('https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg');
}

function playAlertSound() {
    if (alertAudio && !alertPlaying) {
        alertPlaying = true;
        alertAudio.play();
        alertAudio.onended = () => {
            alertPlaying = false;
        };
    }
}

function setButtonStates(isRunning) {
    startBtn.disabled = isRunning;
    stopBtn.disabled = !isRunning;
}

function fetchStatus() {
    fetch('/api/status')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            vehicleStatus.textContent = data.status;
            vehiclePosition.textContent = `[${data.position[0].toFixed(2)}, ${data.position[1].toFixed(2)}]`;
            vehicleVelocity.textContent = `[${data.velocity[0].toFixed(2)}, ${data.velocity[1].toFixed(2)}]`;
            obstacleDetected.textContent = data.obstacle_detected;

            setButtonStates(data.status === 'running');
            drawScene(data.position, data.obstacle_detected, data.lane);
        })
        .catch(err => {
            console.error('Error fetching status:', err);
            alert('Error fetching vehicle status. Please try again later.');
        });
}

function drawRoad(yOffset) {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, yOffset - 50, canvas.width, 100);

    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.setLineDash([20, 15]);
    ctx.beginPath();
    ctx.moveTo(0, yOffset);
    ctx.lineTo(canvas.width, yOffset);
    ctx.stroke();
    ctx.setLineDash([]);
}

function drawTree(x, y) {
    ctx.fillStyle = 'brown';
    ctx.fillRect(x - 5, y, 10, 20);
    ctx.fillStyle = 'green';
    ctx.beginPath();
    ctx.moveTo(x, y - 30);
    ctx.lineTo(x - 20, y);
    ctx.lineTo(x + 20, y);
    ctx.closePath();
    ctx.fill();
}

function drawVehicleShape(x, y, type) {
    switch(type) {
        case 'car':
            ctx.fillStyle = 'blue';
            ctx.fillRect(x - 15, y - 10, 30, 20);
            break;
        case 'lorry':
            ctx.fillStyle = 'orange';
            ctx.fillRect(x - 20, y - 12, 40, 24);
            break;
        case 'bike':
            ctx.fillStyle = 'purple';
            ctx.beginPath();
            ctx.arc(x, y, 10, 0, 2 * Math.PI);
            ctx.fill();
            break;
        default:
            ctx.fillStyle = 'gray';
            ctx.fillRect(x - 15, y - 10, 30, 20);
    }
}

function drawVehicleWheels(x, y, type) {
    ctx.fillStyle = 'black';
    switch(type) {
        case 'car':
            ctx.fillRect(x - 12, y - 12, 8, 4);
            ctx.fillRect(x + 4, y - 12, 8, 4);
            ctx.fillRect(x - 12, y + 8, 8, 4);
            ctx.fillRect(x + 4, y + 8, 8, 4);
            break;
        case 'lorry':
            ctx.fillRect(x - 18, y - 14, 10, 6);
            ctx.fillRect(x + 8, y - 14, 10, 6);
            ctx.fillRect(x - 18, y + 8, 10, 6);
            ctx.fillRect(x + 8, y + 8, 10, 6);
            break;
        case 'bike':
            ctx.beginPath();
            ctx.arc(x - 7, y + 10, 4, 0, 2 * Math.PI);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x + 7, y + 10, 4, 0, 2 * Math.PI);
            ctx.fill();
            break;
        default:
            ctx.fillRect(x - 12, y - 12, 8, 4);
            ctx.fillRect(x + 4, y - 12, 8, 4);
            ctx.fillRect(x - 12, y + 8, 8, 4);
            ctx.fillRect(x + 4, y + 8, 8, 4);
    }
}

function drawVehicle(position, laneOffsetX, laneOffsetY, type='car') {
    const maxX = canvas.width - 15;
    const minX = 15;
    const maxY = laneOffsetY + 40;
    const minY = laneOffsetY - 40;

    let x = canvas.width / 2 + position[0] * 10 + laneOffsetX;
    let y = laneOffsetY - position[1] * 10;

    x = Math.min(Math.max(x, minX), maxX);
    y = Math.min(Math.max(y, minY), maxY);

    drawVehicleShape(x, y, type);
    drawVehicleWheels(x, y, type);
}

function drawObstacle(position, laneOffsetX, laneOffsetY) {
    const x = canvas.width / 2 + position[0] * 10 + laneOffsetX;
    const y = laneOffsetY - position[1] * 10;

    ctx.fillStyle = 'red';
    ctx.fillRect(x - 15, y - 10, 30, 20);

    ctx.fillStyle = 'black';
    ctx.fillRect(x - 12, y - 12, 8, 4);
    ctx.fillRect(x + 4, y - 12, 8, 4);
    ctx.fillRect(x - 12, y + 8, 8, 4);
    ctx.fillRect(x + 4, y + 8, 8, 4);
}

function drawScene(position, obstacle, lane) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const road1Y = canvas.height / 2 - 60;
    const road2Y = canvas.height / 2 + 60;
    drawRoad(road1Y);
    drawRoad(road2Y);

    for (let x = 30; x < canvas.width; x += 100) {
        drawTree(x, road1Y - 60);
        drawTree(x, road1Y + 60);
        drawTree(x, road2Y - 60);
        drawTree(x, road2Y + 60);
    }

    const extraVehicles = [
        {pos: [1, 0], laneY: road1Y, type: 'lorry'},
        {pos: [-2, 0], laneY: road1Y, type: 'bike'},
        {pos: [3, 0], laneY: road2Y, type: 'lorry'},
        {pos: [-1, 0], laneY: road2Y, type: 'bike'}
    ];
    extraVehicles.forEach(v => {
        drawVehicle(v.pos, 0, v.laneY, v.type);
    });

    const mainLaneY = lane === 1 ? road1Y : road2Y;
    if (obstacle) {
        playAlertSound();
        drawVehicle(position, 0, mainLaneY, 'car');
        drawObstacle(position, 0, lane === 1 ? road2Y : road1Y);
    } else {
        drawVehicle(position, 0, mainLaneY, 'car');
    }
}

function sendCommand(command) {
    fetch('/api/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Command response:', data);
        fetchStatus();
    })
    .catch(err => {
        console.error('Error sending command:', err);
    });
}

startBtn.addEventListener('click', () => {
    sendCommand('start');
    if (!simulationInterval) {
        simulationInterval = setInterval(fetchStatus, 1000);
    }
});

stopBtn.addEventListener('click', () => {
    sendCommand('stop');
    if (simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = null;
    }
});

window.onload = () => {
    loadAlertSound();
    fetchStatus();
};
