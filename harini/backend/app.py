from flask import Flask, jsonify, request, send_from_directory
from threading import Thread, Event
import time
import random
import os

app = Flask(__name__, static_folder='../frontend', static_url_path='')

# Simulation state
vehicle_state = {
    "position": [0, 0],
    "velocity": [0, 0],
    "obstacle_detected": False,
    "status": "stopped",
    "lane": 1  # 1 for upper road, 2 for lower road
}

stop_event = Event()

def simulate_vehicle():
    while not stop_event.is_set():
        if vehicle_state["status"] == "running":
            vehicle_state["velocity"][0] = 1.0
            if vehicle_state["obstacle_detected"]:
                vehicle_state["lane"] = 2 if vehicle_state["lane"] == 1 else 1
            vehicle_state["position"][0] += vehicle_state["velocity"][0]
            vehicle_state["position"][1] = 0
            vehicle_state["obstacle_detected"] = random.choice([False, False, False, True])
        else:
            vehicle_state["velocity"] = [0, 0]
            vehicle_state["obstacle_detected"] = False
        time.sleep(1)

simulation_thread = Thread(target=simulate_vehicle)
simulation_thread.daemon = True
simulation_thread.start()

import atexit

def shutdown_simulation():
    stop_event.set()
    simulation_thread.join()

atexit.register(shutdown_simulation)

@app.route('/api/status', methods=['GET'])
def get_status():
    return jsonify(vehicle_state)

@app.route('/api/control', methods=['POST'])
def control_vehicle():
    data = request.json
    command = data.get("command", "").lower()
    if command == "start":
        vehicle_state["status"] = "running"
    elif command == "stop":
        vehicle_state["status"] = "stopped"
    else:
        return jsonify({"error": "Invalid command"}), 400
    return jsonify({"status": vehicle_state["status"]})

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(debug=True)
